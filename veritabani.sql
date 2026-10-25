-- Çöz veritabanı tabloları. SSMS'te Coz veritabanı seçiliyken çalıştırılır.

-- Her /analiz isteği ve modelin döndürdüğü rapor
CREATE TABLE Analizler (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    OlusturmaZamani DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    Aciklama NVARCHAR(MAX) NOT NULL,
    FotoVar BIT NOT NULL,
    SoruCevaplar NVARCHAR(MAX) NULL,  -- soru turu yapıldıysa sorular ve cevaplar (JSON)
    Kategori NVARCHAR(20) NULL,
    Acil BIT NOT NULL,
    SoruSoruldu BIT NOT NULL,         -- needs_more_info
    Oneri NVARCHAR(20) NULL,
    Zorluk INT NULL,
    Rapor NVARCHAR(MAX) NOT NULL      -- modelin tam cevabı (JSON)
);
