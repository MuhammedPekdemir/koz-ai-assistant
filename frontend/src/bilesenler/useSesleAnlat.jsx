import { useEffect, useRef, useState } from "react";

// Sesle anlatma: tarayıcının konuşma tanıma özelliği (Chrome ve Edge'de çalışır)
const KonusmaTanima = window.SpeechRecognition || window.webkitSpeechRecognition;
export const sesDestekleniyor = !!KonusmaTanima;

export default function useSesleAnlat({ metin, setMetin, setHata, maks }) {
  const dinleyiciRef = useRef(null);
  const [dinliyor, setDinliyor] = useState(false);

  // Sayfadan çıkınca mikrofon kapanır
  useEffect(() => () => dinleyiciRef.current?.abort(), []);

  function baslatDurdur() {
    if (dinleyiciRef.current) return dinleyiciRef.current.stop();
    const baslangic = metin ? metin.replace(/\s*$/, " ") : "";
    let kesin = "";
    const d = new KonusmaTanima();
    d.lang = "tr-TR";
    d.continuous = true;
    d.interimResults = true;
    d.onresult = (e) => {
      let gecici = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) kesin += e.results[i][0].transcript;
        else gecici += e.results[i][0].transcript;
      }
      setMetin((baslangic + kesin + gecici).slice(0, maks));
    };
    d.onerror = (e) => {
      if (e.error === "not-allowed") setHata("Mikrofon izni verilmedi. Tarayıcının adres çubuğundan izin verebilirsin.");
      else if (e.error !== "no-speech" && e.error !== "aborted") setHata("Ses anlaşılamadı, tekrar dene.");
    };
    d.onend = () => {
      dinleyiciRef.current = null;
      setDinliyor(false);
    };
    dinleyiciRef.current = d;
    setHata("");
    d.start();
    setDinliyor(true);
  }

  return {
    dinliyor,
    baslatDurdur,
    durdur: () => dinleyiciRef.current?.stop(),
    iptal: () => dinleyiciRef.current?.abort(),
  };
}

export function SesDugmesi({ ses }) {
  if (!sesDestekleniyor) return null;
  return (
    <button
      type="button"
      className={`ses-dugme${ses.dinliyor ? " dinliyor" : ""}`}
      aria-pressed={ses.dinliyor}
      onClick={ses.baslatDurdur}
    >
      <span className="ses-nokta" aria-hidden="true" />
      {ses.dinliyor ? "Dinliyorum, bitir" : "Sesle anlat"}
    </button>
  );
}
