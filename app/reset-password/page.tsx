"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { VeraxiusLogo } from "@/components/VeraxiusLogo";
import { API_URL } from "@/lib/api";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!token || !email) {
      setError("Invalid or expired reset link");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Invalid or expired reset link");
      }
      setSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid or expired reset link";
      setError(message);
    } finally {
      setLoading(false);
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
            <h1 className="vx-h3">Reset password</h1>
            <p className="vx-body-sm mt-2 text-center">Choose a new password for your account</p>
          </div>

          {success ? (
            <div className="text-center space-y-4">
              <p className="vx-body-sm text-[var(--text-secondary)]">
                Your password has been reset successfully.
              </p>
              <Link href="/login" className="text-amber underline-offset-4 hover:underline vx-body-sm">
                Sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="vx-mono-label text-amber">New password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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
                  minLength={6}
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

              <button
                type="submit"
                className={cn(
                  "vx-btn-primary w-full rounded-lg min-h-11 text-sm font-semibold",
                  loading && "opacity-70",
                )}
                disabled={loading}
              >
                {loading ? "Resetting..." : "Reset password"}
              </button>

              {error && (
                <div className="text-center space-y-2">
                  <p className="vx-body-sm text-red">{error}</p>
                  <Link
                    href="/forgot-password"
                    className="text-amber underline-offset-4 hover:underline vx-body-sm"
                  >
                    Request a new reset link
                  </Link>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main
          className="min-h-screen w-full flex items-center justify-center"
          style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}
        >
          <p className="text-sm text-[var(--text-tertiary)]">Loading…</p>
        </main>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
