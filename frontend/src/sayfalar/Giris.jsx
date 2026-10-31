import { useState } from "react";
import { git, useOturum } from "../App.jsx";
import { istek } from "../api.js";
import Sayfa from "../bilesenler/Sayfa.jsx";
import Ok from "../bilesenler/Ok.jsx";

const FAYDALAR = [
  ["Hiçbir rapor kaybolmaz", "Aldığın her teşhis hesabına kaydedilir."],
  ["Ustaya göster", "Eski raporu aç, ustayla konuşurken önünde dursun."],
  ["Her cihazdan gir", "Telefonda başla, bilgisayarda devam et."],
  ["Sadece sen görürsün", "Raporlarına başka kimse ulaşamaz."],
];

const METIN = {
  giris: {
    baslik: "Tekrar hoş geldin",
    altyazi: "E-posta ve şifrenle gir, raporların seni bekliyor.",
    dugme: "Giriş yap",
  },
  kayit: {
    baslik: "Hesabını aç",
    altyazi: "Bir dakika sürer. Adın, e-postan ve bir şifre yeter.",
    dugme: "Hesabımı aç",
  },
};

export default function Giris() {
  const { setOturum } = useOturum();
  const [mod, setMod] = useState("giris");
  const [ad, setAd] = useState("");
  const [eposta, setEposta] = useState("");
  const [sifre, setSifre] = useState("");
  const [hata, setHata] = useState("");
  const [not, setNot] = useState("");
  const [bekliyor, setBekliyor] = useState(false);
  const kayit = mod === "kayit";
  const m = METIN[mod];

  const modSec = (yeni) => {
    setMod(yeni);
    setHata("");
    setNot("");
  };

  const gonder = async (e) => {
    e.preventDefault();
    setHata("");
    setBekliyor(true);
    try {
      const form = kayit ? { ad, eposta, sifre } : { eposta, sifre };
      const cevap = await istek(kayit ? "/kayit" : "/giris", { method: "POST", form });
      setOturum(cevap);
      git("/");
    } catch (err) {
      setHata(err.message);
    } finally {
      setBekliyor(false);
    }
  };

  const devamEt = (
    <a href="#/" className="dugme-acik">Hesap açmadan devam et</a>
  );

  return (
    <Sayfa acilSatiri={false} sagDugme={devamEt}>
      <section className="giris-ekrani">
        <div className={`giris-panel${kayit ? " uzun" : ""}`}>
          <div className="giris-panel-ust">
            <h1 className="giris-panel-baslik">Raporların seninle kalsın.</h1>
            <p>Hesabın olunca Koz'un söylediği her şey bir yerde durur. Usta kapıya geldiğinde ne konuşacağını bilirsin.</p>
          </div>
          <div className="faydalar">
            {FAYDALAR.map(([baslik, metin]) => (
              <div key={baslik} className="fayda">
                <strong>{baslik}</strong>
                <span>{metin}</span>
              </div>
            ))}
          </div>
        </div>

        <form className="giris-form" onSubmit={gonder}>
          <div className="mod-secimi" role="group" aria-label="Giriş ya da hesap aç">
            <button type="button" aria-pressed={!kayit} onClick={() => modSec("giris")}>Giriş yap</button>
            <button type="button" aria-pressed={kayit} onClick={() => modSec("kayit")}>Hesap aç</button>
          </div>
          <div className="form-baslik">
            <h2>{m.baslik}</h2>
            <p>{m.altyazi}</p>
          </div>
          {kayit && (
            <div className="alan">
              <label htmlFor="ad">Adın</label>
              <input id="ad" type="text" placeholder="Örnek: Ayşe" value={ad} onChange={(e) => setAd(e.target.value)} required autoComplete="given-name" />
            </div>
          )}
          <div className="alan">
            <label htmlFor="eposta">E-posta</label>
            <input id="eposta" type="email" placeholder="ornek@eposta.com" value={eposta} onChange={(e) => setEposta(e.target.value)} required autoComplete="email" />
          </div>
          <div className="alan">
            <label htmlFor="sifre">Şifre</label>
            <input
              id="sifre"
              type="password"
              placeholder="En az 8 karakter"
              value={sifre}
              onChange={(e) => setSifre(e.target.value)}
              required
              minLength={kayit ? 8 : undefined}
              autoComplete={kayit ? "new-password" : "current-password"}
            />
          </div>
          {hata && <p className="hata" role="alert">{hata}</p>}
          <button type="submit" className="dugme-koyu genis" disabled={bekliyor}>
            {bekliyor ? "Bekle..." : m.dugme}
            <Ok renk="var(--adacayi)" />
          </button>
          {kayit ? (
            <p className="form-not">Hesap açarak kullanım koşullarını ve KVKK metnini kabul etmiş olursun.</p>
          ) : (
            <>
              {/* Şifre sıfırlama backend'de henüz yok */}
              <button type="button" className="metin-dugme" onClick={() => setNot("Şifre sıfırlama yakında gelecek.")}>Şifremi unuttum</button>
              {not && <p className="form-not">{not}</p>}
            </>
          )}
        </form>
      </section>

      <p className="giris-alt-not">Hesap açmadan da teşhis alabilirsin, ama raporların kaydedilmez.</p>
    </Sayfa>
  );
}
