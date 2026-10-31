// Backend'e istek atan ortak yardımcılar. Oturum eski arayüzle aynı yerde tutulur ("kozOturum").
const ANAHTAR = "kozOturum";

export function oturumuOku() {
  try {
    return JSON.parse(localStorage.getItem(ANAHTAR));
  } catch {
    return null;
  }
}

export function oturumuYaz(oturum) {
  if (oturum) localStorage.setItem(ANAHTAR, JSON.stringify(oturum));
  else localStorage.removeItem(ANAHTAR);
}

// form verilirse FormData olarak gönderilir; diziler (sorular, cevaplar) tekrar eden alan olur
export async function istek(yol, { method = "GET", form } = {}) {
  const basliklar = {};
  const oturum = oturumuOku();
  if (oturum?.token) basliklar.Authorization = `Bearer ${oturum.token}`;

  let govde;
  if (form) {
    govde = new FormData();
    for (const [ad, deger] of Object.entries(form)) {
      if (Array.isArray(deger)) deger.forEach((d) => govde.append(ad, d));
      else if (deger !== undefined && deger !== null) govde.append(ad, deger);
    }
  }

  let cevap;
  try {
    cevap = await fetch(yol, { method, headers: basliklar, body: govde });
  } catch {
    throw new Error("Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.");
  }
  const veri = await cevap.json().catch(() => null);
  if (!cevap.ok) {
    if (cevap.status === 401) oturumuYaz(null);
    // Sunucu tarafı hatalar (500 ve üstü) teknik yazı içerir; müşteriye sade bir cümle gösterilir
    const sade = cevap.status < 500 && typeof veri?.detail === "string";
    const hata = new Error(sade ? veri.detail : "Şu an bir sorun yaşıyoruz. Biraz sonra tekrar dene.");
    hata.durum = cevap.status;
    throw hata;
  }
  return veri;
}
