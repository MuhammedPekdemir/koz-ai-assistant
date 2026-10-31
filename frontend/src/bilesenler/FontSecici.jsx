import { useEffect, useState } from "react";

// Geçici: kart başlıkları için yazı tipi denemesi. mami seçince kaldırılacak.
const SECENEKLER = [
  ["Bricolage Grotesque", "Şimdiki"],
  ["Manrope", "Manrope"],
  ["DM Sans", "DM Sans"],
  ["Outfit", "Outfit"],
  ["Fraunces", "Fraunces"],
];

export default function FontSecici() {
  const [secili, setSecili] = useState(() => localStorage.getItem("kozKartFontu") || SECENEKLER[0][0]);

  useEffect(() => {
    document.documentElement.style.setProperty("--kart-baslik-yazi", `"${secili}", sans-serif`);
    localStorage.setItem("kozKartFontu", secili);
  }, [secili]);

  return (
    <div className="font-secici">
      <strong>Kart başlığı yazı tipi</strong>
      {SECENEKLER.map(([font, ad]) => (
        <button key={font} type="button" aria-pressed={secili === font} style={{ fontFamily: `"${font}"` }} onClick={() => setSecili(font)}>
          {ad}: Bir sorun mu var?
        </button>
      ))}
    </div>
  );
}
