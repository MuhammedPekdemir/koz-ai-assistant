import { git, useOturum } from "../App.jsx";
import AcilSatiri from "./AcilSatiri.jsx";

// Her ekranın ortak çerçevesi: başlık (Koz + slogan + Hesabım), içerik, altta acil satırı
// sagDugme verilirse başlıktaki "Hesabım" düğmesinin yerine o gösterilir
export default function Sayfa({ children, acilSatiri = true, sagDugme, slogan = true }) {
  const { oturum } = useOturum();
  return (
    <div className="zemin">
      <div className="kap">
        <header className="ust">
          <div className="ust-marka">
            <a href="#/" className="logo">Koz</a>
            {slogan && <span className="slogan">Hayattaki Koz'un</span>}
          </div>
          {sagDugme ?? (
            <button type="button" className="dugme-acik" onClick={() => git(oturum ? "/hesabim" : "/giris")}>
              {oturum ? "Hesabım" : "Giriş yap"}
            </button>
          )}
        </header>
        {children}
        {acilSatiri && <AcilSatiri />}
      </div>
    </div>
  );
}
