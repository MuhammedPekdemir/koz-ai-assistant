// Hesabım'daki ustalık ve ev bilgileri. Backend'de saklanmaz, bu tarayıcıda tutulur;
// arıza ve yeni iş istekleriyle birlikte gönderilir, rapor bunlara göre hazırlanır.
export const SEVIYELER = [
  ["Hiç anlamam", "Ampul değiştirmek bile zor gelir."],
  ["Biraz elim yatkın", "Ampul, silikon, conta gibi basit işleri yaparım."],
  ["İyi anlarım", "Musluk, sifon, priz kapağı değiştiririm."],
  ["Ustayım", "Aletlerim var, çoğu işi kendim yaparım."],
];

// Kutuya dokununca seçenek listesi açılır; "Seçilmedi" seçimi temizler
export const EV_SORULARI = [
  ["Oturma", ["Kiracı", "Ev sahibi"]],
  ["Kat", ["Ara kat", "En üst kat", "Zemin kat", "Müstakil"]],
  ["Binanın yaşı", ["10 yıldan yeni", "10–25 yıl", "25 yıldan eski", "Bilmiyorum"]],
  ["Isınma", ["Kombi", "Kalorifer", "Klima", "Soba"]],
];
// Eski kayıtlarda seçim sıra numarasıyla tutuluyordu; bina yaşının eski sırası buna göre okunur
const ESKI_BINA_YASI = ["10–25 yıl", "25 yıldan eski", "10 yıldan yeni", "Bilmiyorum"];

export const PROFIL_ANAHTARI = "kozProfil";

// ev: her soru için seçilen yazı ya da null; seviye: seçilmediyse null
export function profiliOku() {
  const bos = { seviye: null, ev: [null, null, null, null] };
  try {
    const kayit = { ...bos, ...JSON.parse(localStorage.getItem(PROFIL_ANAHTARI)) };
    kayit.ev = EV_SORULARI.map(([, secenekler], i) => {
      const d = kayit.ev?.[i];
      if (typeof d === "number") return (i === 2 ? ESKI_BINA_YASI : secenekler)[d] ?? null;
      return secenekler.includes(d) ? d : null;
    });
    return kayit;
  } catch {
    return bos;
  }
}

// Rapor isteğine eklenecek alanlar; seçilmeyenler gönderilmez (api.js null alanları atlar)
export function profilAlanlari() {
  const { seviye, ev } = profiliOku();
  return {
    ustalik: SEVIYELER[seviye]?.[0] ?? null,
    oturma: ev[0],
    kat: ev[1],
    bina_yasi: ev[2],
    isinma: ev[3],
  };
}
