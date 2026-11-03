-- Eski kurulumu (giriş ve profil eklenmeden önce kurulan veritabanını) güncellemek için.
-- Yeni kurulumda gerekmez, veritabani.sql her şeyi kurar. Eksik olanı ekler, kaç kez çalıştırılsa da zarar vermez.

IF OBJECT_ID('Kullanicilar') IS NULL
CREATE TABLE Kullanicilar (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    OlusturmaZamani DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    Ad NVARCHAR(100) NOT NULL,
    Eposta NVARCHAR(200) NOT NULL UNIQUE,
    SifreTuz CHAR(32) NOT NULL,
    SifreOzeti CHAR(64) NOT NULL
);
GO

IF OBJECT_ID('Oturumlar') IS NULL
CREATE TABLE Oturumlar (
    AnahtarOzeti CHAR(64) PRIMARY KEY,
    KullaniciId INT NOT NULL REFERENCES Kullanicilar(Id),
    OlusturmaZamani DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

-- Raporu kimin oluşturduğu (girişsiz analizlerde boş)
IF COL_LENGTH('Analizler', 'KullaniciId') IS NULL
ALTER TABLE Analizler ADD KullaniciId INT NULL REFERENCES Kullanicilar(Id);
GO

-- Hesabım sayfasındaki isteğe bağlı bilgiler
IF COL_LENGTH('Kullanicilar', 'Yas') IS NULL
ALTER TABLE Kullanicilar ADD Yas INT NULL, Sehir NVARCHAR(100) NULL;
GO
