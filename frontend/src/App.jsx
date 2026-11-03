import { createContext, useContext, useEffect, useState } from "react";
import { oturumuOku, oturumuYaz } from "./api.js";
import AnaSayfa from "./sayfalar/AnaSayfa.jsx";
import Giris from "./sayfalar/Giris.jsx";
import Hesabim from "./sayfalar/Hesabim.jsx";
import Ariza from "./sayfalar/Ariza.jsx";
import YeniIs from "./sayfalar/YeniIs.jsx";

// Sayfalar adres çubuğunda # ile tutulur (#/ariza gibi); backend'in /giris ucuyla karışmaz
function adresiOku() {
  const [yol, sorgu = ""] = window.location.hash.slice(1).split("?");
  return { yol: yol || "/", sorgu: new URLSearchParams(sorgu) };
}

export function git(yol) {
  window.location.hash = yol;
}

const OturumBaglami = createContext(null);
export const useOturum = () => useContext(OturumBaglami);

const SAYFALAR = {
  "/": AnaSayfa,
  "/ariza": Ariza,
  "/yeni-is": YeniIs,
  "/giris": Giris,
  "/hesabim": Hesabim,
};

export default function App() {
  const [adres, setAdres] = useState(adresiOku);
  const [oturum, setOturumDurumu] = useState(oturumuOku);

  useEffect(() => {
    const degisti = () => {
      setAdres(adresiOku());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", degisti);
    return () => window.removeEventListener("hashchange", degisti);
  }, []);

  const setOturum = (yeni) => {
    oturumuYaz(yeni);
    setOturumDurumu(yeni);
  };

  const Sayfa = SAYFALAR[adres.yol] ?? AnaSayfa;
  return (
    <OturumBaglami.Provider value={{ oturum, setOturum }}>
      <Sayfa key={window.location.hash} sorgu={adres.sorgu} />
    </OturumBaglami.Provider>
  );
}
