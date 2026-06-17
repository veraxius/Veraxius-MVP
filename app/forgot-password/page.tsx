"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { VeraxiusLogo } from "@/components/VeraxiusLogo";
import { API_URL } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      // Always show success to prevent email enumeration
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <main
      className="relative min-h-screen w-full min-w-0 flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8"
      style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md min-w-0">
        <div className="flex items-center justify-center mb-6">
          <VeraxiusLogo variant="login" priority />
        </div>
        <div className="rounded-2xl border border-[var(--divider)] bg-[var(--bg-panel)] p-5 sm:p-8 shadow-xl">
          <div className="mb-8 text-center">
            <h1 className="vx-h3">Forgot password</h1>
            <p className="vx-body-sm mt-2 text-center">
              Enter your email and we&apos;ll send you a reset link
            </p>
          </div>

          {submitted ? (
            <p className="vx-body-sm text-center text-[var(--text-secondary)]">
              If that email exists, check your inbox for a reset link
            </p>
          ) : (
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

              <button
                type="submit"
                className={cn(
                  "vx-btn-primary w-full rounded-lg min-h-11 text-sm font-semibold",
                  loading && "opacity-70",
                )}
                disabled={loading}
              >
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link href="/login" className="text-amber underline-offset-4 hover:underline vx-body-sm">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
