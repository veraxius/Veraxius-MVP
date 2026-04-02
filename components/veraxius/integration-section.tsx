"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const integrationCards = [
  {
    number: "01",
    title: "API",
    subhead: "Integrate integrity signals directly into your workflows.",
    bullets: [
      "Real-time and batch access",
      "Event-driven updates",
      "Built for scale",
    ],
    highlight: false,
  },
  {
    number: "02",
    title: "Dashboard",
    subhead: "See and understand integrity signals instantly.",
    bullets: [
      "Explore entities and patterns",
      "Track changes over time",
      "Export insights when needed",
    ],
    highlight: false,
  },
  {
    number: "03",
    title: "Decision Layer",
    subhead: "Embed integrity into every decision.",
    bullets: [
      "Set thresholds",
      "Automate actions",
      "Reduce manual review",
    ],
    highlight: true,
  },
];

const useCases = ["Hiring", "Investment", "Partnerships", "Platforms", "Compliance"];

export function IntegrationSection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      ref={sectionRef}
      id="integration"
      className="vx-section"
      style={{ backgroundColor: "var(--bg-secondary)" }}
    >
      <div className="vx-container">

        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="font-dm-mono text-[11px] uppercase text-center"
          style={{ letterSpacing: "0.18em", color: "var(--amber)" }}
        >
          INTEGRATION
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.08, ease: [0.25, 0.1, 0.25, 1] }}
          className="font-syne font-extrabold text-center mt-4"
          style={{
            fontSize: "clamp(32px, 4vw, 52px)",
            lineHeight: "1.1",
            color: "var(--text-primary)",
          }}
        >
          Built to integrate.
        </motion.h2>

        {/* Subline */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.16 }}
          className="mt-5 text-center"
        >
          <p
            className="font-syne font-semibold"
            style={{ fontSize: "clamp(16px, 1.8vw, 20px)", color: "var(--text-primary)", lineHeight: "1.4" }}
          >
            No rebuild required.
          </p>
          <p
            className="font-dm-sans mt-1"
            style={{ fontSize: "16px", color: "var(--text-tertiary)", lineHeight: "1.5" }}
          >
            <span style={{ textShadow: "0 0 18px rgba(255,185,0,0.18)", color: "var(--text-secondary)" }}>Veraxius plugs into your existing systems.</span>
          </p>
        </motion.div>

        {/* Deploy label */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.26 }}
          className="mt-12 mb-6 flex items-center justify-center gap-3"
        >
          <div className="h-px w-10" style={{ background: "var(--amber)", opacity: 0.4 }} />
          <span
            className="font-dm-mono text-[11px] uppercase"
            style={{ letterSpacing: "0.16em", color: "var(--text-primary)" }}
          >
            Deploy without disruption.
          </span>
          <div className="h-px w-10" style={{ background: "var(--amber)", opacity: 0.4 }} />
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {integrationCards.map((card, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 24 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.55,
                delay: 0.3 + index * 0.1,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              className="vx-panel p-8 cursor-default flex flex-col relative"
              style={{
                borderTop: card.highlight ? "2px solid var(--amber)" : "2px solid transparent",
                background: card.highlight ? "rgba(255,185,0,0.03)" : undefined,
                transition: "border-color 0.25s ease, background 0.25s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderTopColor = "var(--amber)";
                if (!card.highlight) e.currentTarget.style.background = "rgba(255,185,0,0.02)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderTopColor = card.highlight ? "var(--amber)" : "transparent";
                if (!card.highlight) e.currentTarget.style.background = "";
              }}
            >
              {/* Top accent line for Decision Layer */}
              {card.highlight && (
                <div
                  className="absolute top-0 left-0 right-0 h-[1px]"
                  style={{ background: "linear-gradient(90deg, var(--amber) 0%, transparent 80%)" }}
                />
              )}

              {/* Number */}
              <span
                className="font-dm-mono text-[11px] mb-4 block"
                style={{ color: "var(--amber)", opacity: 0.6, letterSpacing: "0.1em" }}
              >
                {card.number}
              </span>

              {/* Title */}
              <h3
                className="font-syne font-bold"
                style={{
                  fontSize: card.highlight ? "21px" : "19px",
                  color: card.highlight ? "var(--amber)" : "var(--text-primary)",
                  textShadow: card.highlight ? "0 0 20px rgba(255,185,0,0.18)" : "none",
                  letterSpacing: "-0.01em",
                }}
              >
                {card.title}
              </h3>

              {/* Subhead */}
              <p
                className="font-dm-sans mt-3"
                style={{
                  fontSize: "13px",
                  lineHeight: "1.55",
                  color: card.highlight ? "var(--text-secondary)" : "var(--text-tertiary)",
                  fontStyle: "italic",
                }}
              >
                {card.subhead}
              </p>

              {/* Bullets */}
              <ul className="mt-4 space-y-2 flex-1" style={{ listStyle: "none", padding: 0 }}>
                {card.bullets.map((bullet, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 font-dm-sans"
                    style={{ fontSize: "13px", lineHeight: "1.55", color: "var(--text-tertiary)" }}
                  >
                    <span style={{ color: "var(--amber)", opacity: 0.55, flexShrink: 0, fontSize: "10px", marginTop: "4px" }}>▸</span>
                    {bullet}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Flow connector — API → Dashboard → Decision Layer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.65 }}
          className="mt-6 flex items-center justify-center gap-2"
        >
          {["API", "Dashboard", "Decision Layer"].map((label, i) => (
            <span key={label} className="flex items-center gap-2">
              <span
                className="font-dm-mono text-[10px]"
                style={{
                  color: label === "Decision Layer" ? "var(--amber)" : "var(--text-secondary)",
                  letterSpacing: "0.1em",
                  opacity: label === "Decision Layer" ? 1 : 0.85,
                }}
              >
                {label}
              </span>
              {i < 2 && (
                <span className="font-dm-mono text-[10px]" style={{ color: "var(--text-secondary)", opacity: 0.75 }}>
                  →
                </span>
              )}
            </span>
          ))}
        </motion.div>

        {/* Use cases strip */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.72 }}
          className="mt-10 flex flex-wrap justify-center items-center gap-x-1 gap-y-2"
        >
          <span
            className="font-dm-mono text-[11px] mr-2"
            style={{ color: "var(--text-secondary)", letterSpacing: "0.12em", textTransform: "uppercase" }}
          >
            Used across:
          </span>
          {useCases.map((useCase, index) => (
            <span key={index} className="flex items-center">
              <span
                className="font-dm-mono text-[12px]"
                style={{ color: "var(--amber)", opacity: 1 }}
              >
                {useCase}
              </span>
              {index < useCases.length - 1 && (
                <span className="mx-2 font-dm-mono text-[11px]" style={{ color: "var(--divider)" }}>
                  •
                </span>
              )}
            </span>
          ))}
        </motion.div>

        {/* Closing statement */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
          className="mt-14 text-center"
        >
          <div className="w-8 h-px mx-auto mb-8" style={{ background: "var(--divider)" }} />
          <p
            className="font-syne font-bold"
            style={{
              fontSize: "clamp(18px, 2.2vw, 26px)",
              lineHeight: "1.35",
              color: "var(--text-secondary)",
              letterSpacing: "-0.01em",
            }}
          >
            Your systems stay the same.
          </p>
          <p
            className="font-syne font-bold mt-1"
            style={{
              fontSize: "clamp(18px, 2.2vw, 26px)",
              lineHeight: "1.35",
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            Your decisions get{" "}
            <span style={{ color: "var(--amber)", textShadow: "0 0 22px rgba(255,185,0,0.22)" }}>
              better.
            </span>
          </p>
        </motion.div>

      </div>
    </section>
  );
}
