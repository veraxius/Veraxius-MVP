"use client";

import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { VeraxiusLogo } from "@/components/VeraxiusLogo";
import { UserAvatar } from "@/components/UserAvatar";
import { saveAuth, getAuth } from "@/lib/auth";
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

const STEP_LABELS = ["Account", "Profile", "Verify"] as const;

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gsiReady, setGsiReady] = useState(false);
  const hiddenGoogleRef = useRef<HTMLDivElement>(null);
  const googleRenderedRef = useRef(false);

  const [newUserId, setNewUserId] = useState<string | null>(null);

  const handleGoogleCredential = useCallback(
    async (response: GoogleCredentialResponse) => {
      const id_token = response.credential;
      if (!id_token) {
        setError("No credential received from Google");
        return;
      }
      if (!agreed) {
        setError("Please agree to the Terms of Service and Privacy Policy first");
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
        if (!res.ok) throw new Error(data?.error || "Google sign-in failed");
        const token = data.token || data.access_token;
        if (!token) throw new Error("Google sign-in succeeded but no token was returned");
        saveAuth(token, data.user, data.refresh_token);
        setNewUserId(data.user?.id ?? null);
        setStep(2);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Unexpected error");
      } finally {
        setLoading(false);
      }
    },
    [agreed],
  );

  const handleGoogleClick = () => {
    if (!agreed) {
      setError("Please agree to the Terms of Service and Privacy Policy first");
      return;
    }
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
    window.google.accounts.id.initialize({ client_id: clientId, callback: handleGoogleCredential });

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

    if (!agreed) {
      setError("Please agree to the Terms of Service and Privacy Policy");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Registration failed");
      const token = data.token || data.access_token;
      saveAuth(token, data.user, data.refresh_token);
      setNewUserId(data.user?.id ?? null);
      setStep(2);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  const me = getAuth()?.user;

  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={() => setGsiReady(true)} />

      <main
        className="vx-home-surface relative min-h-screen w-full min-w-0 flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8"
        style={{ color: "var(--text-primary)" }}
      >
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md min-w-0">
          <div className="flex items-center justify-center mb-6">
            <VeraxiusLogo variant="login" priority />
          </div>

          <div className="vx-auth-card rounded-2xl border border-[var(--divider)] bg-[var(--bg-panel)] p-5 sm:p-8 shadow-xl">
            <div className="mb-6 text-center">
              <h1 className="vx-h3">Create your account</h1>
              <p className="vx-body-sm mt-2">Start building your AIM in less than 2 minutes.</p>
            </div>

            <div className="mb-6 flex items-center justify-center gap-2 text-xs">
              {STEP_LABELS.map((label, i) => (
                <div key={label} className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold",
                      step === i + 1
                        ? "border-amber bg-amber text-[var(--text-on-amber)]"
                        : step > i + 1
                          ? "border-green text-green"
                          : "border-[var(--divider)] text-tertiary",
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className={step === i + 1 ? "font-medium" : "text-tertiary"}>{label}</span>
                  {i < STEP_LABELS.length - 1 && <span className="mx-1 text-tertiary">→</span>}
                </div>
              ))}
            </div>

            {step === 1 && (
              <>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="vx-mono-label text-amber">Full name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={cn(
                        "w-full rounded-lg border bg-transparent px-4 py-3 min-h-11 text-base sm:text-sm outline-none",
                        "border-[var(--divider)] focus:border-[var(--amber-border)]",
                        "text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]",
                      )}
                      placeholder="Your name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="vx-mono-label text-amber">Email address</label>
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
                  <div className="space-y-2">
                    <label className="vx-mono-label text-amber">Confirm password</label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={cn(
                        "w-full rounded-lg border bg-transparent px-4 py-3 min-h-11 text-base sm:text-sm outline-none",
                        "border-[var(--divider)] focus:border-[var(--amber-border)]",
                        "text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]",
                      )}
                      placeholder="••••••••"
                    />
                  </div>

                  <p className="text-xs text-tertiary">
                    We use enterprise-grade encryption to protect your data. Your data is never sold. You are in
                    control.
                  </p>

                  <label className="flex items-start gap-2 text-xs text-secondary">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>
                      I agree to the{" "}
                      <Link href="/terms" className="text-amber hover:underline">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link href="/privacy" className="text-amber hover:underline">
                        Privacy Policy
                      </Link>
                      .
                    </span>
                  </label>

                  <button
                    type="submit"
                    className={cn("vx-btn-primary w-full rounded-lg min-h-11 text-sm font-semibold", loading && "opacity-70")}
                    disabled={loading}
                  >
                    {loading ? "Creating account..." : "Create my account"}
                  </button>
                  {error && <p className="vx-body-sm text-red mt-2">{error}</p>}
                </form>

                <div className="my-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-[var(--divider)]" />
                  <span className="vx-body-sm text-[var(--text-tertiary)]">or</span>
                  <div className="h-px flex-1 bg-[var(--divider)]" />
                </div>

                <div className="relative">
                  <div ref={hiddenGoogleRef} className="absolute inset-0 h-0 overflow-hidden opacity-0 pointer-events-none" aria-hidden="true" />
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

                <div className="mt-6 text-center">
                  <span className="vx-body-sm">Already have an account? </span>
                  <Link href="/login" className="text-amber underline-offset-4 hover:underline">
                    Sign in
                  </Link>
                </div>
              </>
            )}

            {step === 2 && (
              <div className="space-y-5 text-center">
                <p className="vx-body-sm text-secondary">Add a profile picture so people recognize you (optional).</p>
                {newUserId && (
                  <div className="flex justify-center">
                    <UserAvatar
                      userId={newUserId}
                      name={me?.name}
                      email={me?.email}
                      size="lg"
                      editable
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="vx-btn-primary w-full rounded-lg min-h-11 text-sm font-semibold"
                >
                  Continue
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 text-center">
                <p className="vx-body-sm text-secondary">
                  Identity verification isn&apos;t available yet — you can skip this for now and add it later from
                  your profile once it launches.
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/home")}
                  className="vx-btn-primary w-full rounded-lg min-h-11 text-sm font-semibold"
                >
                  Finish — go to my feed
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
