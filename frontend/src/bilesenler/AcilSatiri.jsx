const NUMARALAR = [
  ["112", "Acil çağrı"],
  ["187", "Doğalgaz"],
  ["186", "Elektrik"],
];

export default function AcilSatiri() {
  return (
    <section className="acil">
      <div className="acil-metin">
        <span className="acil-etiket"><span className="acil-nokta" />Acil durum</span>
        <p><strong>Gaz kokusu, kıvılcım ya da su baskını mı var?</strong> Beklemeden ara.</p>
      </div>
      <div className="acil-numaralar">
        {NUMARALAR.map(([no, ad]) => (
          <a key={no} href={`tel:${no}`} className="acil-numara">
            <strong>{no}</strong>
            <span>{ad}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
