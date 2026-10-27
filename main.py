"""Koz backend'i: arıza açıklamasını (ve isteğe bağlı fotoğrafı) alıp Claude ile analiz eder.
Arıza raporundaki parça ve alet fiyatını malzeme_fiyatlari.json'dan hesaplar.
Yeni işlem bölümünde kullanıcının yaptırmak istediği işi anlatır, fiyatı fiyatlar.json'dan hesaplar.

Çalıştırma:
    uvicorn main:app --reload
Arayüz:
    http://127.0.0.1:8000
Deneme sayfası:
    http://127.0.0.1:8000/docs

Soru turu: Model soru sorarsa (needs_more_info: true) istemci aynı açıklama ve fotoğrafı,
modelin sorularını (sorular) ve kullanıcının cevaplarını (cevaplar) aynı sırayla tekrar gönderir.
Bu ikinci istekte model soru sormaz, analizi yapar. /yeni-islem de aynı soru turunu kullanır.

Her başarılı analiz MSSQL'deki Analizler tablosuna kaydedilir (bkz. veritabani.sql).
"""

import base64
import json
import os
from pathlib import Path
from typing import Literal

import anthropic
import pyodbc
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict, Field, ValidationError

MODEL = "claude-sonnet-5-5"
PROMPT_DOSYASI = Path(__file__).parent / "ariza_prompt.md"
YENI_PROMPT_DOSYASI = Path(__file__).parent / "yeni_islem_prompt.md"
FIYAT_DOSYASI = Path(__file__).parent / "fiyatlar.json"
MALZEME_FIYAT_DOSYASI = Path(__file__).parent / "malzeme_fiyatlari.json"
ARAYUZ_DOSYASI = Path(__file__).parent / "static" / "index.html"
FOTO_TURLERI = {"image/jpeg", "image/png", "image/webp"}
MAKS_FOTO_BOYUTU = 5 * 1024 * 1024

load_dotenv(Path(__file__).parent / ".env")
if not os.environ.get("ANTHROPIC_API_KEY"):
    raise RuntimeError("API anahtarı bulunamadı. .env dosyasında ANTHROPIC_API_KEY=... satırı olmalı.")
DB_BAGLANTI = os.environ.get("DB_BAGLANTI")
if not DB_BAGLANTI:
    raise RuntimeError("Veritabanı bağlantısı bulunamadı. .env dosyasında DB_BAGLANTI=... satırı olmalı.")

MALZEME_FIYATLARI = json.loads(MALZEME_FIYAT_DOSYASI.read_text(encoding="utf-8"))
# Model price_key olarak sadece tablodaki anahtarları kullanabilsin diye anahtarlar prompt'un sonuna eklenir
MALZEME_ANAHTARLARI = "\n".join(
    f"- `{k}`: {v['ad']}" for k, v in MALZEME_FIYATLARI.items() if not k.startswith("_")
)
SYSTEM_PROMPT = (
    PROMPT_DOSYASI.read_text(encoding="utf-8")
    + "\n\n## Fiyat tablosu anahtarları (`price_key` için)\n\n" + MALZEME_ANAHTARLARI
)
YENI_SYSTEM_PROMPT = YENI_PROMPT_DOSYASI.read_text(encoding="utf-8")
FIYATLAR = json.loads(FIYAT_DOSYASI.read_text(encoding="utf-8"))
client = anthropic.Anthropic()  # ANTHROPIC_API_KEY ortam değişkeninden okunur
app = FastAPI(title="Koz")


class Malzeme(BaseModel):
    model_config = ConfigDict(extra="forbid")

    item: str
    price_key: str | None
    quantity: int = Field(ge=1)


class MaliyetKalemi(BaseModel):
    item: str
    quantity: int
    kind: Literal["parca", "alet"]
    min: int
    max: int


class ArizaMaliyeti(BaseModel):
    """Backend'in malzeme fiyat tablosundan hesapladığı maliyet. Model bu alanı doldurmaz."""

    lines: list[MaliyetKalemi]
    parts_min: int
    parts_max: int
    tools_min: int
    tools_max: int
    unpriced: list[str]
    note: str
    price_date: str


class ArizaRaporu(BaseModel):
    """CLAUDE.md'deki çıktı şeması. Bu şemaya uymayan cevap kullanıcıya gösterilmez."""

    model_config = ConfigDict(extra="forbid")

    category: Literal["su_tesisati", "nem_kuf", "beyaz_esya", "elektrik", "gaz", "kapsam_disi"] | None
    emergency: bool
    needs_more_info: bool
    questions: list[str] = Field(max_length=3)
    problem: str | None
    possible_causes: list[str]
    confidence: Literal["dusuk", "orta", "yuksek"] | None
    risk_level: Literal["dusuk", "orta", "acil"] | None
    difficulty: int | None = Field(ge=0, le=100)
    parts_and_tools: list[Malzeme]
    steps: list[str]
    estimated_cost: ArizaMaliyeti | None
    recommendation: Literal["kendin_yap", "usta_onerilir", "usta_gerekli", "acil_profesyonel"] | None
    safety_warning: str | None


class Miktar(BaseModel):
    model_config = ConfigDict(extra="forbid")

    value: float | None = Field(gt=0)
    unit: Literal["m2", "adet"] | None


class MalzemeSecenegi(BaseModel):
    model_config = ConfigDict(extra="forbid")

    option: str
    notes: str


class Maliyet(BaseModel):
    """Backend'in fiyat tablosundan hesapladığı maliyet. Model bu alanı doldurmaz."""

    min: int
    max: int
    unit_price: list[int]
    unit: str
    price_basis: Literal["sadece_iscilik", "malzeme_dahil"]
    note: str
    price_date: str


class YeniIslemRaporu(BaseModel):
    """yeni_islem_prompt.md'deki çıktı şeması. cost alanını backend doldurur."""

    model_config = ConfigDict(extra="forbid")

    job_type: Literal[
        "boya", "laminat_parke", "fayans", "mantolama", "cam_balkon", "pvc_pencere", "diger", "ariza", "kapsam_disi"
    ] | None
    in_price_table: bool
    needs_more_info: bool
    questions: list[str] = Field(max_length=3)
    scope: str | None
    quantity: Miktar
    price_basis: Literal["sadece_iscilik", "malzeme_dahil"] | None
    material_options: list[MalzemeSecenegi]
    technical_details: list[str]
    work_steps: list[str]
    questions_for_contractor: list[str]
    red_flags: list[str]
    duration: str | None
    cost: Maliyet | None
    assumptions: list[str]
    safety_warning: str | None


def maliyet_hesapla(rapor: YeniIslemRaporu) -> Maliyet | None:
    """Fiyatı model değil tablo belirler. İş tabloda yoksa ya da miktar belli değilse maliyet boş kalır."""
    fiyat = FIYATLAR.get(rapor.job_type or "")
    miktar = rapor.quantity
    if fiyat is None or miktar.value is None or miktar.unit != fiyat["birim"]:
        return None
    temel = rapor.price_basis or "malzeme_dahil"
    not_ = fiyat["not"]
    if fiyat[temel] is None:
        # Bu işte sadece işçilik fiyatı yok (örn. pencere montajla birlikte satılır)
        temel = "malzeme_dahil"
        not_ = "Bu iş için sadece işçilik fiyatı yok, malzeme ve montaj dahil fiyat gösterildi. " + not_
    alt, ust = fiyat[temel]
    return Maliyet(
        # En yakın 100 TL'ye yuvarlanır
        min=int(round(alt * miktar.value, -2)),
        max=int(round(ust * miktar.value, -2)),
        unit_price=[alt, ust],
        unit=fiyat["birim"],
        price_basis=temel,
        note=not_,
        price_date=FIYATLAR["_tarih"],
    )


def ariza_maliyeti_hesapla(rapor: ArizaRaporu) -> ArizaMaliyeti | None:
    """Parça fiyatını model değil tablo belirler. Tabloda olmayan parçalar unpriced listesine girer."""
    if not rapor.parts_and_tools:
        return None
    kalemler, fiyatsiz = [], []
    for m in rapor.parts_and_tools:
        fiyat = MALZEME_FIYATLARI.get(m.price_key or "")
        if m.price_key is None or m.price_key.startswith("_") or fiyat is None:
            fiyatsiz.append(m.item)
            continue
        alt, ust = fiyat["fiyat"]
        kalemler.append(MaliyetKalemi(
            item=m.item, quantity=m.quantity, kind=fiyat["tur"], min=alt * m.quantity, max=ust * m.quantity,
        ))
    if not kalemler:
        return None
    parcalar = [k for k in kalemler if k.kind == "parca"]
    aletler = [k for k in kalemler if k.kind == "alet"]
    return ArizaMaliyeti(
        lines=kalemler,
        parts_min=sum(k.min for k in parcalar),
        parts_max=sum(k.max for k in parcalar),
        tools_min=sum(k.min for k in aletler),
        tools_max=sum(k.max for k in aletler),
        unpriced=fiyatsiz,
        note="Yaklaşık perakende fiyatlardır (İstanbul, KDV dahil). Aletler evde varsa ayrıca alınmaz.",
        price_date=MALZEME_FIYATLARI["_tarih"],
    )


def json_ayikla(metin: str) -> dict:
    temiz = metin.strip()
    # Model JSON'u ```json ... ``` içine koyarsa çıkar
    if temiz.startswith("```"):
        temiz = temiz.split("\n", 1)[1].rsplit("```", 1)[0]
    return json.loads(temiz)


def soru_turunu_ekle(aciklama: str, sorular: list[str], cevaplar: list[str], son_cumle: str) -> str:
    satirlar = [f"Soru: {s.strip()}\nCevap: {c.strip()}" for s, c in zip(sorular, cevaplar)]
    return (
        aciklama + "\n\nSorduğun sorular ve kullanıcının cevapları:\n" + "\n".join(satirlar)
        + "\n\nSoru turu tamamlandı. Tekrar soru sorma, " + son_cumle
    )


def claude_cevabi(
    aciklama: str, foto: bytes | None, foto_turu: str | None, system_prompt: str = SYSTEM_PROMPT
) -> str:
    icerik = aciklama
    if foto is not None:
        icerik = [
            {
                "type": "image",
                "source": {"type": "base64", "media_type": foto_turu, "data": base64.standard_b64encode(foto).decode()},
            },
            {"type": "text", "text": aciklama},
        ]
    response = client.beta.messages.create(
        model=MODEL,
        max_tokens=16000,
        system=system_prompt,
        messages=[{"role": "user", "content": icerik}],
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
    )
    if response.stop_reason == "refusal":
        raise HTTPException(502, "Model yanıt vermeyi reddetti.")
    return "".join(b.text for b in response.content if b.type == "text")


def kaydet(aciklama: str, foto_var: bool, sorular: list[str], cevaplar: list[str], rapor: ArizaRaporu) -> None:
    soru_cevaplar = None
    if sorular:
        soru_cevaplar = json.dumps(
            [{"soru": s, "cevap": c} for s, c in zip(sorular, cevaplar)], ensure_ascii=False
        )
    with pyodbc.connect(DB_BAGLANTI) as baglanti:
        baglanti.execute(
            "INSERT INTO Analizler (Aciklama, FotoVar, SoruCevaplar, Kategori, Acil, SoruSoruldu, Oneri, Zorluk, Rapor)"
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            aciklama, foto_var, soru_cevaplar, rapor.category, rapor.emergency, rapor.needs_more_info,
            rapor.recommendation, rapor.difficulty, rapor.model_dump_json(),
        )


@app.get("/", include_in_schema=False)
def ana_sayfa() -> FileResponse:
    return FileResponse(ARAYUZ_DOSYASI)


@app.post("/analiz", response_model=ArizaRaporu)
def analiz(
    aciklama: str = Form(""),
    foto: UploadFile | None = File(None),
    sorular: list[str] = Form([]),
    cevaplar: list[str] = Form([]),
) -> ArizaRaporu:
    aciklama = aciklama.strip()
    if len(sorular) != len(cevaplar):
        raise HTTPException(400, "Her sorunun bir cevabı olmalı.")
    if len(sorular) > 3:
        raise HTTPException(400, "En fazla 3 soru cevaplanabilir.")
    soru_turu_yapildi = bool(sorular)
    foto_verisi = None
    if foto is not None and foto.filename:
        if foto.content_type not in FOTO_TURLERI:
            raise HTTPException(400, "Fotoğraf jpg, png veya webp olmalı.")
        foto_verisi = foto.file.read()
        if len(foto_verisi) > MAKS_FOTO_BOYUTU:
            raise HTTPException(400, "Fotoğraf 5 MB'tan büyük olamaz.")
    if not aciklama and foto_verisi is None:
        raise HTTPException(400, "Arızayı yaz ya da fotoğraf ekle.")
    # Açıklama yazılmazsa sadece fotoğrafa bakılır
    aciklama = aciklama or "Fotoğraftaki arızayı analiz et."
    kullanici_aciklamasi = aciklama
    if soru_turu_yapildi:
        aciklama = soru_turunu_ekle(aciklama, sorular, cevaplar, "eldeki bilgiyle analizi yap.")

    try:
        metin = claude_cevabi(aciklama, foto_verisi, foto.content_type if foto_verisi else None)
    except anthropic.AuthenticationError:
        raise HTTPException(500, "API anahtarı geçersiz. .env dosyasını kontrol et.")
    except anthropic.APIError as e:
        raise HTTPException(502, f"Claude API hatası: {e}")

    try:
        rapor = ArizaRaporu.model_validate(json_ayikla(metin))
    except (json.JSONDecodeError, ValidationError):
        raise HTTPException(502, "Model şemaya uygun bir cevap döndürmedi.")
    # Prompt kuralı: en fazla bir soru turu
    if soru_turu_yapildi and rapor.needs_more_info:
        raise HTTPException(502, "Model soru turundan sonra tekrar soru sordu.")
    rapor.estimated_cost = ariza_maliyeti_hesapla(rapor)
    try:
        kaydet(kullanici_aciklamasi, foto_verisi is not None, sorular, cevaplar, rapor)
    except pyodbc.Error as e:
        # Kayıt başarısız olsa da kullanıcı raporunu alır
        print(f"!! Veritabanına kaydedilemedi: {e}")
    return rapor


@app.post("/yeni-islem", response_model=YeniIslemRaporu)
def yeni_islem(
    aciklama: str = Form(""),
    sorular: list[str] = Form([]),
    cevaplar: list[str] = Form([]),
) -> YeniIslemRaporu:
    aciklama = aciklama.strip()
    if not aciklama:
        raise HTTPException(400, "Yaptırmak istediğin işi yaz.")
    if len(sorular) != len(cevaplar):
        raise HTTPException(400, "Her sorunun bir cevabı olmalı.")
    if len(sorular) > 3:
        raise HTTPException(400, "En fazla 3 soru cevaplanabilir.")
    soru_turu_yapildi = bool(sorular)
    if soru_turu_yapildi:
        aciklama = soru_turunu_ekle(aciklama, sorular, cevaplar, "eldeki bilgiyle raporu çıkar.")

    try:
        metin = claude_cevabi(aciklama, None, None, YENI_SYSTEM_PROMPT)
    except anthropic.AuthenticationError:
        raise HTTPException(500, "API anahtarı geçersiz. .env dosyasını kontrol et.")
    except anthropic.APIError as e:
        raise HTTPException(502, f"Claude API hatası: {e}")

    try:
        veri = json_ayikla(metin)
        # Fiyatı model yazmaz; yazmışsa da yok sayılır, backend hesaplar
        if isinstance(veri, dict):
            veri["cost"] = None
        rapor = YeniIslemRaporu.model_validate(veri)
    except (json.JSONDecodeError, ValidationError):
        raise HTTPException(502, "Model şemaya uygun bir cevap döndürmedi.")
    if soru_turu_yapildi and rapor.needs_more_info:
        raise HTTPException(502, "Model soru turundan sonra tekrar soru sordu.")
    # in_price_table modele bırakılmaz, tablodan belirlenir
    rapor.in_price_table = rapor.job_type in FIYATLAR
    rapor.cost = maliyet_hesapla(rapor)
    return rapor
