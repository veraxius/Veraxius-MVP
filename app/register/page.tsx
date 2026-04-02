"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      router.push("/home");
    }, 700);
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center px-6"
      style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-[var(--divider)] bg-[var(--bg-panel)] p-8 shadow-xl">
          <div className="mb-8 text-center">
            <div className="vx-eyebrow-with-line justify-center mb-3">
              <span className="vx-eyebrow">Veraxius</span>
            </div>
            <h1 className="vx-h3">Crear cuenta</h1>
            <p className="vx-body-sm mt-2 text-center">Registrate para comenzar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="vx-mono-label text-amber">Nombre</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={cn(
                  "w-full rounded-lg border bg-transparent px-4 py-3 outline-none",
                  "border-[var(--divider)] focus:border-[var(--amber-border)]",
                  "text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                )}
                placeholder="Tu nombre"
              />
            </div>
            <div className="space-y-2">
              <label className="vx-mono-label text-amber">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cn(
                  "w-full rounded-lg border bg-transparent px-4 py-3 outline-none",
                  "border-[var(--divider)] focus:border-[var(--amber-border)]",
                  "text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                )}
                placeholder="tu@correo.com"
              />
            </div>
            <div className="space-y-2">
              <label className="vx-mono-label text-amber">Contraseña</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(
                  "w-full rounded-lg border bg-transparent px-4 py-3 outline-none",
                  "border-[var(--divider)] focus:border-[var(--amber-border)]",
                  "text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                )}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className={cn(
                "vx-btn-primary w-full rounded-lg text-sm font-semibold",
                loading && "opacity-70"
              )}
              disabled={loading}
            >
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <span className="vx-body-sm">¿Ya tenés cuenta? </span>
            <Link href="/login" className="text-amber underline-offset-4 hover:underline">
              Iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
