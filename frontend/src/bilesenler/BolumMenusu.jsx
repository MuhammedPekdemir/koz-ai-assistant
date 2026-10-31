import { git, useOturum } from "../App.jsx";

// Arıza ve yeni iş ekranlarının başlığındaki sağ taraf: iki bölüm sekmesi + Hesabım
const BOLUMLER = [
  ["ariza", "/ariza", "mavi", "Bir sorun mu var?"],
  ["yeni-is", "/yeni-is", "ikinci", "Yeni bir iş mi var?"],
];

export default function BolumMenusu({ secili }) {
  const { oturum } = useOturum();
  return (
    <div className="ust-sag">
      <nav aria-label="Bölümler" className="bolumler">
        {BOLUMLER.map(([ad, yol, renk, yazi]) => (
          <a
            key={ad}
            href={`#${yol}`}
            className={ad === secili ? `secili ${renk}` : undefined}
            aria-current={ad === secili ? "page" : undefined}
          >
            {yazi}
          </a>
        ))}
      </nav>
      <button type="button" className="dugme-acik" onClick={() => git(oturum ? "/hesabim" : "/giris")}>
        {oturum ? "Hesabım" : "Giriş yap"}
      </button>
    </div>
  );
}
