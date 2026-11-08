# Koz

**Uğraşmadan önce, Koz sende.**

Ev için yapay zekâ destekli bir asistan. Evde bir şey bozulduğunda da, eve bir iş yaptırmak istediğinde de (cam balkon, pencere, boya, parke gibi) kullanılır. İki bölümü var.

- **Bir sorun mu var?** Evdeki arızayı yaz ya da fotoğrafını çek. Koz olası nedenleri, riski ve zorluğu çıkarır. Kendin mi yaparsın, usta mı gerekir, söyler. Tesisat, ev aletleri, nem ve küf sorunlarında tam analiz yapar. Elektrik ve gazda güvenlik uyarısı verip profesyonele yönlendirir.
- **Yeni bir iş mi var?** Yaptıracağın işi yaz (boya ve badana, zemin, kapı ve pencere, dış cephe). Koz malzeme seçeneklerini, işin adımlarını, ustaya sorulacakları ve yaklaşık fiyatı çıkarır. Böylece ustayla bilerek konuşursun.

Amaç ustanın yerini almak değil, doğru kararı vermeni sağlamak. Arızada basit işi kendin yap, riskli işte vakit kaybetmeden profesyonele git. Yeni bir işte ne istediğini ve ne kadar tutacağını bilerek ustayla konuş.

![Ana sayfa](gorseller/ana-sayfa.png)

## Demo videosu

[Demo videosunu izle (1 dk 38 sn)](gorseller/koz-demo.mp4). Videoda giriş, hesap açma, fotoğraflı arıza, soru sorulan arıza, yeni iş ve Hesabım'daki raporlar.

## Ekran görüntüleri

| Arıza raporu | Yeni iş raporu |
|---|---|
| ![Arıza raporu](gorseller/ariza-raporu.png) | ![Yeni iş raporu](gorseller/yeni-is-raporu.png) |

## Nasıl çalışır

### Bir sorun mu var? (arıza)

1. Kullanıcı sorunu yazar, isterse fotoğraf ekler (jpg/png/webp, en fazla 5 MB).
2. Model önce acil durum kontrolü yapar. Acilse normal akış durur, sadece güvenlik adımları verilir.
3. Bilgi yetmiyorsa en fazla bir tur, en fazla 3 soru sorar. Bilgi yetiyorsa soru sormaz, belirsizliği güven seviyesiyle belirtir.
4. Rapor döner. Raporda sorun, olası nedenler, güven, risk, zorluk puanı (0–100), parça ve aletler, adımlar, tahmini maliyet ve öneri yer alır.
5. Öneri zorluk puanına bağlıdır. 0–40 kendin yap, 41–60 usta önerilir, 61–100 usta gerekli.

Kapsam şimdilik su tesisatı, nem/küf ve beyaz eşya arızaları. Model fiyat yazmaz. Tahmini maliyeti backend, `fiyatlar/malzeme_fiyatlari.json` dosyasındaki parça ve alet fiyatlarından hesaplar.

### Yeni bir iş mi var? (yeni iş)

1. Kullanıcı yaptırmak istediği işi yazar, isterse işin yapılacağı yerin fotoğrafını ekler.
2. Model işi türüne ayırır ve miktarı (m² veya adet) kullanıcının yazdığından çıkarır. Ölçü fotoğraftan tahmin edilmez. Fotoğraf yüzeyin ve mevcut malzemenin durumunu okumak için kullanılır.
3. Miktar raporu ciddi biçimde değiştirecekse en fazla bir tur, en fazla 3 soru sorar, değilse varsayımını yazar.
4. Rapor döner. Raporda işin tanımı, malzeme seçenekleri, teknik detaylar, iş adımları, ustaya sorulacaklar, dikkat edilecek noktalar, süre, varsayımlar ve tahmini maliyet yer alır.

Model burada da fiyat yazmaz. Maliyeti backend, `fiyatlar/fiyatlar.json` tablosundan ve modelin çıkardığı miktardan hesaplar. İşçilik ya da malzeme dahil fiyat ayrı tutulur. Tabloda olmayan işlerde bilgi verilir ama maliyet hesaplanmaz. Arıza anlatan girdiler arıza bölümüne yönlendirilir.

## Diğer özellikler

- **Sesle anlat.** Sorunu ya da işi yazmak yerine konuşarak anlatabilirsin (tarayıcının ses tanıma özelliğiyle).
- **Hesap.** Giriş yapmadan da rapor alınır. Hesap açınca raporların saklanır ve Hesabım sayfasında görülür. Ad, e-posta ve şifre buradan değiştirilir.
- **Ustalığına göre anlatım.** Hesabım'da ev işlerinde ne kadar elin yatkın olduğunu seçersin. Rapordaki adım sayısı buna göre değişir (Hiç anlamam 8–12, Biraz elim yatkın 6–8, İyi anlarım 4–6, Ustayım 3–5 adım). Güvenlik uyarıları her seviyede aynıdır.
- **Evine göre uyarılar.** Kiracı/ev sahibi, kat, bina yaşı ve ısınma bilgisi girilirse rapordaki uyarılar buna göre yazılır.
- **Raporu paylaş.** Rapor WhatsApp'ta gönderilebilir ya da PDF olarak kaydedilebilir.

## Güvenlik kuralları

- Elektrik ve gaz için kendin-yap talimatı verilmez. Sadece güvenlik uyarısı yapılır ve profesyonele yönlendirilir. Yeni iş bölümünde de bu işlerin yetkili kişilerce yapılması gerektiği yazılır.
- Emin olunamayan durum acil sayılır.
- Kendin yap önerisinde bile adımlarda nerede durup ustaya danışılacağı yazılır.
- Model cevabı şemaya göre doğrulanır. Şemaya uymayan cevap kullanıcıya gösterilmez.

## Doğruluk ölçümü

Arıza bölümü 56 örneklik bir test seti (11'i fotoğraflı, 15'i acil) ile ölçüldü.

| Metrik | Sonuç |
|---|---|
| Öneri doğruluğu | 54/56 |
| Kategori doğruluğu | 55/56 |
| Gereksiz acil | 0/40 |
| Geçerli JSON | 56/56 |
| Kaçırılan acil | 1/15 |

En önemli metrik acil durumları kaçırmamak. Bu ölçümde kaçırılan tek acil durum, kombiden gelen kokunun önemsenmediği örnekti. Prompt'a gaz cihazı kokusu kuralı eklendi. Bu örnek ve diğer 2 hatalı örnek yeniden denendi ve üçü de geçti.

Ölçüm `olcum.py` ile yapılır, sonuçlar `test/sonuclar/` klasörüne yazılır, `rapor.py` sonuçları tarayıcıda okunur bir sayfaya çevirir.

## Teknoloji

- Yapay zekâ, Claude API (görsel + metin)
- Backend, Python, FastAPI
- Veritabanı, MSSQL (yerelde SQL Server Express), `pyodbc`
- Arayüz, React, Vite

## Klasör yapısı

```
main.py        FastAPI backend (/analiz, /yeni-islem, giriş, profil, geçmiş)
deneme.py      Prompt'u API'ye gönderip sonucu ekrana yazan deneme betiği
olcum.py       Test setiyle doğruluk ölçümü
rapor.py       Ölçüm sonucunu HTML rapora çevirir
promptlar/     Sistem prompt'ları
fiyatlar/      Parça ve alet fiyatları
test/          Test seti, test fotoğrafları, ölçüm sonuçları
veritabani/    SQL tablo betikleri
frontend/      React arayüz
gorseller/     Ekran görüntüleri
arsiv/         Eski arayüz ve deneme dosyaları
```

## Kurulum ve çalıştırma

Gerekenler Python 3.11+, Node.js, SQL Server (Express yeterli), ODBC Driver 17 for SQL Server, Claude API anahtarı.

1. Bağımlılıkları kur.

   ```bash
   pip install -r requirements.txt
   ```

2. `.env.example` dosyasını `.env` olarak kopyala, `ANTHROPIC_API_KEY` ve `DB_BAGLANTI` değerlerini doldur.
3. `veritabani/veritabani.sql` betiğini SQL Server'da çalıştır. (`giris_tablolari.sql` sadece eski bir kurulumu güncellemek içindir.)
4. Arayüzü derle.

   ```bash
   cd frontend && npm install && npm run build
   ```

5. Sunucuyu başlat ve tarayıcıda `http://localhost:8000` adresini aç.

   ```bash
   uvicorn main:app --reload
   ```

## Geliştirme

Anthropic'in yapay zekâ asistanı Claude'un yardımıyla geliştirildi. Prompt tasarımı, test betikleri ve kodlamada destek aldım. Ürün kararları, testler ve projenin yönü bana ait.
