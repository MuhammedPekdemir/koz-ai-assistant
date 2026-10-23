# Çöz — Proje Talimatları

Bu dosya projenin kurallarını ve kararlarını tutar. Her oturumda önce bunu oku.

## Proje nedir

Çöz, evde bozulan ya da düzgün çalışmayan şeyler için kullanıcıya yardım eden bir yapay zekâ asistanı. Kullanıcı sorununu yazar, isterse fotoğraf ekler. Çöz olası nedenleri, riski ve ne yapması gerektiğini içeren yapılandırılmış bir rapor döner.

Amaç ustanın yerini almak değil, kullanıcının doğru kararı vermesini sağlamak: basit işi kendi yapsın, riskli işte vakit kaybetmeden profesyonele gitsin.

CV projesi olarak geliştiriliyor. Hedef: çalışan, yayında olan ve doğruluğu ölçülmüş bir uygulama.

## Şu anki odak

**Sadece arıza modu.** Tadilat/yapım işleri (süre, maliyet, işçilik) ve araç arızaları sonraki sürümlere bırakıldı. Bu sürümde fiyat hesabı yok, `estimated_cost` her zaman `null`.

## Kapsam

Tam analiz yapılan kategoriler:
- `su_tesisati` — sızıntı, damlatan musluk, tıkanık gider, rezervuar, düşük basınç
- `nem_kuf` — duvarda, tavanda, pencere kenarında nem, küf, kabarma
- `beyaz_esya` — çamaşır makinesi, bulaşık makinesi, buzdolabı

Çözüm rehberi verilmeyen, sadece güvenlik uyarısı yapılıp profesyonele yönlendirilen kategoriler:
- `elektrik`, `gaz`

Ev arızası olmayan girdiler: `kapsam_disi`.

## Prompt

Arıza modu sistem prompt'u `ariza_prompt.md` dosyasında. Model çağrısında bu dosyadaki metin kullanılır; prompt'u koda gömme, dosyadan oku.

Prompt'un temel kuralları:
- Analizden önce acil durum kontrolü. Acilse normal akış durur, sadece güvenlik adımları verilir.
- Emin olunamayan durum acil sayılır.
- Soru sormak istisnadır. Bilgi yetiyorsa soru sorulmaz, belirsizlik `confidence` ile ifade edilir. En fazla bir soru turu, en fazla 3 soru.
- Öneri zorluk puanına bağlı: 0–40 `kendin_yap`, 41–60 `usta_onerilir`, 61–100 `usta_gerekli`. Elektrik/gazda en az `usta_gerekli`, acil durumda `acil_profesyonel`.
- `kendin_yap` verilse bile kullanıcıya tam güven verilmez; adımlarda nerede durup ustaya danışacağı belirtilir.
- Güven `dusuk`/`orta` ise ve nedenlerden biri usta gerektiriyorsa `kendin_yap` verilmez.
- Analiz yapılmadığında `difficulty` alanı `null` olur, 0 değil.
- Liste alanları hiçbir zaman `null` olmaz, boşsa `[]`. Acil durumda `risk_level` her zaman `acil`.
- Çıktı sadece JSON. Alan değerleri ASCII kodla yazılır (`kendin_yap`, `dusuk` vb.), Türkçe karşılıkları arayüzde gösterilir. Metin alanları Türkçe.

## Çıktı şeması

```json
{
  "category": "su_tesisati | nem_kuf | beyaz_esya | elektrik | gaz | kapsam_disi | null",
  "emergency": false,
  "needs_more_info": false,
  "questions": [],
  "problem": "string | null",
  "possible_causes": ["string"],
  "confidence": "dusuk | orta | yuksek | null",
  "risk_level": "dusuk | orta | acil | null",
  "difficulty": "0-100 | null",
  "parts_and_tools": ["string"],
  "steps": ["string"],
  "estimated_cost": null,
  "recommendation": "kendin_yap | usta_onerilir | usta_gerekli | acil_profesyonel | null",
  "safety_warning": "string | null"
}
```

Backend her cevabı bu şemaya göre doğrular. Şemaya uymayan cevap kullanıcıya gösterilmez.

## Teknoloji

- Yapay zekâ: Claude API (görsel + metin)
- Backend: Python, FastAPI
- Veritabanı: SQL (MSSQL veya PostgreSQL)
- Bulut: AWS — S3 (fotoğraflar), RDS (veritabanı), EC2 veya App Runner (backend)
- Arayüz: henüz karar verilmedi

API anahtarları koda gömülmez, ortam değişkeninden okunur. `.env` dosyası repoya girmez.

## Yol haritası

1. Prompt'u API'ye gönderen betik, zor örneklerle deneme ve prompt düzeltmeleri — **şu an burası**
2. Backend: fotoğraf yükleme, API çağrısı, JSON doğrulama, soru akışı, veritabanı
3. Arayüz: sorun bildirme, sorular, rapor ekranı, acil durum ekranı
4. AWS'ye yayınlama
5. Test seti (40–50 örnek) ve doğruluk ölçümü — en önemli metrik acil durumları kaçırmama oranı
6. README, demo videosu, düzeltmeler

## Çalışma kuralları

- Türkçe yaz.
- Sadece istenen şeyi yap, istenmeyen kod ve adım ekleme.
- Önemli bir karar değişirse bu dosyayı güncelle.
- Güvenlik kuralları pazarlık konusu değil: elektrik ve gaz için kendin-yap talimatı üretilmez, acil durum kontrolü atlanmaz.
