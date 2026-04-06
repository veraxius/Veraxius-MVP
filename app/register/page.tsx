"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { saveAuth } from "@/lib/auth";
import { API_URL } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Registration failed");
      }
      // auto-login
      saveAuth(data.token, data.user);
      router.push("/home");
    } catch (err: any) {
      setError(err?.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center px-6"
      style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-6">
          <Image
            src="/Veraxius Logo FINAL FINAL 2 Horizontal Version-02.png"
            alt="Veraxius"
            width={220}
            height={44}
            priority
            className="h-11 w-auto"
          />
        </div>
        <div className="rounded-2xl border border-[var(--divider)] bg-[var(--bg-panel)] p-8 shadow-xl">
          <div className="mb-8 text-center">
            <h1 className="vx-h3">Create account</h1>
            <p className="vx-body-sm mt-2 text-center">Sign up to get started</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="vx-mono-label text-amber">Name</label>
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
                placeholder="Your name"
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
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <label className="vx-mono-label text-amber">Password</label>
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
              {loading ? "Creating account..." : "Create account"}
            </button>
            {error && (
              <p className="vx-body-sm text-red mt-2">{error}</p>
            )}
          </form>

          <div className="mt-6 text-center">
            <span className="vx-body-sm">Already have an account? </span>
            <Link href="/login" className="text-amber underline-offset-4 hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
