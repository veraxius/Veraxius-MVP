"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const useCases = [
  {
    icon: "○",
    verb: "Decide",
    headline: "based on behavior, not presentation.",
    bullets: [
      "See who finishes what they start",
      "Detect gaps before commitment",
      "Reduce costly wrong decisions",
    ],
    subline: "REDUCE DECISION RISK",
  },
  {
    icon: "◎",
    verb: "Back",
    headline: "execution, not narrative.",
    bullets: [
      "Identify founders who ship",
      "Separate projection from delivery",
      "Reduce diligence blind spots",
    ],
    subline: "Improve capital allocation",
  },
  {
    icon: "⇄",
    verb: "Choose",
    headline: "partners who follow through.",
    bullets: [
      "Validate delivery history",
      "Detect inconsistency early",
      "Avoid contract-stage surprises",
    ],
    subline: "Increase execution reliability",
  },
  {
    icon: "⬡",
    verb: "Replace",
    headline: "reputation systems with integrity signals.",
    bullets: [
      "Prevent manipulation",
      "Enable real credibility",
      "Build trust that scales",
    ],
    subline: "Strengthen ecosystem trust",
  },
];

export function ImpactSection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      ref={sectionRef}
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
          APPLICATIONS
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
          Decisions stop guessing.
        </motion.h2>

        {/* Subline */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.16 }}
          className="font-dm-sans text-center mt-4"
          style={{
            fontSize: "16px",
            lineHeight: "1.6",
            color: "var(--text-tertiary)",
          }}
        >
          Every high-stakes decision improves when signal quality improves.
        </motion.p>

        {/* Cards Grid */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-5">
          {useCases.map((card, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 24 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.55,
                delay: 0.12 + index * 0.1,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              className="vx-panel p-8 relative cursor-default flex flex-col"
              style={{
                borderTop: "2px solid transparent",
                transition: "border-color 0.25s ease, background 0.25s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderTopColor = "var(--amber)";
                e.currentTarget.style.background = "rgba(255,185,0,0.03)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderTopColor = "transparent";
                e.currentTarget.style.background = "";
              }}
            >
              {/* Headline */}
              <h3
                className="font-syne font-bold"
                style={{
                  fontSize: "18px",
                  lineHeight: "1.35",
                  color: "var(--text-primary)",
                  whiteSpace: card.verb === "Decide" ? "nowrap" : "normal",
                }}
              >
                <span
                  style={{
                    color: "var(--amber)",
                    textShadow: "0 0 16px rgba(255,185,0,0.18)",
                  }}
                >
                  {card.verb}
                </span>{" "}
                {card.headline}
              </h3>

              {/* Bullets */}
              <ul className="mt-5 space-y-[10px] flex-1" style={{ listStyle: "none", padding: 0 }}>
                {card.bullets.map((bullet, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 font-dm-sans"
                    style={{ fontSize: "14px", lineHeight: "1.55", color: "var(--text-tertiary)" }}
                  >
                    <span
                      style={{
                        color: "var(--amber)",
                        opacity: 0.55,
                        marginTop: "3px",
                        flexShrink: 0,
                        fontSize: "10px",
                      }}
                    >
                      ▸
                    </span>
                    {bullet}
                  </li>
                ))}
              </ul>

              {/* Subline label */}
              <div
                className="mt-7 pt-5"
                style={{ borderTop: "1px solid var(--divider)" }}
              >
                <span
                  className="font-dm-mono text-[10px] uppercase"
                  style={{
                    letterSpacing: "0.16em",
                    color: "var(--amber)",
                    opacity: 0.7,
                  }}
                >
                  {card.subline}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Closing statement */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.58, ease: [0.25, 0.1, 0.25, 1] }}
          className="mt-16 text-center"
        >
          <div
            className="w-8 h-px mx-auto mb-8"
            style={{ background: "var(--divider)" }}
          />
          <p
            className="font-syne font-bold"
            style={{
              fontSize: "clamp(18px, 2.2vw, 26px)",
              lineHeight: "1.35",
              color: "var(--text-secondary)",
              letterSpacing: "-0.01em",
            }}
          >
            <span
              style={{
                color: "var(--amber)",
                textShadow: "0 0 22px rgba(255,185,0,0.22)",
              }}
            >
              Veraxius
            </span>{" "}
            does not replace judgment.
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
            It makes judgment{" "}
            <span
              style={{
                color: "var(--amber)",
                textShadow: "0 0 22px rgba(255,185,0,0.22)",
              }}
            >
              reliable.
            </span>
          </p>
        </motion.div>

      </div>
    </section>
  );
}
