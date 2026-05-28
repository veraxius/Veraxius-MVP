"use client";

import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { saveAuth } from "@/lib/auth";
import { API_URL } from "@/lib/api";
import type { GoogleCredentialResponse } from "@/types/google-identity";

function GoogleLogo() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48" className="shrink-0">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.56 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.16 7.12-10.27 7.12-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gsiReady, setGsiReady] = useState(false);
  const hiddenGoogleRef = useRef<HTMLDivElement>(null);
  const googleRenderedRef = useRef(false);

  const handleGoogleCredential = useCallback(
    async (response: GoogleCredentialResponse) => {
      const id_token = response.credential;
      if (!id_token) {
        setError("No credential received from Google");
        return;
      }

      setError(null);
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_token }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "Google sign-in failed");
        }
        const token = data.token || data.access_token;
        if (!token) {
          throw new Error("Google sign-in succeeded but no token was returned");
        }
        saveAuth(token, data.user, data.refresh_token);
        router.push("/home");
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unexpected error";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  const handleGoogleClick = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError("Google sign-in is not configured");
      return;
    }
    if (!gsiReady || !window.google?.accounts?.id) {
      setError("Google sign-in is still loading. Please try again.");
      return;
    }

    setError(null);

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleCredential,
    });

    const container = hiddenGoogleRef.current;
    if (!container) return;

    if (!googleRenderedRef.current) {
      window.google.accounts.id.renderButton(container, {
        theme: "outline",
        size: "large",
        text: "continue_with",
        width: container.offsetWidth || 400,
      });
      googleRenderedRef.current = true;
    }

    const innerBtn = container.querySelector('[role="button"]') as HTMLElement | null;
    innerBtn?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Login failed");
      }
      const token = data.token || data.access_token;

      if (!token) {
        throw new Error("Login succeeded but no token was returned");
      }

      saveAuth(token, data.user, data.refresh_token);
      router.push("/home");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setGsiReady(true)}
      />

      <main
        className="min-h-screen w-full min-w-0 flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8"
        style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}
      >
        <div className="w-full max-w-md min-w-0">
          <div className="flex items-center justify-center mb-6">
            <Image
              src="/Veraxius Logo FINAL FINAL 2 Horizontal Version-02.png"
              alt="Veraxius"
              width={220}
              height={44}
              priority
              className="h-8 w-auto sm:h-10 md:h-11 max-w-[min(100%,220px)]"
            />
          </div>
          <div className="rounded-2xl border border-[var(--divider)] bg-[var(--bg-panel)] p-5 sm:p-8 shadow-xl">
            <div className="mb-8 text-center">
              <h1 className="vx-h3">Sign in</h1>
              <p className="vx-body-sm mt-2 text-center">Access your account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="vx-mono-label text-amber">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn(
                    "w-full rounded-lg border bg-transparent px-4 py-3 min-h-11 text-base sm:text-sm outline-none",
                    "border-[var(--divider)] focus:border-[var(--amber-border)]",
                    "text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]",
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
                    "w-full rounded-lg border bg-transparent px-4 py-3 min-h-11 text-base sm:text-sm outline-none",
                    "border-[var(--divider)] focus:border-[var(--amber-border)]",
                    "text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]",
                  )}
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                className={cn(
                  "vx-btn-primary w-full rounded-lg min-h-11 text-sm font-semibold",
                  loading && "opacity-70",
                )}
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-[var(--divider)]" />
              <span className="vx-body-sm text-[var(--text-tertiary)]">or</span>
              <div className="h-px flex-1 bg-[var(--divider)]" />
            </div>

            <div className="relative">
              <div
                ref={hiddenGoogleRef}
                className="absolute inset-0 h-0 overflow-hidden opacity-0 pointer-events-none"
                aria-hidden="true"
              />
              <button
                type="button"
                onClick={handleGoogleClick}
                disabled={loading}
                className={cn(
                  "w-full rounded-lg border text-sm font-semibold min-h-11",
                  "flex items-center justify-center gap-3",
                  "bg-[var(--bg-panel)] border-[var(--divider)] text-[var(--text-primary)]",
                  "px-4 sm:px-8 py-3 sm:py-4 transition-opacity hover:opacity-90",
                  loading && "opacity-70 cursor-not-allowed",
                )}
              >
                <GoogleLogo />
                Continue with Google
              </button>
            </div>

            {error && <p className="vx-body-sm text-red mt-4">{error}</p>}

            <div className="mt-6 text-center">
              <span className="vx-body-sm">Don’t have an account? </span>
              <Link href="/register" className="text-amber underline-offset-4 hover:underline">
                Create account
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
