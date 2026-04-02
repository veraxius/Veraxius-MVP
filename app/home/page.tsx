export default function HomePage() {
  return (
    <main
      className="min-h-screen flex items-center justify-center px-6 text-center"
      style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      <div className="max-w-2xl">
        <div className="vx-eyebrow-with-line justify-center mb-3">
          <span className="vx-eyebrow">Veraxius</span>
        </div>
        <h1 className="vx-h3 mb-3">Welcome</h1>
      </div>
    </main>
  );
}
