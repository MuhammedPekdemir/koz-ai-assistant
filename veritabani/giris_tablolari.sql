-- Giriş/profil için eklenen tablolar. Coz veritabanı seçiliyken SSMS'te bir kez çalıştırılır.

-- Kullanıcı hesapları. Şifrenin kendisi tutulmaz, tuzlu özeti (PBKDF2) tutulur.
CREATE TABLE Kullanicilar (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    OlusturmaZamani DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    Ad NVARCHAR(100) NOT NULL,
    Eposta NVARCHAR(200) NOT NULL UNIQUE,
    SifreTuz CHAR(32) NOT NULL,
    SifreOzeti CHAR(64) NOT NULL
);

-- Giriş anahtarları. Çıkış yapınca satır silinir.
CREATE TABLE Oturumlar (
    AnahtarOzeti CHAR(64) PRIMARY KEY,
    KullaniciId INT NOT NULL REFERENCES Kullanicilar(Id),
    OlusturmaZamani DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

-- Raporu kimin oluşturduğu (girişsiz analizlerde boş)
ALTER TABLE Analizler ADD KullaniciId INT NULL REFERENCES Kullanicilar(Id);

-- Hesabım sayfasındaki isteğe bağlı bilgiler
ALTER TABLE Kullanicilar ADD Yas INT NULL, Sehir NVARCHAR(100) NULL;
