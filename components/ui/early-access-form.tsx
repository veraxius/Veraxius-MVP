"use client";

import { useState } from "react";

type FormState = {
  name: string;
  email: string;
  company: string;
  role: string;
  message: string;
};

const initialState: FormState = { name: "", email: "", company: "", role: "", message: "" };

export function EarlyAccessForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [feedback, setFeedback] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setFeedback("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setFeedback(data.error || "Something went wrong.");
        return;
      }
      setStatus("success");
      setFeedback("Request received. We will be in touch.");
      setForm(initialState);
    } catch {
      setStatus("error");
      setFeedback("Network error. Please try again.");
    }
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form onSubmit={onSubmit} className="mt-10 grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <input className="vx-input" placeholder="Full name" value={form.name} onChange={(e) => update("name", e.target.value)} required />
        <input className="vx-input" placeholder="Email address" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <input className="vx-input" placeholder="Company or organization" value={form.company} onChange={(e) => update("company", e.target.value)} />
        <input className="vx-input" placeholder="Role" value={form.role} onChange={(e) => update("role", e.target.value)} />
      </div>
      <textarea className="vx-textarea" placeholder="What decision environment are you trying to improve?" value={form.message} onChange={(e) => update("message", e.target.value)} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="submit" disabled={status === "loading"} className="inline-flex items-center justify-center rounded-full bg-vx-amber px-5 py-3 text-sm font-semibold text-vx-bg transition-all hover:bg-vx-amberHover disabled:cursor-not-allowed disabled:opacity-60">
          {status === "loading" ? "Submitting..." : "Request Early Access"}
        </button>
        <div className="text-sm text-white/55">No spam. No bloated funnel. Just signal.</div>
      </div>
      {feedback ? <div className={`rounded-xl border px-4 py-3 text-sm ${status === "success" ? "border-vx-green/20 bg-vx-green/10 text-vx-green" : "border-vx-red/20 bg-vx-red/10 text-vx-red"}`}>{feedback}</div> : null}
    </form>
  );
}
