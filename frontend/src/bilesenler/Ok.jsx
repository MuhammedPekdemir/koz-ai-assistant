// Koyu düğmelerin sağındaki ok kutusu
export default function Ok({ renk }) {
  return (
    <span className="ok" style={{ background: renk }}>
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path d="M3 9h12M10 4l5 5-5 5" stroke="#17191C" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
