// Backend'den gelen kodların ekranda görünen karşılıkları
export const ONERI = {
  kendin_yap: "Kendin yapabilirsin",
  usta_onerilir: "Usta önerilir",
  usta_gerekli: "Usta gerekli",
  acil_profesyonel: "Acil",
};

export function kisaTarih(iso) {
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
}
