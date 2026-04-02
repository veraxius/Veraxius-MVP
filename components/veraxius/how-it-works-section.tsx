"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const steps = [
  {
    number: "01",
    title: "Capture",
    icon: "⬡",
    description: "Collect real behavioral signals across sources. Not claims. Not summaries. Actual activity.",
    highlight: false,
  },
  {
    number: "02",
    title: "Align",
    icon: "⇄",
    description: "Standardize signals so they can be compared. Context is preserved. Noise is reduced.",
    highlight: false,
  },
  {
    number: "03",
    title: "Extract",
    icon: "◈",
    description: "Identify patterns that indicate reliability. Surface what matters. Ignore what doesn't.",
    highlight: false,
  },
  {
    number: "04",
    title: "Compute",
    icon: "◎",
    description: "AIM evaluates signal strength and consistency. Weak signals drop. Strong signals compound.",
    highlight: false,
  },
  {
    number: "05",
    title: "Learn",
    icon: "↻",
    description: "The system adapts continuously. New behavior updates the signal in real time.",
    highlight: false,
  },
  {
    number: "06",
    title: "Deliver",
    icon: "◉",
    description: "A clear integrity signal: score, confidence level, trend direction, and risk flags.",
    bullets: ["Score", "Confidence level", "Trend direction", "Risk flags"],
    highlight: true,
  },
];

export function HowItWorksSection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="vx-section"
      style={{ backgroundColor: "var(--bg-secondary)" }}
    >
      <div className="vx-container">

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="font-syne font-extrabold text-center"
          style={{ fontSize: "clamp(32px, 4vw, 52px)", lineHeight: "1.1", color: "var(--text-primary)" }}
        >
          From behavior to decision signal.
        </motion.h2>

        {/* Flow direction indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-6 flex items-center justify-center gap-2"
        >
          {["01", "02", "03", "04", "05", "06"].map((n, i) => (
            <span key={n} className="flex items-center gap-2">
              <span
                className="font-dm-mono text-[10px]"
                style={{ color: n === "06" ? "var(--amber)" : "var(--text-disabled)", letterSpacing: "0.1em" }}
              >
                {n}
              </span>
              {i < 5 && (
                <motion.span
                  className="font-dm-mono text-[10px]"
                  style={{ color: "var(--text-disabled)" }}
                  animate={isInView ? { x: [0, 2, 0], opacity: [0.4, 0.8, 0.4] } : {}}
                  transition={{ duration: 2, delay: i * 0.15 + 0.6, repeat: Infinity, ease: "easeInOut" }}
                >
                  →
                </motion.span>
              )}
            </span>
          ))}
        </motion.div>

        {/* Steps Grid */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-[2px]">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 * index, ease: [0.25, 0.1, 0.25, 1] }}
              className="vx-panel p-8 cursor-default relative overflow-hidden"
              style={{
                borderColor: step.highlight ? "var(--amber-border)" : "var(--divider)",
                transition: "border-color 0.25s ease",
                background: step.highlight ? "rgba(255,185,0,0.03)" : undefined,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--amber-border)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = step.highlight ? "var(--amber-border)" : "var(--divider)"; }}
            >
              {/* Accent top line for step 06 */}
              {step.highlight && (
                <div
                  className="absolute top-0 left-0 right-0 h-[1px]"
                  style={{ background: "linear-gradient(90deg, var(--amber) 0%, transparent 100%)" }}
                />
              )}

              {/* Header row */}
              <div className="flex items-center gap-3">
                <span className="font-dm-mono text-[11px]" style={{ color: "var(--amber)", minWidth: "20px" }}>
                  {step.number}
                </span>
                <span
                  className="font-dm-mono text-[13px]"
                  style={{ color: step.highlight ? "var(--amber)" : "var(--text-disabled)", opacity: step.highlight ? 0.9 : 0.5 }}
                >
                  {step.icon}
                </span>
                <h3
                  className="font-syne font-bold"
                  style={{
                    fontSize: step.highlight ? "22px" : "19px",
                    color: step.highlight ? "var(--amber)" : "var(--text-primary)",
                    textShadow: step.highlight ? "0 0 20px rgba(255,185,0,0.2)" : "none",
                  }}
                >
                  {step.title}
                </h3>
              </div>

              {/* Description */}
              <p
                className="font-dm-sans mt-3"
                style={{
                  fontSize: "14px",
                  lineHeight: "1.6",
                  color: step.highlight ? "var(--text-secondary)" : "var(--text-tertiary)",
                }}
              >
                {step.description}
              </p>

              {/* Bullet list for step 06 */}
              {step.bullets && (
                <ul className="mt-3 space-y-1" style={{ listStyle: "none", padding: 0 }}>
                  {step.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2 font-dm-mono text-[11px]" style={{ color: "var(--amber)", letterSpacing: "0.08em" }}>
                      <span style={{ opacity: 0.6 }}>·</span>
                      {b}
                    </li>
                  ))}
                </ul>
              )}

              {/* "Ready for decisions" tag on step 06 */}
              {step.highlight && (
                <div className="mt-4">
                  <span
                    className="font-dm-mono text-[10px] uppercase px-3 py-1"
                    style={{
                      letterSpacing: "0.14em",
                      color: "var(--green)",
                      border: "1px solid rgba(0,200,100,0.25)",
                      background: "rgba(0,200,100,0.05)",
                      borderRadius: "2px",
                    }}
                  >
                    Ready for decisions. Not interpretation.
                  </span>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Closing line */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.75, ease: [0.25, 0.1, 0.25, 1] }}
          className="font-dm-sans text-center mt-12 max-w-2xl mx-auto"
          style={{ fontSize: "15px", lineHeight: "1.7", color: "var(--text-tertiary)" }}
        >
          No guesswork. No assumptions. Only verified behavioral signal.{" "}
          <span style={{ color: "var(--amber)" }}>
            Integrity is no longer a subjective impression. It becomes a system output.
          </span>
        </motion.p>

      </div>
    </section>
  );
}
