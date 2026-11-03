import Ok from "./Ok.jsx";

// Arıza ve yeni iş raporlarının ortak parçaları

export function SiraliListe({ ogeler }) {
  return (
    <ol className="liste adimlar">
      {ogeler.map((o, i) => (
        <li key={i}><span className="sira-no">{i + 1}</span><span>{o}</span></li>
      ))}
    </ol>
  );
}

// WhatsApp'a kısa özet, PDF için tarayıcının yazdır penceresi
export function Paylas({ metin }) {
  return (
    <div className="paylas yazdirma-yok">
      <span className="paylas-baslik">Raporu paylaş</span>
      <button
        type="button"
        className="dugme-dolu"
        onClick={() => window.open("https://wa.me/?text=" + encodeURIComponent(metin), "_blank")}
      >
        WhatsApp'ta gönder
      </button>
      <button type="button" className="dugme-cizgili" onClick={() => window.print()}>PDF olarak kaydet</button>
    </div>
  );
}

export function RaporSonu({ children, dugme, onSifirla }) {
  return (
    <div className="rapor-son">
      <div className="rapor-son-not">{children}</div>
      <button type="button" className="dugme-cizgili yazdirma-yok" onClick={onSifirla}>{dugme}</button>
    </div>
  );
}

export function SoruTuru({ sorular, cevaplar, setCevaplar, onGonder, yukleniyor, hata, okRengi, dugme, bekleme }) {
  return (
    <form
      className="soru-karti yazdirma-yok"
      onSubmit={(e) => {
        e.preventDefault();
        onGonder();
      }}
    >
      <h2 className="bolum-baslik">Birkaç sorumuz var</h2>
      <p>Doğru değerlendirme için bunları bilmemiz gerekiyor. Bilmediğin soruyu boş bırakabilirsin.</p>
      {sorular.map((s, i) => (
        <div key={i} className="soru">
          <label htmlFor={`cevap${i}`}><span className="sira-no">{i + 1}</span><span>{s}</span></label>
          <input
            id={`cevap${i}`}
            type="text"
            placeholder="Cevabın"
            autoFocus={i === 0}
            value={cevaplar[i] ?? ""}
            onChange={(e) => setCevaplar(cevaplar.map((c, j) => (j === i ? e.target.value : c)))}
          />
        </div>
      ))}
      {hata && <p className="hata" role="alert">{hata}</p>}
      <button type="submit" className="dugme-koyu" disabled={yukleniyor}>
        {yukleniyor ? bekleme : dugme}
        <Ok renk={okRengi} />
      </button>
    </form>
  );
}

// WhatsApp metni: başlık, boş olmayan parçalar ve numaralı listeler
export const baslikliListe = (baslik, ogeler) =>
  ogeler?.length ? baslik + ":\n" + ogeler.map((o, i) => `${i + 1}. ${o}`).join("\n") : "";
export const birlestir = (parcalar) => ["Koz raporu", ...parcalar.filter(Boolean)].join("\n\n");

// Satır kırılırsa "– 21.300 TL" birlikte alt satıra geçer, tire satır sonunda kalmaz
// (\u2060 tireden sonra kırılmayı, \u00a0 sayı ile TL arasında kırılmayı engeller)
export const tl = (n) => n.toLocaleString("tr-TR") + "\u00a0TL";
export const aralik = (alt, ust) => (alt === ust ? tl(alt) : `${tl(alt)} –\u2060\u00a0${tl(ust)}`);
