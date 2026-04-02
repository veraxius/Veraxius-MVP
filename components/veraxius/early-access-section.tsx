"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";

const benefits = [
  "Direct integration support",
  "Priority API access",
  "Influence on system design",
];

const targets = ["HR Tech", "Investment Funds", "Enterprise Hiring", "Verification Platforms"];

export function EarlyAccessSection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [focused, setFocused] = useState(false);

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }
    setStatus("submitting");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: "" }),
      });
      if (response.ok) {
        setStatus("success");
        setMessage("Application received. We will be in touch.");
      } else {
        throw new Error("Failed to submit");
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  };

  return (
    <section
      ref={sectionRef}
      id="early-access"
      className="vx-section"
      style={{ backgroundColor: "var(--bg-secondary)" }}
    >
      <div className="vx-container">
        <div className="max-w-[600px] mx-auto text-center">

          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="font-dm-mono text-[11px] uppercase"
            style={{ letterSpacing: "0.18em", color: "var(--amber)" }}
          >
            LIMITED ACCESS
          </motion.div>

          {/* Headline */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.08, ease: [0.25, 0.1, 0.25, 1] }}
            className="font-syne font-extrabold mt-4"
            style={{
              fontSize: "clamp(28px, 4vw, 48px)",
              lineHeight: "1.1",
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
            }}
          >
            Access the layer before it becomes standard.
          </motion.h2>

          {/* Subline */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="mt-5"
          >
            <p
              className="font-syne font-semibold"
              style={{ fontSize: "clamp(15px, 1.6vw, 18px)", color: "var(--text-secondary)", lineHeight: "1.4" }}
            >
              Early partners shape the system.
            </p>
            <p
              className="font-syne font-semibold"
              style={{ fontSize: "clamp(15px, 1.6vw, 18px)", color: "var(--text-tertiary)", lineHeight: "1.4" }}
            >
              Late adopters adapt to it.
            </p>
          </motion.div>

          {/* "Small number of high-signal teams" */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.24 }}
            className="font-dm-mono text-[11px] mt-5"
            style={{ letterSpacing: "0.06em", color: "var(--text-secondary)" }}
          >
            We are onboarding a small number of high-signal teams.
          </motion.p>

          {/* Benefits */}
          <motion.ul
            initial={{ opacity: 0, y: 12 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.32 }}
            className="mt-8 space-y-2 inline-block text-left"
            style={{ listStyle: "none", padding: 0 }}
          >
            {benefits.map((benefit, i) => (
              <li
                key={i}
                className="flex items-center gap-3 font-dm-sans"
                style={{ fontSize: "14px", lineHeight: "1.55", color: "var(--text-tertiary)" }}
              >
                <span style={{ color: "var(--amber)", opacity: 0.7, fontSize: "10px", flexShrink: 0 }}>▸</span>
                {benefit}
              </li>
            ))}
          </motion.ul>

          {/* Target strip */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-8 flex flex-wrap justify-center items-center gap-x-1 gap-y-1"
          >
            <span
              className="font-dm-mono text-[10px] uppercase mr-2"
              style={{ letterSpacing: "0.14em", color: "var(--text-secondary)" }}
            >
              Built for:
            </span>
            {targets.map((t, i) => (
              <span key={t} className="flex items-center">
                <span className="font-dm-mono text-[11px]" style={{ color: "var(--amber)", opacity: 1 }}>{t}</span>
                {i < targets.length - 1 && (
                  <span className="mx-2 font-dm-mono text-[10px]" style={{ color: "var(--divider)" }}>•</span>
                )}
              </span>
            ))}
          </motion.div>

          {/* Urgency cue */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.46 }}
            className="mt-5"
          >
            <span
              className="font-dm-mono text-[10px] px-3 py-1"
              style={{
                letterSpacing: "0.12em",
                color: "var(--amber)",
                border: "1px solid var(--amber-border)",
                background: "rgba(255,185,0,0.05)",
                borderRadius: "2px",
              }}
            >
              Limited rollout — accepting initial partners
            </span>
          </motion.div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.52, ease: [0.25, 0.1, 0.25, 1] }}
            className="mt-8 max-w-[480px] mx-auto"
          >
            {status === "success" ? (
              <div
                className="font-dm-mono text-center py-6"
                style={{ color: "var(--green)", fontSize: "13px", letterSpacing: "0.06em" }}
              >
                {message}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-[2px]">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="Work email only"
                  className="flex-1 font-dm-sans px-4 py-4 outline-none transition-colors"
                  style={{
                    backgroundColor: "var(--bg-panel)",
                    color: "var(--text-primary)",
                    border: "1px solid",
                    borderColor: focused ? "var(--amber-border)" : "var(--divider)",
                    fontSize: "14px",
                  }}
                />
                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="font-dm-mono font-semibold text-[12px] uppercase px-8 py-4 transition-all disabled:opacity-50"
                  style={{
                    letterSpacing: "0.12em",
                    backgroundColor: "var(--amber)",
                    color: "var(--bg-primary)",
                    boxShadow: "0 0 24px rgba(255,185,0,0.25)",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 0 36px rgba(255,185,0,0.4)";
                    e.currentTarget.style.filter = "brightness(1.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "0 0 24px rgba(255,185,0,0.25)";
                    e.currentTarget.style.filter = "brightness(1)";
                  }}
                >
                  {status === "submitting" ? "Submitting..." : "Apply for Access"}
                </button>
              </form>
            )}

            {status === "error" && (
              <p
                className="font-dm-mono text-center mt-3"
                style={{ fontSize: "12px", color: "var(--red)" }}
              >
                {message}
              </p>
            )}
          </motion.div>

          {/* Below CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.62 }}
            className="mt-4"
          >
            <p
              className="font-dm-mono text-[11px]"
              style={{ color: "var(--text-secondary)", letterSpacing: "0.06em", lineHeight: "1.8" }}
            >
              We review every request.
            </p>
            <p
              className="font-dm-mono text-[11px]"
              style={{ color: "var(--text-secondary)", letterSpacing: "0.06em" }}
            >
              Access is limited.
            </p>
          </motion.div>

          {/* Trust micro-signals */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="mt-6 flex items-center justify-center gap-4"
          >
            {["Enterprise-ready", "Secure by design"].map((label, i) => (
              <span
                key={i}
                className="font-dm-mono text-[10px] uppercase"
                style={{ letterSpacing: "0.12em", color: "var(--text-secondary)", opacity: 0.9 }}
              >
                {i > 0 && <span className="mr-4" style={{ color: "var(--divider)" }}>·</span>}
                {label}
              </span>
            ))}
          </motion.div>

        </div>
      </div>
    </section>
  );
}
