import Sayfa from "../bilesenler/Sayfa.jsx";

// Henüz kodlanmamış ekranlar için geçici sayfa
export default function Yakinda({ baslik }) {
  return (
    <Sayfa>
      <section className="kart beyaz">
        <h2 className="kart-baslik">{baslik}</h2>
        <p className="aciklama">Bu ekran sonraki adımda gelecek.</p>
        <a href="#/">Ana sayfaya dön</a>
      </section>
    </Sayfa>
  );
}
