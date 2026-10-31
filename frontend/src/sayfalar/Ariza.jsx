import { useEffect, useRef, useState } from "react";
import { git, useOturum } from "../App.jsx";
import { istek } from "../api.js";
import { ONERI } from "../metinler.js";
import Sayfa from "../bilesenler/Sayfa.jsx";
import Ok from "../bilesenler/Ok.jsx";
import BolumMenusu from "../bilesenler/BolumMenusu.jsx";
import useSesleAnlat, { SesDugmesi } from "../bilesenler/useSesleAnlat.jsx";
import { Paylas, RaporSonu, SiraliListe, SoruTuru, aralik, baslikliListe, birlestir } from "../bilesenler/RaporParcalari.jsx";

const MAKS_METIN = 2000;
const MAKS_FOTO = 5 * 1024 * 1024;
const FOTO_TURLERI = ["image/jpeg", "image/png", "image/webp"];
const ORNEKLER = ["Musluk sürekli damlıyor", "Banyo tavanında kararma var", "Çamaşır makinesi çok sallanıyor", "Duvarda küf var"];

const KATEGORI = {
  su_tesisati: "Su tesisatı",
  nem_kuf: "Nem ve küf",
  beyaz_esya: "Beyaz eşya",
  elektrik: "Elektrik",
  gaz: "Gaz",
  kapsam_disi: "Kapsam dışı",
};
// Öneri ölçeğindeki dört basamak, soldan sağa
const OLCEK = [
  ["kendin_yap", "Kendin yap"],
  ["usta_onerilir", "Usta önerilir"],
  ["usta_gerekli", "Usta gerekli"],
  ["acil_profesyonel", "Acil"],
];
const ONERI_ACIKLAMASI = {
  kendin_yap: "Adımları dikkatle izlersen kendin halledebilirsin. Emin olmadığın yerde dur.",
  usta_onerilir: "Basit kontrolleri yapabilirsin ama çözüm için bir ustaya danışman daha iyi olur.",
  usta_gerekli: "Bu iş ortalama bir kullanıcı için riskli. Bir usta çağırman gerekiyor.",
  acil_profesyonel: "Hemen bir profesyonele ulaş.",
};
const ACILIYET = {
  dusuk: ["Acele yok", "Uygun bir zamanda ilgilen."],
  orta: ["Birkaç gün içinde", "İlgilen, beklerse büyür."],
  yuksek: ["Bugün", "Zarar hızla büyüyebilir."],
  acil: ["Hemen", "Hemen ilgilen."],
};
const GUVEN = {
  dusuk: "Bu teşhisten yeterince emin değiliz",
  orta: "Bu teşhisten tam emin değiliz",
  yuksek: "Bu teşhisten eminiz",
};
const ACIL_NUMARALAR = [
  ["112", "Acil çağrı"],
  ["187", "Doğalgaz acil"],
  ["186", "Elektrik arıza"],
];

// WhatsApp'a gidecek kısa özet
function paylasMetni(r) {
  if (r.emergency) {
    return birlestir(["Acil durum: " + (r.problem || ""), r.safety_warning, baslikliListe("Hemen yapılacaklar", r.steps)]);
  }
  const c = r.estimated_cost;
  return birlestir([
    "Sorun: " + (r.problem || "-"),
    `Öneri: ${ONERI[r.recommendation] ?? "-"} · Aciliyet: ${ACILIYET[r.risk_level]?.[0] ?? "-"}`,
    r.risk_reason,
    baslikliListe("Olası nedenler", r.possible_causes),
    c?.lines?.some((k) => k.kind === "parca") ? "Tahmini malzeme: " + aralik(c.parts_min, c.parts_max) : "",
  ]);
}

function Kalemler({ baslik, not, kalemler }) {
  return (
    <>
      <span className="kalem-baslik">{baslik}{not && <small> ({not})</small>}</span>
      <ul className="liste kalemler">
        {kalemler.map((k, i) => (
          <li key={i}>
            <span>{k.item}{k.quantity > 1 ? ` × ${k.quantity}` : ""}</span>
            <b>{aralik(k.min, k.max)}</b>
          </li>
        ))}
      </ul>
    </>
  );
}

function MalzemeFiyati({ c }) {
  const parcalar = c.lines.filter((k) => k.kind === "parca");
  const aletler = c.lines.filter((k) => k.kind === "alet");
  return (
    <section className="beyaz-kart fiyat-kart">
      <div className="fiyat-ozet">
        <h3 className="bolum-baslik">Malzeme ve tahmini fiyat</h3>
        {parcalar.length > 0 && (
          <>
            <span className="kutu-etiket">Malzeme toplamı</span>
            <strong className="fiyat-toplam">{aralik(c.parts_min, c.parts_max)}</strong>
          </>
        )}
        {aletler.length > 0 && <span className="fiyat-alet">Alet gerekirse: +{aralik(c.tools_min, c.tools_max)}</span>}
        <p className="fiyat-not">
          {c.note} Fiyat tarihi: {new Date(c.price_date).toLocaleDateString("tr-TR")}.
        </p>
      </div>
      <div className="fiyat-kalemler">
        {parcalar.length > 0 && <Kalemler baslik="Malzemeler" kalemler={parcalar} />}
        {aletler.length > 0 && <Kalemler baslik="Aletler" not="evde varsa alma" kalemler={aletler} />}
        {c.unpriced?.length > 0 && <p className="fiyat-not">Fiyatı bilinmeyenler: {c.unpriced.join(", ")}</p>}
      </div>
    </section>
  );
}

// Önerimiz ve aciliyet aynı kalıpta: etiket, büyük değer, açıklama, altta ölçek
// tek: sadece kendi basamağı boyanır (öneri); değilse o basamağa kadar hepsi boyanır
function DurumKarti({ sinif, etiket, deger, aciklama, dolu, toplam, uclar, tek }) {
  return (
    <div className={`durum-karti ${sinif}`}>
      <div className="durum-karti-ust">
        <span className="kutu-etiket">{etiket}</span>
        <strong>{deger}</strong>
        {aciklama && <p>{aciklama}</p>}
      </div>
      <div aria-hidden="true">
        <div className="olcek" style={{ gridTemplateColumns: `repeat(${toplam}, minmax(0, 1fr))` }}>
          {Array.from({ length: toplam }, (_, i) => (
            <span key={i} className={(tek ? i + 1 === dolu : i < dolu) ? "etkin" : undefined} />
          ))}
        </div>
        <div className="olcek-uclar"><span>{uclar[0]}</span><span>{uclar[1]}</span></div>
      </div>
    </div>
  );
}

function Rapor({ r, fotoIpucu, onSifirla }) {
  const nedenler = r.possible_causes ?? [];
  const adimlar = r.steps ?? [];
  // Eski kayıtlarda malzemeler düz yazı olabilir
  const malzemeler = (r.parts_and_tools ?? []).map((p) => p.item ?? p);
  const maliyet = r.estimated_cost?.lines?.length ? r.estimated_cost : null;
  const [aciliyetAdi, aciliyetNotu] = ACILIYET[r.risk_level] ?? ["-", ""];
  const fotoNotu = r.confidence && r.confidence !== "yuksek" && fotoIpucu;
  const adimlaraGit = () => document.getElementById("ne-yapmalisin")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <>
      <div className="rapor-ust">
        <div className="rapor-etiketler">
          {r.category && <span className="etiket">{KATEGORI[r.category] ?? r.category}</span>}
          {r.confidence && <span className={`etiket guven-etiket ${r.confidence}`}>{GUVEN[r.confidence]}</span>}
        </div>
        <h2 className="rapor-baslik">{r.problem || "Değerlendirme"}</h2>
        {(adimlar.length > 0 || fotoNotu) && (
          <div className="rapor-ust-alt yazdirma-yok">
            {adimlar.length > 0 && (
              <button type="button" className="adima-git" onClick={adimlaraGit}>
                Ne yapmalısın?
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path d="M9 3v12M4 10l5 5 5-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            {fotoNotu && <span className="rapor-ust-not">Fotoğraf eklersen daha net söyleriz.</span>}
          </div>
        )}
      </div>

      {(r.recommendation || r.risk_level) && (
        <div className="durum-uclu">
          {r.recommendation && (
            <DurumKarti
              sinif={`oneri-kart ${r.recommendation}`}
              etiket="Önerimiz"
              deger={ONERI[r.recommendation]}
              aciklama={ONERI_ACIKLAMASI[r.recommendation]}
              dolu={OLCEK.findIndex(([kod]) => kod === r.recommendation) + 1}
              tek
              toplam={4}
              uclar={["Kendin yap", "Acil"]}
            />
          )}
          {r.risk_level && (
            <DurumKarti
              sinif="beyaz-kart"
              etiket="Ne kadar acil?"
              deger={aciliyetAdi}
              aciklama={r.risk_reason || aciliyetNotu}
              dolu={Object.keys(ACILIYET).indexOf(r.risk_level) + 1}
              toplam={4}
              uclar={["Acele yok", "Hemen"]}
            />
          )}
        </div>
      )}

      {nedenler.length > 0 && (
        <section className="beyaz-kart">
          <div className="neden-ust">
            <h3 className="bolum-baslik">Olası nedenler</h3>
            {nedenler.length > 1 && <span className="neden-isaret"><span aria-hidden="true" />En olası neden</span>}
          </div>
          <ul className="neden-izgara">
            {nedenler.map((n, i) => (
              <li key={i} className={i === 0 && nedenler.length > 1 ? "ilk" : undefined}>
                {i === 0 && nedenler.length > 1 && <span className="gizli-yazi">En olası: </span>}
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {adimlar.length > 0 && (
        <section className="beyaz-kart" id="ne-yapmalisin">
          <h3 className="bolum-baslik">Ne yapmalısın?</h3>
          <ol className="adim-listesi" style={{ "--satir": Math.ceil(adimlar.length / 2) }}>
            {adimlar.map((a, i) => (
              <li key={i}><span className="sira-no">{i + 1}</span><span>{a}</span></li>
            ))}
          </ol>
          {!maliyet && malzemeler.length > 0 && (
            <div className="etiketler malzeme-etiketleri">
              {malzemeler.map((m, i) => <span key={i} className="etiket">{m}</span>)}
            </div>
          )}
        </section>
      )}

      {r.safety_warning && (
        <div className="guvenlik">
          <span className="guvenlik-nokta" />
          <p><strong>Önce güvenlik:</strong> {r.safety_warning}</p>
        </div>
      )}

      {maliyet && <MalzemeFiyati c={maliyet} />}

      <Paylas metin={paylasMetni(r)} />
      <RaporSonu dugme="Başka bir sorunum var" onSifirla={onSifirla}>
        <p>Bu kesin bir teşhis değil, olası bir değerlendirmedir. Emin değilsen bir ustaya danış.</p>
      </RaporSonu>
    </>
  );
}

// Acil durumda sadece güvenlik adımları ve arama numaraları gösterilir
function AcilRapor({ r, onSifirla }) {
  const adimlar = r.steps ?? [];
  return (
    <>
      <section className="acil-kart">
        <span className="acil-etiket"><span className="acil-nokta" />Acil durum</span>
        <h2 className="rapor-baslik">Bu durum acil olabilir</h2>
        <p className="acil-kart-metin">{r.safety_warning || r.problem || "Hemen bir profesyonele ulaş."}</p>
        {adimlar.length > 0 && (
          <>
            <h3 className="bolum-baslik">Hemen yapılacaklar</h3>
            <SiraliListe ogeler={adimlar} />
          </>
        )}
        <div className="acil-cagri">
          {ACIL_NUMARALAR.map(([no, ad]) => (
            <a key={no} href={`tel:${no}`}>
              <strong>{no}</strong>
              <span>{ad}</span>
            </a>
          ))}
        </div>
      </section>
      <Paylas metin={paylasMetni(r)} />
      <RaporSonu dugme="Başka bir sorunum var" onSifirla={onSifirla}>
        <p>Bu kesin bir teşhis değil, olası bir değerlendirmedir. Emin değilsen bir ustaya danış.</p>
      </RaporSonu>
    </>
  );
}

export default function Ariza({ sorgu }) {
  const { setOturum } = useOturum();
  // Yeni iş ekranından arıza olarak gelen metin (#/ariza?metin=...)
  const [metin, setMetin] = useState(() => sorgu?.get("metin") ?? "");
  const [foto, setFoto] = useState(null); // { dosya, url }
  const [surukle, setSurukle] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState("");
  const [sorular, setSorular] = useState(null);
  const [cevaplar, setCevaplar] = useState([]);
  const [sonuc, setSonuc] = useState(null); // { rapor, fotoIpucu }
  const dosyaRef = useRef(null);
  const sonucRef = useRef(null);
  const raporId = sorgu?.get("rapor");
  const ses = useSesleAnlat({ metin, setMetin, setHata, maks: MAKS_METIN });

  // Geçmişten açılan rapor (#/ariza?rapor=12)
  useEffect(() => {
    if (!raporId) return;
    setHata("");
    istek(`/gecmis/${raporId}`)
      .then((v) => {
        setMetin(v.aciklama ?? "");
        setSorular(null);
        setSonuc({ rapor: v.rapor, fotoIpucu: false });
      })
      .catch((e) => {
        if (e.durum === 401) setOturum(null);
        setHata(e.message);
      });
  }, [raporId]);

  // Rapor ya da sorular gelince oraya kaydır
  useEffect(() => {
    if (sonuc || sorular) sonucRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [sonuc, sorular]);

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
    if (!metin.trim() && !foto) return setHata("Arızayı yaz ya da fotoğraf ekle.");
    ses.durdur();
    setHata("");
    setYukleniyor(true);
    try {
      const r = await istek("/analiz", {
        method: "POST",
        form: {
          aciklama: metin,
          foto: foto?.dosya,
          sorular: soruTuru ? sorular : [],
          cevaplar: soruTuru ? cevaplar.map((c) => c.trim() || "Bilmiyorum") : [],
        },
      });
      if (r.needs_more_info) {
        setSonuc(null);
        setSorular(r.questions);
        setCevaplar(r.questions.map(() => ""));
      } else {
        setSorular(null);
        setSonuc({ rapor: r, fotoIpucu: !foto });
      }
    } catch (e) {
      if (e.durum === 401) setOturum(null);
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
    setSonuc(null);
    setHata("");
    if (raporId || sorgu?.get("metin")) git("/ariza");
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <Sayfa sagDugme={<BolumMenusu secili="ariza" />}>
      <section className="ariza-giris yazdirma-yok">
        <h1 className="dev-baslik">Bir sorun mu var?</h1>
        <p>Arızayı bildir.<br />Ne olduğunu ve nasıl yapılacağını öğren.</p>
      </section>

      <section className="ariza-bildirme yazdirma-yok">
        <form
          className="ariza-form"
          onSubmit={(e) => {
            e.preventDefault();
            gonder(false);
          }}
        >
          <div className="ariza-form-ust">
            <label htmlFor="aciklama" className="ariza-form-baslik">Ne oldu?</label>
            <SesDugmesi ses={ses} />
          </div>
          <div className="metin-alani">
            <textarea
              id="aciklama"
              rows={4}
              maxLength={MAKS_METIN}
              value={metin}
              onChange={(e) => setMetin(e.target.value)}
              placeholder="Ne gördüğünü, ne zaman başladığını ve nerede olduğunu yaz."
            />
            <span className="sayac">{metin.length} / {MAKS_METIN}</span>
          </div>
          <div className="ornekler">
            <span className="ornekler-baslik">Ya da bir örnekle başla</span>
            <div className="etiketler">
              {ORNEKLER.map((o) => (
                <button key={o} type="button" className="ornek" onClick={() => setMetin(o)}>{o}</button>
              ))}
            </div>
          </div>
          {hata && !sorular && <p className="hata" role="alert">{hata}</p>}
          <button type="submit" className="dugme-koyu" disabled={yukleniyor}>
            {yukleniyor && !sorular ? "Analiz ediliyor..." : "Teşhis al"}
            <Ok renk="var(--mavi)" />
          </button>
        </form>

        <div
          className={`foto-kutu${surukle ? " uzerinde" : ""}${foto ? " dolu" : ""}`}
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
          {foto ? (
            <>
              <img className="foto-onizleme" src={foto.url} alt="Eklenen fotoğraf" />
              <span className="foto-adi">{foto.dosya.name}</span>
              <div className="foto-dugmeler">
                <button type="button" className="dugme-cizgili" onClick={() => dosyaRef.current.click()}>Değiştir</button>
                <button type="button" className="metin-dugme" onClick={fotoKaldir}>Kaldır</button>
              </div>
            </>
          ) : (
            <>
              <span className="foto-baslik">Fotoğraf ekle</span>
              <span className="foto-metin">İsteğe bağlı ama teşhisi netleştirir. Buraya sürükle ya da seç.</span>
              <button type="button" className="dugme-cizgili" onClick={() => dosyaRef.current.click()}>Dosya seç</button>
              <span className="foto-not">JPG, PNG veya WEBP, en fazla 5 MB</span>
            </>
          )}
          <input
            ref={dosyaRef}
            type="file"
            accept={FOTO_TURLERI.join(",")}
            hidden
            onChange={(e) => fotoSec(e.target.files[0])}
          />
        </div>
      </section>

      {(sorular || sonuc) && (
        <article className="rapor" ref={sonucRef}>
          {sorular ? (
            <SoruTuru
              sorular={sorular}
              cevaplar={cevaplar}
              setCevaplar={setCevaplar}
              onGonder={() => gonder(true)}
              yukleniyor={yukleniyor}
              hata={hata}
              okRengi="var(--mavi)"
              dugme="Cevapla ve teşhis al"
              bekleme="Analiz ediliyor..."
            />
          ) : sonuc.rapor.emergency ? (
            <AcilRapor r={sonuc.rapor} onSifirla={sifirla} />
          ) : (
            <Rapor r={sonuc.rapor} fotoIpucu={sonuc.fotoIpucu} onSifirla={sifirla} />
          )}
        </article>
      )}

    </Sayfa>
  );
}
