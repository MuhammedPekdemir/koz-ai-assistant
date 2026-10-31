import { useEffect, useState } from "react";

// Geçici: "Yeni bir iş mi var?" kartının rengini denemek için. mami seçince kaldırılacak.
const SECENEKLER = [
  { ad: "Adaçayı", zemin: "#E3EEE4", cizgi: "rgba(47, 107, 58, 0.35)", koyu: "#2F5E37" },
  { ad: "Kum", zemin: "#F1EADB", cizgi: "rgba(120, 90, 40, 0.35)", koyu: "#6B5320" },
  { ad: "Açık sarı", zemin: "#FBF0C8", cizgi: "rgba(140, 105, 10, 0.35)", koyu: "#6E5208" },
  { ad: "Nane", zemin: "#DDF0EC", cizgi: "rgba(20, 110, 95, 0.35)", koyu: "#1D5E53" },
];

export default function RenkSecici() {
  const [secili, setSecili] = useState(0);

  useEffect(() => {
    const r = SECENEKLER[secili];
    const kok = document.documentElement.style;
    kok.setProperty("--ikinci", r.zemin);
    kok.setProperty("--ikinci-cizgi", r.cizgi);
    kok.setProperty("--ikinci-koyu", r.koyu);
  }, [secili]);

  return (
    <div className="renk-secici">
      <strong>"Yeni bir iş mi var?" rengi</strong>
      {SECENEKLER.map((r, i) => (
        <button key={r.ad} type="button" aria-pressed={secili === i} onClick={() => setSecili(i)}>
          <span className="renk-ornek" style={{ background: r.zemin }} />
          {r.ad}
        </button>
      ))}
    </div>
  );
}
