"""olcum.py'nin sonuç dosyasını tarayıcıda okunur bir sayfaya çevirir. API çağrısı yapmaz.

Kullanım:
    python rapor.py      # denemeler/olcum-sonuc.json -> denemeler/olcum-rapor.html, tarayıcıda açar
"""

import json
import webbrowser
from html import escape
from pathlib import Path

KLASOR = Path(__file__).parent / "denemeler"
SONUC_DOSYASI = KLASOR / "olcum-sonuc.json"
RAPOR_DOSYASI = KLASOR / "olcum-rapor.html"

OKUNUR = {
    "kendin_yap": "Kendin yap", "usta_onerilir": "Usta önerilir", "usta_gerekli": "Usta gerekli",
    "acil_profesyonel": "Acil profesyonel", "su_tesisati": "Su tesisatı", "nem_kuf": "Nem / küf",
    "beyaz_esya": "Beyaz eşya", "elektrik": "Elektrik", "gaz": "Gaz", "kapsam_disi": "Kapsam dışı",
    "dusuk": "düşük", "orta": "orta", "yuksek": "yüksek", "acil": "acil", None: "-",
}

STIL = """
body { font-family: system-ui, sans-serif; max-width: 900px; margin: 0 auto; padding: 16px; background: #f6f6f4; color: #222; }
h1 { font-size: 22px; }
.ozet { background: #fff; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; }
details { background: #fff; border-radius: 8px; margin-bottom: 8px; border-left: 5px solid #3a9d5d; }
details.hatali { border-left-color: #d0453b; }
summary { cursor: pointer; padding: 10px 14px; font-weight: 600; }
.icerik { padding: 0 14px 12px; }
.etiket { display: inline-block; font-size: 12px; padding: 2px 8px; border-radius: 10px; background: #eee; margin-right: 4px; }
.etiket.kotu { background: #f8d7d4; color: #8a1f17; }
.etiket.acil { background: #d0453b; color: #fff; }
ul, ol { margin: 4px 0 10px; padding-left: 22px; }
.baslik { font-weight: 600; margin-top: 8px; }
"""


def liste(ogeler: list, numarali: bool = False) -> str:
    if not ogeler:
        return "<p>-</p>"
    etiket = "ol" if numarali else "ul"
    return f"<{etiket}>" + "".join(f"<li>{escape(str(o))}</li>" for o in ogeler) + f"</{etiket}>"


def rapor_al(sonuc: dict) -> dict | None:
    temiz = sonuc.get("ham_cevap", "").strip()
    if temiz.startswith("```"):
        temiz = temiz.split("\n", 1)[1].rsplit("```", 1)[0]
    try:
        return json.loads(temiz)
    except json.JSONDecodeError:
        return None


def ornek_html(sonuc: dict) -> str:
    hatalar = [ad for ad, kotu in [("ACİL KAÇTI", sonuc["acil_kacirma"]), ("gereksiz acil", sonuc["gereksiz_acil"]),
                                   ("geçersiz JSON", not sonuc["gecerli_json"]), ("öneri yanlış", not sonuc["oneri_dogru"]),
                                   ("kategori yanlış", not sonuc["kategori_dogru"])] if kotu]
    r = rapor_al(sonuc)
    beklenen = sonuc["beklenen"]
    beklenen_oneri = " / ".join(OKUNUR.get(o, o) for o in beklenen["recommendation"])
    etiketler = "".join(f'<span class="etiket kotu">{h}</span>' for h in hatalar)

    if r is None:
        govde = f"<p>Geçerli JSON dönmedi. Ham cevap:</p><pre>{escape(sonuc.get('ham_cevap', ''))}</pre>"
        oneri = "-"
    else:
        oneri = OKUNUR.get(r.get("recommendation"), r.get("recommendation"))
        if r.get("emergency"):
            etiketler = '<span class="etiket acil">ACİL</span>' + etiketler
        govde = (
            f"<p><b>Beklenen öneri:</b> {beklenen_oneri} · <b>Beklenen acil:</b> { {True: 'evet', False: 'hayır', None: 'ikisi de olur'}[beklenen['emergency']] }</p>"
            f"<p><b>Kategori:</b> {OKUNUR.get(r.get('category'), r.get('category'))} · "
            f"<b>Zorluk:</b> {r.get('difficulty') if r.get('difficulty') is not None else '-'} · "
            f"<b>Güven:</b> {OKUNUR.get(r.get('confidence'), r.get('confidence'))} · "
            f"<b>Risk:</b> {OKUNUR.get(r.get('risk_level'), r.get('risk_level'))}</p>"
            + (f"<p><b>Sorun:</b> {escape(r['problem'])}</p>" if r.get("problem") else "")
            + (f'<div class="baslik">Sorduğu sorular</div>{liste(r.get("questions", []))}' if r.get("needs_more_info") else "")
            + f'<div class="baslik">Olası nedenler</div>{liste(r.get("possible_causes", []))}'
            + f'<div class="baslik">Parça ve aletler</div>{liste([p["item"] if isinstance(p, dict) else p for p in r.get("parts_and_tools", [])])}'
            + f'<div class="baslik">Adımlar</div>{liste(r.get("steps", []), numarali=True)}'
            + (f"<p><b>Uyarı:</b> {escape(r['safety_warning'])}</p>" if r.get("safety_warning") else "")
        )

    if sonuc.get("foto"):
        # Rapor denemeler/ içinde, fotoğraflar bir üst klasörde
        govde = f'<img src="../{escape(sonuc["foto"])}" style="max-width:100%;max-height:320px;border-radius:6px">' + govde
    sinif = "hatali" if hatalar else ""
    return (f'<details class="{sinif}"><summary>{sonuc["id"]}. {escape(sonuc["aciklama"])} '
            f'<span class="etiket">{oneri}</span>{etiketler}</summary><div class="icerik">{govde}</div></details>')


def main() -> None:
    sonuclar = json.loads(SONUC_DOSYASI.read_text(encoding="utf-8"))
    toplam = len(sonuclar)
    hatali = sum(1 for s in sonuclar if s["acil_kacirma"] or s["gereksiz_acil"] or not s["gecerli_json"]
                 or not s["oneri_dogru"] or not s["kategori_dogru"])
    ozet = (f'<div class="ozet">{toplam} örnek · {toplam - hatali} tamam · {hatali} hatalı. '
            "Hatalı olanlar kırmızı çizgili. Ayrıntı için başlığa tıkla.</div>")
    sayfa = (f'<!doctype html><html lang="tr"><head><meta charset="utf-8">'
             f'<meta name="viewport" content="width=device-width, initial-scale=1"><title>Koz ölçüm raporu</title>'
             f"<style>{STIL}</style></head><body><h1>Koz ölçüm raporu</h1>{ozet}"
             + "".join(ornek_html(s) for s in sonuclar) + "</body></html>")
    RAPOR_DOSYASI.write_text(sayfa, encoding="utf-8")
    print(f"Rapor yazıldı: {RAPOR_DOSYASI}")
    webbrowser.open(RAPOR_DOSYASI.resolve().as_uri())


if __name__ == "__main__":
    main()
