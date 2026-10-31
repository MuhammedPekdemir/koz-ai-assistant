import { useEffect, useRef, useState } from "react";
import { git } from "../App.jsx";
import { istek } from "../api.js";
import Sayfa from "../bilesenler/Sayfa.jsx";
import Ok from "../bilesenler/Ok.jsx";
import BolumMenusu from "../bilesenler/BolumMenusu.jsx";
import useSesleAnlat, { SesDugmesi } from "../bilesenler/useSesleAnlat.jsx";
import { Paylas, RaporSonu, SiraliListe, SoruTuru, aralik, baslikliListe, birlestir } from "../bilesenler/RaporParcalari.jsx";

const MAKS_METIN = 2000;
const MAKS_FOTO = 5 * 1024 * 1024;
const FOTO_TURLERI = ["image/jpeg", "image/png", "image/webp"];

// Fiyat tablosundaki işler (fiyatlar.json) ve dokununca yazılan örnek cümle
const ISLER = [
  ["Boya badana", "m²", "3+1 evin içini boyatmak istiyorum"],
  ["Laminat parke", "m²", "25 m² salona laminat parke döşetmek istiyorum"],
  ["Fayans", "m²", "Banyo duvarlarını fayans yaptıracağım"],
  ["Mantolama", "m²", "Apartmanın dış cephesine mantolama yaptıracağız"],
  ["Cam balkon", "m²", "Balkona cam balkon yaptırmak istiyorum"],
  ["PVC pencere", "m²", "Salondaki 2 pencereyi pimapen yaptırmak istiyorum"],
];
const IS_ADLARI = {
  boya: "Boya ve badana",
  laminat_parke: "Zemin · Laminat parke",
  fayans: "Zemin · Fayans ve seramik",
  mantolama: "Dış cephe · Mantolama",
  cam_balkon: "Kapı ve pencere · Cam balkon",
  pvc_pencere: "Kapı ve pencere · PVC pencere",
  diger: "Tadilat",
};
const BIRIMLER = { m2: "m²", adet: "adet" };

const tarih = (iso) => new Date(iso).toLocaleDateString("tr-TR");
const miktarYazisi = (m) => (m?.value ? `${m.value.toLocaleString("tr-TR")} ${BIRIMLER[m.unit] ?? ""}` : "Belirtilmedi");

function paylasMetni(r) {
  const c = r.cost;
  return birlestir([
    "Yapılacak iş: " + (r.scope || "-"),
    "Miktar: " + miktarYazisi(r.quantity),
    c ? "Tahmini fiyat: " + aralik(c.min, c.max) : "",
    r.duration ? "Süre: " + r.duration : "",
    baslikliListe("Ustaya soracaklarım", r.questions_for_contractor),
  ]);
}

// Anlatılan şey tadilat değil arızaysa ya da kapsam dışıysa
function Yonlendirme({ r, metin, onSifirla }) {
  const ariza = r.job_type === "ariza";
  return (
    <>
    <section className="beyaz-kart yonlendirme">
      <h2 className="bolum-baslik">{ariza ? "Bu bir arıza gibi görünüyor" : "Bu konuda yardımcı olamıyoruz"}</h2>
      {r.scope && <p className="aciklama">{r.scope}</p>}
      {r.safety_warning && (
        <div className="guvenlik">
          <span className="guvenlik-nokta" />
          <p><strong>Önce güvenlik:</strong> {r.safety_warning}</p>
        </div>
      )}
      {ariza && (
        <button type="button" className="dugme-koyu" onClick={() => git(`/ariza?metin=${encodeURIComponent(metin)}`)}>
          Bir sorun mu var? bölümüne geç
          <Ok renk="var(--mavi)" />
        </button>
      )}
    </section>
    <RaporSonu dugme="Başka bir işim var." onSifirla={onSifirla} />
    </>
  );
}

function Rapor({ r, onSifirla }) {
  const c = r.cost;
  const birim = BIRIMLER[c?.unit ?? r.quantity?.unit] ?? "Birim";
  const secenekler = r.material_options ?? [];
  const detaylar = r.technical_details ?? [];
  const adimlar = r.work_steps ?? [];
  const sorular = r.questions_for_contractor ?? [];
  const dikkat = r.red_flags ?? [];
  const varsayimlar = r.assumptions ?? [];

  return (
    <>
      <div className="fiyat-vitrin">
        <div className="fiyat-vitrin-sol">
          <div className="fiyat-vitrin-ust">
            <span className="etiket">{IS_ADLARI[r.job_type] ?? "Tadilat"}</span>
            <span className="fiyat-vitrin-is">{r.scope || "Yapılacak iş"}</span>
          </div>
          {c ? (
            <div className="fiyat-vitrin-fiyat">
              <span className="kutu-etiket">
                Tahmini fiyat · {c.price_basis === "malzeme_dahil" ? "malzeme ve işçilik dahil" : "sadece işçilik"}
              </span>
              <strong>{aralik(c.min, c.max)}</strong>
              {c.note && <span className="fiyat-vitrin-not">{c.note}</span>}
            </div>
          ) : (
            <div className="fiyat-vitrin-fiyat">
              <span className="kutu-etiket">Tahmini fiyat</span>
              <strong className="bos">Fiyat bilgisi yok</strong>
              <span className="fiyat-vitrin-not">
                {r.in_price_table
                  ? "Fiyat için işin ölçüsü gerekiyor. Ölçüyü yazarak tekrar dene."
                  : "Bu iş için henüz güvenilir fiyat verimiz yok. Aşağıdaki sorularla ustalardan teklif alıp karşılaştır."}
              </span>
            </div>
          )}
        </div>
        <dl className="fiyat-vitrin-bilgi">
          {c && (
            <div><dt>{birim} fiyatı</dt><dd>{aralik(c.unit_price[0], c.unit_price[1])}</dd></div>
          )}
          <div><dt>Miktar</dt><dd>{miktarYazisi(r.quantity)}</dd></div>
          <div><dt>Ne kadar sürer?</dt><dd>{r.duration || "-"}</dd></div>
        </dl>
      </div>

      {r.safety_warning && (
        <div className="guvenlik">
          <span className="guvenlik-nokta" />
          <p><strong>Önce güvenlik:</strong> {r.safety_warning}</p>
        </div>
      )}

      {(sorular.length > 0 || dikkat.length > 0) && (
        <div className="rapor-ikili">
          {sorular.length > 0 && (
            <section className="beyaz-kart">
              <h3 className="bolum-baslik">Ustaya sor</h3>
              <SiraliListe ogeler={sorular} />
            </section>
          )}
          {dikkat.length > 0 && (
            <section className="beyaz-kart dikkat-kart">
              <h3 className="bolum-baslik">Dikkat et</h3>
              <ul className="liste">
                {dikkat.map((d, i) => (
                  <li key={i}><span className="dikkat-nokta" /><span>{d}</span></li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {(secenekler.length > 0 || detaylar.length > 0 || adimlar.length > 0) && (
        <section className="beyaz-kart bilgiler">
          <h3 className="bolum-baslik">Bilmen gerekenler</h3>
          {secenekler.length > 0 && (
            <div className="bilgi-izgara">
              {secenekler.map((s, i) => (
                <div key={i} className="bilgi">
                  <strong>{s.option}</strong>
                  <span>{s.notes}</span>
                </div>
              ))}
            </div>
          )}
          {detaylar.length > 0 && (
            <ul className="liste detaylar">
              {detaylar.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          )}
          {adimlar.length > 0 && (
            <details className="is-adimlari">
              <summary>İş nasıl yapılır? ({adimlar.length} adım)</summary>
              <SiraliListe ogeler={adimlar} />
            </details>
          )}
        </section>
      )}

      <Paylas metin={paylasMetni(r)} />
      <RaporSonu dugme="Başka bir işim var." onSifirla={onSifirla}>
        {varsayimlar.length > 0 && <p>Varsayımlar: {varsayimlar.join(" ")}</p>}
      </RaporSonu>
    </>
  );
}

export default function YeniIs() {
  const [metin, setMetin] = useState("");
  const [foto, setFoto] = useState(null); // { dosya, url }
  const [surukle, setSurukle] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState("");
  const [sorular, setSorular] = useState(null);
  const [cevaplar, setCevaplar] = useState([]);
  const [rapor, setRapor] = useState(null);
  const sonucRef = useRef(null);
  const dosyaRef = useRef(null);
  const ses = useSesleAnlat({ metin, setMetin, setHata, maks: MAKS_METIN });

  // Rapor ya da sorular gelince oraya kaydır
  useEffect(() => {
    if (rapor || sorular) sonucRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [rapor, sorular]);

  function fotoSec(dosya) {
    if (!dosya) return;
    if (!FOTO_TURLERI.includes(dosya.type)) return setHata("Fotoğraf jpg, png veya webp olmalı.");
    if (dosya.size > MAKS_FOTO) return setHata("Fotoğraf 5 MB'tan büyük olamaz.");
    setHata("");
    if (foto) URL.revokeObjectURL(foto.url);
    setFoto({ dosya, url: URL.createObjectURL(dosya) });
  }

  function fotoKaldir() {
    if (foto) URL.revokeObjectURL(foto.url);
    setFoto(null);
    if (dosyaRef.current) dosyaRef.current.value = "";
  }

  async function gonder(soruTuru) {
    if (!metin.trim()) return setHata("Yaptırmak istediğin işi yaz.");
    ses.durdur();
    setHata("");
    setYukleniyor(true);
    try {
      const r = await istek("/yeni-islem", {
        method: "POST",
        form: {
          aciklama: metin.trim(),
          foto: foto?.dosya,
          sorular: soruTuru ? sorular : [],
          cevaplar: soruTuru ? cevaplar.map((c) => c.trim() || "Bilmiyorum") : [],
        },
      });
      if (r.needs_more_info) {
        setRapor(null);
        setSorular(r.questions);
        setCevaplar(r.questions.map(() => ""));
      } else {
        setSorular(null);
        setRapor(r);
      }
    } catch (e) {
      setHata(e.message);
    } finally {
      setYukleniyor(false);
    }
  }

  function sifirla() {
    ses.iptal();
    setMetin("");
    fotoKaldir();
    setSorular(null);
    setRapor(null);
    setHata("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const yonlendir = rapor && (rapor.job_type === "ariza" || rapor.job_type === "kapsam_disi");

  return (
    <Sayfa sagDugme={<BolumMenusu secili="yeni-is" />} acilSatiri={false}>
      <section className="ariza-giris yazdirma-yok">
        <h1 className="dev-baslik">Yeni bir iş mi var?</h1>
        <p>Yaptırmak istediğin işi yaz.<br />Nasıl yapılacağını, ne yapman gerektiğini öğren.</p>
      </section>

      <section className="yeni-bildirme yazdirma-yok">
        <form
          className="ariza-form yeni-form"
          onSubmit={(e) => {
            e.preventDefault();
            gonder(false);
          }}
        >
          <div className="ariza-form-ust">
            <label htmlFor="is" className="ariza-form-baslik">Ne yaptırmak istiyorsun?</label>
            <SesDugmesi ses={ses} />
          </div>
          <div className="metin-alani">
            <textarea
              id="is"
              rows={4}
              maxLength={MAKS_METIN}
              value={metin}
              onChange={(e) => setMetin(e.target.value)}
              placeholder="İşi, yerini ve biliyorsan ölçüsünü yaz."
            />
            <span className="sayac">{metin.length} / {MAKS_METIN}</span>
          </div>
          {/* İşin yapılacağı yerin fotoğrafı, isteğe bağlı */}
          <div
            className={`foto-satir${surukle ? " uzerinde" : ""}${foto ? " dolu" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setSurukle(true);
            }}
            onDragLeave={() => setSurukle(false)}
            onDrop={(e) => {
              e.preventDefault();
              setSurukle(false);
              fotoSec(e.dataTransfer.files[0]);
            }}
          >
            {foto && <img className="foto-kucuk" src={foto.url} alt="Eklenen fotoğraf" />}
            <span className="foto-satir-metin">
              <strong>{foto ? "Fotoğraf eklendi" : "Fotoğraf ekle"}</strong>
              <span>{foto ? foto.dosya.name : "İsteğe bağlı. İşin yapılacağı yeri çek, daha iyi anlatalım."}</span>
            </span>
            <span className="foto-satir-dugmeler">
              <button type="button" className="dugme-cizgili" onClick={() => dosyaRef.current.click()}>
                {foto ? "Değiştir" : "Fotoğraf seç"}
              </button>
              {foto && <button type="button" className="metin-dugme" onClick={fotoKaldir}>Kaldır</button>}
            </span>
            <input
              ref={dosyaRef}
              type="file"
              accept={FOTO_TURLERI.join(",")}
              hidden
              onChange={(e) => fotoSec(e.target.files[0])}
            />
          </div>
          {hata && !sorular && <p className="hata" role="alert">{hata}</p>}
          <button type="submit" className="dugme-koyu" disabled={yukleniyor}>
            {yukleniyor && !sorular ? "Hazırlanıyor..." : "Fiyatı öğren"}
            <Ok renk="var(--ikinci)" />
          </button>
        </form>

        <div className="beyaz-kart is-listesi">
          <span className="is-listesi-baslik">Fiyat verebildiğimiz işler</span>
          <span className="is-listesi-not">Birine dokun, örnek cümleyle başla.</span>
          <ul>
            {ISLER.map(([ad, birim, ornek]) => (
              <li key={ad}>
                <button type="button" onClick={() => setMetin(ornek)}>
                  {ad}
                  <span>{birim}</span>
                </button>
              </li>
            ))}
          </ul>
          <span className="is-listesi-alt">Diğer işlerde de detayları anlatırız ama fiyat vermeyiz.</span>
        </div>
      </section>

      {(sorular || rapor) && (
        <article className="rapor yeni-rapor" ref={sonucRef}>
          {sorular ? (
            <SoruTuru
              sorular={sorular}
              cevaplar={cevaplar}
              setCevaplar={setCevaplar}
              onGonder={() => gonder(true)}
              yukleniyor={yukleniyor}
              hata={hata}
              okRengi="var(--ikinci)"
              dugme="Cevapla ve fiyatı öğren"
              bekleme="Hazırlanıyor..."
            />
          ) : yonlendir ? (
            <Yonlendirme r={rapor} metin={metin} onSifirla={sifirla} />
          ) : (
            <Rapor r={rapor} onSifirla={sifirla} />
          )}
        </article>
      )}

      <section className="fiyat-alt-not">
        <p><strong>Fiyatlar İstanbul ortalamasıdır, KDV hariçtir.</strong> Kesin fiyat ustanın yerinde keşfiyle belli olur.</p>
        {rapor?.cost && <span>Fiyat tarihi: {tarih(rapor.cost.price_date)}</span>}
      </section>
    </Sayfa>
  );
}
