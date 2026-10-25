"""Çöz backend'i: arıza açıklamasını (ve isteğe bağlı fotoğrafı) alıp Claude ile analiz eder.

Çalıştırma:
    uvicorn main:app --reload
Deneme sayfası:
    http://127.0.0.1:8000/docs

Soru turu: Model soru sorarsa (needs_more_info: true) istemci aynı açıklama ve fotoğrafı,
modelin sorularını (sorular) ve kullanıcının cevaplarını (cevaplar) aynı sırayla tekrar gönderir.
Bu ikinci istekte model soru sormaz, analizi yapar.

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
from pydantic import BaseModel, ConfigDict, Field, ValidationError

MODEL = "claude-sonnet-5-5"
PROMPT_DOSYASI = Path(__file__).parent / "ariza_prompt.md"
FOTO_TURLERI = {"image/jpeg", "image/png", "image/webp"}
MAKS_FOTO_BOYUTU = 5 * 1024 * 1024

load_dotenv(Path(__file__).parent / ".env")
if not os.environ.get("ANTHROPIC_API_KEY"):
    raise RuntimeError("API anahtarı bulunamadı. .env dosyasında ANTHROPIC_API_KEY=... satırı olmalı.")
DB_BAGLANTI = os.environ.get("DB_BAGLANTI")
if not DB_BAGLANTI:
    raise RuntimeError("Veritabanı bağlantısı bulunamadı. .env dosyasında DB_BAGLANTI=... satırı olmalı.")

SYSTEM_PROMPT = PROMPT_DOSYASI.read_text(encoding="utf-8")
client = anthropic.Anthropic()  # ANTHROPIC_API_KEY ortam değişkeninden okunur
app = FastAPI(title="Çöz")


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
    parts_and_tools: list[str]
    steps: list[str]
    estimated_cost: None
    recommendation: Literal["kendin_yap", "usta_onerilir", "usta_gerekli", "acil_profesyonel"] | None
    safety_warning: str | None


def claude_cevabi(aciklama: str, foto: bytes | None, foto_turu: str | None) -> str:
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
        system=SYSTEM_PROMPT,
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
        satirlar = [f"Soru: {s.strip()}\nCevap: {c.strip()}" for s, c in zip(sorular, cevaplar)]
        aciklama += (
            "\n\nSorduğun sorular ve kullanıcının cevapları:\n" + "\n".join(satirlar)
            + "\n\nSoru turu tamamlandı. Tekrar soru sorma, eldeki bilgiyle analizi yap."
        )

    try:
        metin = claude_cevabi(aciklama, foto_verisi, foto.content_type if foto_verisi else None)
    except anthropic.AuthenticationError:
        raise HTTPException(500, "API anahtarı geçersiz. .env dosyasını kontrol et.")
    except anthropic.APIError as e:
        raise HTTPException(502, f"Claude API hatası: {e}")

    temiz = metin.strip()
    # Model JSON'u ```json ... ``` içine koyarsa çıkar
    if temiz.startswith("```"):
        temiz = temiz.split("\n", 1)[1].rsplit("```", 1)[0]
    try:
        rapor = ArizaRaporu.model_validate(json.loads(temiz))
    except (json.JSONDecodeError, ValidationError):
        raise HTTPException(502, "Model şemaya uygun bir cevap döndürmedi.")
    # Prompt kuralı: en fazla bir soru turu
    if soru_turu_yapildi and rapor.needs_more_info:
        raise HTTPException(502, "Model soru turundan sonra tekrar soru sordu.")
    try:
        kaydet(kullanici_aciklamasi, foto_verisi is not None, sorular, cevaplar, rapor)
    except pyodbc.Error as e:
        # Kayıt başarısız olsa da kullanıcı raporunu alır
        print(f"!! Veritabanına kaydedilemedi: {e}")
    return rapor
