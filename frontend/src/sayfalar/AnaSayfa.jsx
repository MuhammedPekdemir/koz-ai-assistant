import { useEffect, useState } from "react";
import { useOturum } from "../App.jsx";
import { istek } from "../api.js";
import Sayfa from "../bilesenler/Sayfa.jsx";
import Ok from "../bilesenler/Ok.jsx";
import GecmisListesi from "../bilesenler/GecmisListesi.jsx";

const MODLAR = [
  {
    yol: "/ariza",
    renk: "mavi",
    zemin: "#E6EAFB",
    baslik: "Bir sorun mu var?",
    metin: "Evdeki arızayı yaz ya da fotoğrafını çek. Kendin mi yaparsın, usta mı gerekir, söyleyelim.",
    etiketler: ["Tesisat", "Elektrik ve gaz", "Beyaz eşya", "Nem ve küf"],
    dugme: "Teşhis al",
  },
  {
    yol: "/yeni-is",
    renk: "ikinci",
    zemin: "var(--ikinci)",
    baslik: "Yeni bir iş mi var?",
    metin: "Yaptıracağın işi yaz. Malzemeyi, adımları ve yaklaşık fiyatı öğren, ustayla bilerek konuş.",
    etiketler: ["Boya ve badana", "Zemin", "Kapı ve pencere", "Dış cephe"],
    dugme: "Fiyatı öğren",
  },
];

function Gecmis() {
  const { oturum, setOturum } = useOturum();
  const [raporlar, setRaporlar] = useState(null);
  const [hata, setHata] = useState("");

  useEffect(() => {
    if (!oturum) return;
    istek("/gecmis")
      .then(setRaporlar)
      .catch((e) => {
        if (e.durum === 401) setOturum(null);
        else setHata(e.message);
      });
  }, [oturum]);

  let icerik;
  if (!oturum) {
    icerik = (
      <p className="aciklama">
        Raporlarını saklamak için <a href="#/giris">giriş yap</a>. Giriş yapmadan da teşhis alabilirsin.
      </p>
    );
  } else if (hata) {
    icerik = <p className="hata">{hata}</p>;
  } else if (!raporlar) {
    icerik = <p className="aciklama">Yükleniyor...</p>;
  } else if (raporlar.length === 0) {
    icerik = <p className="aciklama">Henüz raporun yok. İlk teşhisini aldığında burada görünecek.</p>;
  } else {
    icerik = <GecmisListesi raporlar={raporlar.slice(0, 3)} />;
  }

  return (
    <section className="ikincil-bolum">
      <div className="ikincil-ust">
        <h2 className="ikincil-baslik">Son raporların</h2>
        {oturum && raporlar?.length > 0 && <a href="#/hesabim" className="baglanti">Tümünü gör</a>}
      </div>
      {icerik}
    </section>
  );
}

export default function AnaSayfa() {
  return (
    <Sayfa>
      <section className="giris-bolumu">
        <h1 className="dev-baslik">
          Uğraşmadan önce<br /><span className="vurgu">Koz sende.</span>
        </h1>
        <p className="giris-metni">
          <span className="satir">Arızanı ya da yaptıracağın işi anlat.</span>
          <span className="satir">Koz seni bilgilendirsin.</span>
        </p>
      </section>

      <section className="iki-kart">
        {MODLAR.map((m) => (
          <a key={m.yol} href={`#${m.yol}`} className={`mod-kart ${m.renk}`}>
            <h2>{m.baslik}</h2>
            <p>{m.metin}</p>
            <div className="etiketler">
              {m.etiketler.map((e) => <span key={e} className="etiket">{e}</span>)}
            </div>
            <span className="dugme-koyu">{m.dugme}<Ok renk={m.zemin} /></span>
          </a>
        ))}
      </section>

      <Gecmis />
    </Sayfa>
  );
}
