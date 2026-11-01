import { useEffect, useState } from "react";
import { git, useOturum } from "../App.jsx";
import { istek } from "../api.js";
import { ONERI, kisaTarih } from "../metinler.js";
import Sayfa from "../bilesenler/Sayfa.jsx";

const SEVIYELER = [
  ["Hiç anlamam", "Ampul değiştirmek bile zor gelir."],
  ["Biraz elim yatkın", "Ampul, silikon, conta gibi basit işleri yaparım."],
  ["İyi anlarım", "Musluk, sifon, priz kapağı değiştiririm."],
  ["Ustayım", "Aletlerim var, çoğu işi kendim yaparım."],
];

// "Değiştir"e her basışta sıradaki seçenek gelir; en sonda yine "Seçilmedi" olur
const EV_SORULARI = [
  ["Oturma", ["Kiracı", "Ev sahibi"]],
  ["Kat", ["Ara kat", "En üst kat", "Zemin kat", "Müstakil"]],
  ["Binanın yaşı", ["10–25 yıl", "25 yıldan eski", "10 yıldan yeni", "Bilmiyorum"]],
  ["Isınma", ["Kombi", "Kalorifer", "Klima", "Soba"]],
];

// Ustalık ve ev bilgileri backend'de henüz yok; şimdilik sadece bu tarayıcıda tutulur
const PROFIL_ANAHTARI = "kozProfil";

function profiliOku() {
  try {
    return { seviye: 1, ev: [null, null, null, null], ...JSON.parse(localStorage.getItem(PROFIL_ANAHTARI)) };
  } catch {
    return { seviye: 1, ev: [null, null, null, null] };
  }
}

function Raporlar({ raporlar, sayi, hata }) {
  const [hepsi, setHepsi] = useState(false);

  let icerik;
  if (hata) icerik = <p className="hata">{hata}</p>;
  else if (!raporlar) icerik = <p className="aciklama">Yükleniyor...</p>;
  else if (raporlar.length === 0) icerik = <p className="aciklama">Henüz raporun yok. İlk teşhisini aldığında burada görünecek.</p>;
  else {
    icerik = (
      <ul className="hesap-satirlar">
        {(hepsi ? raporlar : raporlar.slice(0, 3)).map((r) => (
          <li key={r.id}>
            <button type="button" className="hesap-satir" onClick={() => git(`/ariza?rapor=${r.id}`)}>
              <span className="hesap-satir-sol">
                <strong>{r.problem}</strong>
                <span className="hesap-satir-not">
                  {r.acil || r.oneri === "acil_profesyonel" ? <span className="gecmis-acil">Acil</span> : ONERI[r.oneri] ?? "Rapor"}
                  {" · "}{kisaTarih(r.zaman)}
                </span>
              </span>
              <span className="hesap-satir-ok" aria-hidden="true">›</span>
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section className="hesap-kart">
      <div className="hesap-kart-ust">
        <h2 className="hesap-baslik">Raporların</h2>
        {sayi != null && <span className="hesap-sayi">{sayi} rapor</span>}
      </div>
      {icerik}
      {raporlar?.length > 3 && (
        <button type="button" className="hesap-alt-dugme cizgili" onClick={() => setHepsi(!hepsi)}>
          {hepsi ? "Daha az göster" : "Tümünü gör"}
        </button>
      )}
    </section>
  );
}

// Bilgilerin kartındaki alanlar: [profildeki ad, etiket, input türü, otomatik doldurma]
const BILGILER = [
  ["ad", "Ad", "text", "name"],
  ["eposta", "E-posta", "email", "email"],
  ["yas", "Yaş", "number", "off"],
  ["sehir", "Şehir", "text", "address-level2"],
];

// Tek bir bilgi satırı: "Düzenle"ye basınca satır yerinde forma dönüşür
function BilgiSatiri({ alan, etiket, tur, otomatik, profil, kaydet }) {
  const deger = profil?.[alan];
  const [acik, setAcik] = useState(false);
  const [yeni, setYeni] = useState("");
  const [hata, setHata] = useState("");
  const [bekliyor, setBekliyor] = useState(false);

  const ac = () => {
    setYeni(deger ?? "");
    setHata("");
    setAcik(true);
  };

  const gonder = async (e) => {
    e.preventDefault();
    setBekliyor(true);
    setHata("");
    try {
      await kaydet(alan, yeni);
      setAcik(false);
    } catch (e) {
      setHata(e.message);
    } finally {
      setBekliyor(false);
    }
  };

  if (!acik) {
    return (
      <li className="hesap-satir">
        <span className="hesap-satir-sol">
          <span className="hesap-etiket">{etiket}</span>
          {deger != null && deger !== "" ? <strong>{deger}</strong> : <span className="hesap-bos">İsteğe bağlı</span>}
        </span>
        <button type="button" className="metin-dugme" onClick={ac} disabled={!profil}>
          {deger != null && deger !== "" ? "Düzenle" : "Ekle"}
        </button>
      </li>
    );
  }

  const zorunlu = alan === "ad" || alan === "eposta";
  return (
    <li>
      <form className="bilgi-duzenle" onSubmit={gonder}>
        <div className="alan">
          <label htmlFor={`bilgi-${alan}`}>{etiket}</label>
          <input
            id={`bilgi-${alan}`}
            type={tur}
            value={yeni}
            onChange={(e) => setYeni(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setAcik(false)}
            required={zorunlu}
            min={tur === "number" ? 13 : undefined}
            max={tur === "number" ? 120 : undefined}
            maxLength={tur === "number" ? undefined : 100}
            autoComplete={otomatik}
            autoFocus
          />
        </div>
        {hata && <p className="hata" role="alert">{hata}</p>}
        <div className="sifre-dugmeler">
          <button type="submit" className="dugme-dolu" disabled={bekliyor}>{bekliyor ? "Kaydediliyor..." : "Kaydet"}</button>
          {!zorunlu && deger != null && deger !== "" && (
            <button type="button" className="metin-dugme kirmizi" disabled={bekliyor} onClick={() => setYeni("")}>Temizle</button>
          )}
          <button type="button" className="metin-dugme" onClick={() => setAcik(false)}>Vazgeç</button>
        </div>
      </form>
    </li>
  );
}

function SifreFormu({ kapat }) {
  const [eski, setEski] = useState("");
  const [yeni, setYeni] = useState("");
  const [yeni2, setYeni2] = useState("");
  const [not, setNot] = useState(null);
  const [bekliyor, setBekliyor] = useState(false);

  const gonder = async (e) => {
    e.preventDefault();
    if (yeni !== yeni2) {
      setNot({ hata: true, metin: "Yeni şifreler aynı değil." });
      return;
    }
    setBekliyor(true);
    try {
      await istek("/profil/sifre", { method: "POST", form: { eski, yeni } });
      setEski("");
      setYeni("");
      setYeni2("");
      setNot({ hata: false, metin: "Şifren değişti." });
    } catch (e) {
      setNot({ hata: true, metin: e.message });
    } finally {
      setBekliyor(false);
    }
  };

  return (
    <form className="hesap-kart sifre-formu" onSubmit={gonder}>
      <h2 className="hesap-baslik">Şifreyi değiştir</h2>
      <div className="sifre-alanlar">
        <div className="alan">
          <label htmlFor="eski-sifre">Şu anki şifren</label>
          <input id="eski-sifre" type="password" value={eski} onChange={(e) => setEski(e.target.value)} required autoComplete="current-password" />
        </div>
        <div className="alan">
          <label htmlFor="yeni-sifre">Yeni şifre</label>
          <input id="yeni-sifre" type="password" value={yeni} onChange={(e) => setYeni(e.target.value)} required minLength={8} autoComplete="new-password" />
        </div>
        <div className="alan">
          <label htmlFor="yeni-sifre2">Yeni şifre (tekrar)</label>
          <input id="yeni-sifre2" type="password" value={yeni2} onChange={(e) => setYeni2(e.target.value)} required minLength={8} autoComplete="new-password" />
        </div>
      </div>
      {not && <p className={not.hata ? "hata" : "aciklama"} role="alert">{not.metin}</p>}
      <div className="sifre-dugmeler">
        <button type="submit" className="dugme-dolu" disabled={bekliyor}>{bekliyor ? "Güncelleniyor..." : "Şifreyi güncelle"}</button>
        <button type="button" className="metin-dugme" onClick={kapat}>{not && !not.hata ? "Kapat" : "Vazgeç"}</button>
      </div>
    </form>
  );
}

export default function Hesabim() {
  const { oturum, setOturum } = useOturum();
  const [profil, setProfil] = useState(null);
  const [raporlar, setRaporlar] = useState(null);
  const [hata, setHata] = useState("");
  const [sifreAcik, setSifreAcik] = useState(false);
  const [yerel, setYerel] = useState(profiliOku);
  const [silNot, setSilNot] = useState("");

  useEffect(() => {
    if (!oturum) {
      git("/giris");
      return;
    }
    const hataVar = (e) => {
      if (e.durum === 401) setOturum(null);
      else setHata(e.message);
    };
    istek("/profil").then(setProfil).catch(hataVar);
    istek("/gecmis").then(setRaporlar).catch(hataVar);
  }, [oturum]);

  const yerelDegistir = (yeni) => {
    setYerel(yeni);
    try {
      localStorage.setItem(PROFIL_ANAHTARI, JSON.stringify(yeni));
    } catch {}
  };

  const evDegistir = (i) => {
    const ev = yerel.ev.slice();
    const sonraki = (ev[i] ?? -1) + 1;
    ev[i] = sonraki < EV_SORULARI[i][1].length ? sonraki : null;
    yerelDegistir({ ...yerel, ev });
  };

  // Bir alan değişince diğerleri profildeki haliyle birlikte gönderilir
  const bilgiKaydet = async (alan, deger) => {
    const form = {
      ad: profil.ad,
      eposta: profil.eposta,
      yas: profil.yas ?? "",
      sehir: profil.sehir ?? "",
      [alan]: deger,
    };
    try {
      const yeni = await istek("/profil", { method: "POST", form });
      setProfil({ ...profil, ...yeni });
      setOturum({ ...oturum, ad: yeni.ad, eposta: yeni.eposta });
    } catch (e) {
      if (e.durum === 401) setOturum(null);
      throw e;
    }
  };

  const cikis = async () => {
    try {
      await istek("/cikis", { method: "POST" });
    } catch {}
    setOturum(null);
    git("/");
  };

  if (!oturum) return null;
  const ad = profil?.ad ?? oturum.ad;

  // Başlıkta Hesabım düğmesi bu sayfada koyu (seçili) görünür
  const seciliDugme = <a href="#/hesabim" className="dugme-acik secili" aria-current="page">Hesabım</a>;

  return (
    <Sayfa acilSatiri={false} sagDugme={seciliDugme}>
      <section className="hesap-giris">
        <h1 className="hesap-merhaba">Merhaba, {ad}.</h1>
        <p>Seni ve evini ne kadar tanırsak, o kadar iyi rapor hazırlarız.</p>
      </section>

      <div className="hesap-ikili">
        <Raporlar raporlar={raporlar} sayi={profil?.rapor_sayisi} hata={hata} />

        <section className="hesap-kart">
          <div className="hesap-kart-ust">
            <h2 className="hesap-baslik">Bilgilerin</h2>
          </div>
          <ul className="hesap-satirlar">
            {BILGILER.map(([alan, etiket, tur, otomatik]) => (
              <BilgiSatiri
                key={alan}
                alan={alan}
                etiket={etiket}
                tur={tur}
                otomatik={otomatik}
                profil={profil}
                kaydet={bilgiKaydet}
              />
            ))}
          </ul>
          <button type="button" className="hesap-alt-dugme gri" onClick={() => setSifreAcik(true)} disabled={sifreAcik}>
            Şifreyi değiştir
          </button>
        </section>
      </div>

      {sifreAcik && <SifreFormu kapat={() => setSifreAcik(false)} />}

      <section className="hesap-kart">
        <div className="hesap-bolum-ust">
          <h2 className="hesap-baslik">Ev işlerinde elin ne kadar yatkın?</h2>
          <p>Hiç bilmeyene adım adım, bilene kısa anlatırız.</p>
        </div>
        <div className="dortlu" role="radiogroup" aria-label="Ustalık seviyesi">
          {SEVIYELER.map(([baslik, metin], i) => (
            <button
              key={baslik}
              type="button"
              role="radio"
              aria-checked={yerel.seviye === i}
              className="seviye"
              onClick={() => yerelDegistir({ ...yerel, seviye: i })}
            >
              <strong>{baslik}</strong>
              <span>{metin}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="hesap-kart">
        <div className="hesap-bolum-ust">
          <h2 className="hesap-baslik">Evin</h2>
          <p>Nem, tesisat ve kombi sorunlarında teşhisi netleştirir. İsteğe bağlı.</p>
        </div>
        <div className="dortlu">
          {EV_SORULARI.map(([soru, secenekler], i) => (
            <button key={soru} type="button" className="ev-kutu" onClick={() => evDegistir(i)}>
              <span className="ev-kutu-ust">
                <span className="hesap-etiket">{soru}</span>
                {yerel.ev[i] == null ? (
                  <strong className="hesap-bos">Seçilmedi</strong>
                ) : (
                  <strong>{secenekler[yerel.ev[i] % secenekler.length]}</strong>
                )}
              </span>
              <span className="ev-kutu-degistir">{yerel.ev[i] == null ? "Seç" : "Değiştir"}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="hesap-son">
        <button type="button" className="dugme-cizgili" onClick={cikis}>Çıkış yap</button>
        {/* Hesap silme backend'de henüz yok */}
        <button type="button" className="metin-dugme kirmizi" onClick={() => setSilNot("Hesap silme yakında gelecek.")}>Hesabımı sil</button>
      </section>
      {silNot && <p className="form-not">{silNot}</p>}
    </Sayfa>
  );
}
