import { useEffect, useRef, useState } from "react";
import { git } from "../App.jsx";

// ElevenLabs'teki "Koz Yönlendirici" asistanı. Herkese açık asistan olduğu için
// API anahtarı gerekmez; anahtar hiçbir zaman tarayıcıya gelmez.
const ASISTAN_ID = "agent_0601m6n8cyj6ey1apk6sbmg2rrn6";

const BOLUMLER = { ariza: "/ariza", yeni_is: "/yeni-is" };

const DURUM_YAZISI = {
  bos: "Konuşarak anlat",
  baglaniyor: "Bağlanıyor...",
  dinliyor: "Seni dinliyorum",
  konusuyor: "Koz konuşuyor",
};

export default function KonusarakAnlat() {
  const [durum, setDurum] = useState("bos");
  const [hata, setHata] = useState("");
  const gorusmeRef = useRef(null);

  // Sayfadan çıkınca görüşme kapanır
  useEffect(() => () => gorusmeRef.current?.endSession(), []);

  async function bitir() {
    const g = gorusmeRef.current;
    gorusmeRef.current = null;
    setDurum("bos");
    await g?.endSession().catch(() => {});
  }

  async function baslat() {
    if (gorusmeRef.current) return bitir();
    setHata("");
    setDurum("baglaniyor");
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setDurum("bos");
      return setHata("Mikrofon izni verilmedi. Tarayıcının adres çubuğundan izin verebilirsin.");
    }
    try {
      // Paket büyük; sadece düğmeye basınca yüklenir, ana sayfa hızlı açılır
      const { Conversation } = await import("@elevenlabs/client");
      gorusmeRef.current = await Conversation.startSession({
        agentId: ASISTAN_ID,
        connectionType: "webrtc",
        clientTools: {
          yonlendir: async ({ bolum, aciklama }) => {
            const yol = BOLUMLER[bolum];
            if (!yol) return "Bilinmeyen bölüm";
            await bitir();
            git(`${yol}?metin=${encodeURIComponent(aciklama ?? "")}`);
            return "Yönlendirildi";
          },
        },
        onModeChange: ({ mode }) => {
          if (gorusmeRef.current) setDurum(mode === "speaking" ? "konusuyor" : "dinliyor");
        },
        onConnect: () => setDurum("konusuyor"),
        onDisconnect: () => {
          gorusmeRef.current = null;
          setDurum("bos");
        },
        onError: () => setHata("Bağlantıda sorun oldu, tekrar dene."),
      });
    } catch {
      gorusmeRef.current = null;
      setDurum("bos");
      setHata("Asistana bağlanılamadı, biraz sonra tekrar dene.");
    }
  }

  const acik = durum !== "bos";
  return (
    <section className="konusarak-bolum">
      <div className="konusarak-metin">
        <h2 className="ikincil-baslik">Söyle, Koz yönlendirsin.</h2>
        {hata ? (
          <p className="hata">{hata}</p>
        ) : (
          <p className="konusarak-not">
            {acik
              ? "Bitirmek için düğmeye tekrar dokun."
              : "Canlı sesli asistan dinler, seni hemen doğru bölüme yönlendirir."}
          </p>
        )}
      </div>
      <button
        type="button"
        className={`konusarak-dugme ${durum}`}
        onClick={baslat}
        disabled={durum === "baglaniyor"}
        aria-pressed={acik}
      >
        <span className="konusarak-nokta" aria-hidden="true" />
        {DURUM_YAZISI[durum]}
        {acik && <span className="konusarak-bitir">Bitir</span>}
      </button>
    </section>
  );
}
