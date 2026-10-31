import { git } from "../App.jsx";
import { ONERI, kisaTarih } from "../metinler.js";

// Geçmiş rapor satırları; ana sayfa ve Hesabım ikisi de kullanır
export default function GecmisListesi({ raporlar }) {
  return (
    <ul className="gecmis">
      {raporlar.map((r) => (
        <li key={r.id}>
          <button type="button" onClick={() => git(`/ariza?rapor=${r.id}`)}>
            <span className="gecmis-baslik">{r.problem}</span>
            {r.acil || r.oneri === "acil_profesyonel" ? (
              <span className="gecmis-acil">Acil</span>
            ) : (
              <span className="gecmis-not">{ONERI[r.oneri] ?? "Rapor"} · {kisaTarih(r.zaman)}</span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
