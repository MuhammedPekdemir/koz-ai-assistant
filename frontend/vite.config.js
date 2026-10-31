import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Geliştirme sırasında backend istekleri FastAPI'ye (8000) yönlendirilir
const backend = "http://127.0.0.1:8000";
const uclar = ["/analiz", "/yeni-islem", "/gecmis", "/kayit", "/giris", "/cikis", "/profil"];

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: Object.fromEntries(uclar.map((u) => [u, backend])),
  },
});
