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
        <h2 className="vx-h4 mb-4">We are still building the page</h2>
        <div className="flex items-center justify-center">
          <img
            src="/computer-cat.gif"
            alt="Working at full speed"
            className="rounded-lg border border-[var(--divider)] max-h-72 w-auto"
          />
        </div>
      </div>
    </main>
  );
}
