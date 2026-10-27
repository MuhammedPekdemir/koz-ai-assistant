"""Test setindeki örnekleri modele gönderip doğruluğu ölçer.

Kullanım:
    python olcum.py            # test_seti.json'daki tüm örnekler (~45 çağrı, yaklaşık 1 dolar)
    python olcum.py 5          # sadece ilk 5 örnek (hızlı deneme)
    python olcum.py --foto     # sadece fotoğraflı örnekler (test_fotolar/)

Ölçülenler:
    - Acil kaçırma: beklenen acil, model acil demedi (en önemli metrik, 0 olmalı)
    - Gereksiz acil: beklenen acil değil, model acil dedi
    - Öneri doğruluğu ve kategori doğruluğu
    - Geçerli JSON oranı (backend'deki şemaya uyan cevaplar)

Detaylı sonuçlar denemeler/olcum-sonuc.json dosyasına yazılır.
"""

import json
import sys
from pathlib import Path

import anthropic
from pydantic import ValidationError

from deneme import analiz_et
from main import SYSTEM_PROMPT, ArizaRaporu, client

KLASOR = Path(__file__).parent
TEST_SETI = KLASOR / "test_seti.json"
SONUC_DOSYASI = KLASOR / "denemeler" / "olcum-sonuc.json"


def cevabi_coz(metin: str) -> dict | None:
    """Cevap şemaya uyuyorsa sözlük döner, uymuyorsa None."""
    temiz = metin.strip()
    # Model JSON'u ```json ... ``` içine koyarsa çıkar
    if temiz.startswith("```"):
        temiz = temiz.split("\n", 1)[1].rsplit("```", 1)[0]
    try:
        return ArizaRaporu.model_validate(json.loads(temiz)).model_dump()
    except (json.JSONDecodeError, ValidationError):
        return None


def degerlendir(ornek: dict, rapor: dict | None) -> dict:
    beklenen = ornek["beklenen"]
    sonuc = {"id": ornek["id"], "grup": ornek["grup"], "aciklama": ornek["aciklama"], "foto": ornek.get("foto"),
             "beklenen": beklenen}
    if rapor is None:
        sonuc.update(gecerli_json=False, acil_kacirma=beklenen["emergency"] is True, gereksiz_acil=False,
                     oneri_dogru=False, kategori_dogru=False)
        return sonuc

    acil = rapor["emergency"]
    soru = rapor["needs_more_info"]
    sonuc["model"] = {"emergency": acil, "category": rapor["category"], "recommendation": rapor["recommendation"],
                      "needs_more_info": soru, "questions": rapor["questions"]}
    sonuc["gecerli_json"] = True
    # beklenen emergency null ise iki cevap da kabul
    sonuc["acil_kacirma"] = beklenen["emergency"] is True and not acil
    sonuc["gereksiz_acil"] = beklenen["emergency"] is False and acil
    if soru:
        # Soru turunda öneri yok; soru sorması kabul edilen örneklerde doğru sayılır
        sonuc["oneri_dogru"] = beklenen["soru_kabul"]
        sonuc["kategori_dogru"] = beklenen["soru_kabul"] or rapor["category"] in beklenen["category"]
    else:
        sonuc["oneri_dogru"] = rapor["recommendation"] in beklenen["recommendation"]
        sonuc["kategori_dogru"] = rapor["category"] in beklenen["category"]
    return sonuc


def oran(sayi: int, toplam: int) -> str:
    return f"{sayi}/{toplam} (%{100 * sayi / toplam:.0f})" if toplam else "-"


def main() -> None:
    ornekler = json.loads(TEST_SETI.read_text(encoding="utf-8"))
    if sys.argv[1:] == ["--foto"]:
        ornekler = [o for o in ornekler if o.get("foto")]
    elif len(sys.argv) > 1:
        ornekler = ornekler[: int(sys.argv[1])]

    sonuclar = []
    for ornek in ornekler:
        foto = KLASOR / ornek["foto"] if ornek.get("foto") else None
        print(f"{ornek['id']}: {ornek['aciklama']}" + (f" [foto: {ornek['foto']}]" if foto else ""))
        try:
            metin = analiz_et(client, SYSTEM_PROMPT, ornek["aciklama"], foto)
        except anthropic.AuthenticationError:
            sys.exit("API anahtarı geçersiz ya da eksik. .env dosyasını kontrol et.")
        except anthropic.APIError as e:
            print(f"   !! API hatası: {e}")
            metin = ""
        sonuc = degerlendir(ornek, cevabi_coz(metin))
        sonuc["ham_cevap"] = metin
        sonuclar.append(sonuc)

        hatalar = [ad for ad, kotu in [("ACİL KAÇTI", sonuc["acil_kacirma"]), ("gereksiz acil", sonuc["gereksiz_acil"]),
                                       ("geçersiz JSON", not sonuc["gecerli_json"]), ("öneri yanlış", not sonuc["oneri_dogru"]),
                                       ("kategori yanlış", not sonuc["kategori_dogru"])] if kotu]
        print("   " + (", ".join(hatalar) if hatalar else "tamam"))

    toplam = len(sonuclar)
    acil_beklenen = sum(s["beklenen"]["emergency"] is True for s in sonuclar)
    acil_degil_beklenen = sum(s["beklenen"]["emergency"] is False for s in sonuclar)
    print("\n=== Sonuç ===")
    print(f"Acil kaçırma     : {oran(sum(s['acil_kacirma'] for s in sonuclar), acil_beklenen)}  (0 olmalı)")
    print(f"Gereksiz acil    : {oran(sum(s['gereksiz_acil'] for s in sonuclar), acil_degil_beklenen)}")
    print(f"Öneri doğruluğu  : {oran(sum(s['oneri_dogru'] for s in sonuclar), toplam)}")
    print(f"Kategori doğruluğu: {oran(sum(s['kategori_dogru'] for s in sonuclar), toplam)}")
    print(f"Geçerli JSON     : {oran(sum(s['gecerli_json'] for s in sonuclar), toplam)}")

    SONUC_DOSYASI.parent.mkdir(exist_ok=True)
    SONUC_DOSYASI.write_text(json.dumps(sonuclar, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nDetaylar: {SONUC_DOSYASI}")


if __name__ == "__main__":
    main()
