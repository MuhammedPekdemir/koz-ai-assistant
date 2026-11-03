-- Koz veritabanı tabloları. SSMS'te Coz veritabanı seçiliyken bir kez çalıştırılır.
-- Yeni kurulumda sadece bu dosya yeterli. giris_tablolari.sql eski kurulumu güncellemek içindir.

-- Kullanıcı hesapları. Şifrenin kendisi tutulmaz, tuzlu özeti (PBKDF2) tutulur.
CREATE TABLE Kullanicilar (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    OlusturmaZamani DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    Ad NVARCHAR(100) NOT NULL,
    Eposta NVARCHAR(200) NOT NULL UNIQUE,
    SifreTuz CHAR(32) NOT NULL,
    SifreOzeti CHAR(64) NOT NULL,
    Yas INT NULL,                     -- Hesabım'daki isteğe bağlı bilgiler
    Sehir NVARCHAR(100) NULL
);

-- Giriş anahtarları. Çıkış yapınca satır silinir.
CREATE TABLE Oturumlar (
    AnahtarOzeti CHAR(64) PRIMARY KEY,
    KullaniciId INT NOT NULL REFERENCES Kullanicilar(Id),
    OlusturmaZamani DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

-- Her /analiz isteği ve modelin döndürdüğü rapor
CREATE TABLE Analizler (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    OlusturmaZamani DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    Aciklama NVARCHAR(MAX) NOT NULL,  -- sadece fotoğraf gönderildiyse boş
    FotoVar BIT NOT NULL,
    SoruCevaplar NVARCHAR(MAX) NULL,  -- soru turu yapıldıysa sorular ve cevaplar (JSON)
    Kategori NVARCHAR(20) NULL,
    Acil BIT NOT NULL,
    SoruSoruldu BIT NOT NULL,         -- needs_more_info
    Oneri NVARCHAR(20) NULL,
    Zorluk INT NULL,
    Rapor NVARCHAR(MAX) NOT NULL,     -- modelin tam cevabı (JSON)
    KullaniciId INT NULL REFERENCES Kullanicilar(Id)  -- girişsiz analizlerde boş
);
