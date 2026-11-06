"""Aynı arızayı iki ustalık seviyesiyle açık sunucuya (localhost:8000) gönderir, adımları yan yana yazar.
Çalıştırmadan önce sunucu açık olmalı: uvicorn main:app --reload"""
import json
import urllib.parse
import urllib.request

ARIZA = "Banyodaki lavabonun gideri çok yavaş akıyor, su birikiyor."
SEVIYELER = ["Hiç anlamam", "Ustayım"]

for seviye in SEVIYELER:
    govde = urllib.parse.urlencode({"aciklama": ARIZA, "ustalik": seviye}).encode()
    istek = urllib.request.Request("http://localhost:8000/analiz", data=govde)
    with urllib.request.urlopen(istek, timeout=300) as cevap:
        rapor = json.loads(cevap.read())
    print("=" * 60)
    print("USTALIK:", seviye, "| öneri:", rapor.get("recommendation"))
    if rapor.get("needs_more_info"):
        print("Model soru sordu:", rapor.get("questions"))
    for i, adim in enumerate(rapor.get("steps") or [], 1):
        print(f"{i}. {adim}")
print("=" * 60)
