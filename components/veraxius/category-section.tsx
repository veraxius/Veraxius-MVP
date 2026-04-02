"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const negationLines = [
  "A system that measures alignment between what is claimed and what is proven.",
];

export function CategorySection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      ref={sectionRef}
      className="vx-section"
      style={{
        backgroundColor: "var(--bg-primary)",
      }}
    >
      <div className="vx-container">
        <div className="max-w-[860px] mx-auto text-center">
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            className="font-dm-mono text-[11px] tracking-eyebrow uppercase"
            style={{
              letterSpacing: "0.18em",
              color: "var(--amber)",
            }}
          >
            INTRODUCING
          </motion.div>

          {/* Headline */}
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
            className="font-syne font-extrabold mt-4"
            style={{
              fontSize: "clamp(36px, 5vw, 64px)",
              lineHeight: "1.1",
              color: "var(--text-primary)",
            }}
          >
            <span style={{ textShadow: "0 0 40px rgba(255,255,255,0.08)" }}>Integrity</span>{" "}
            <span style={{ color: "var(--amber)", textShadow: "0 0 30px rgba(255,185,0,0.3)" }}>Infrastructure.</span>
          </motion.h2>

          {/* Negation Lines */}
          <div className="mt-12 space-y-3">
            {negationLines.map((line, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 24 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{
                  duration: 0.6,
                  delay: 0.2 + 0.1 * index,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
                className="flex items-center justify-center gap-3"
              >
                <span
                  className="font-dm-mono text-lg"
                  style={{ color: "var(--amber)" }}
                >
                  —
                </span>
                <span
                  className="font-dm-sans"
                  style={{
                    fontSize: "17px",
                    color: "var(--text-tertiary)",
                  }}
                >
                  {line}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Positive Body */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            className="mt-12"
          >
            <p
              className="font-dm-sans"
              style={{
                fontSize: "17px",
                lineHeight: "1.65",
                color: "var(--text-secondary)",
              }}
            >
              Veraxius analyzes behavior across sources:
            </p>
            <ul
              className="mt-4 space-y-2 flex flex-col items-center"
              style={{ listStyle: "none", padding: 0 }}
            >
              {[
                "Work history",
                "Communication patterns",
                "Output consistency",
                "Time-based signals",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 font-dm-sans"
                  style={{ fontSize: "17px", color: "var(--amber)", lineHeight: "1.65" }}
                >
                  <span style={{ color: "var(--amber)", fontWeight: 500 }}>•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p
              className="font-dm-sans mt-6"
              style={{
                fontSize: "17px",
                lineHeight: "1.65",
                color: "var(--text-secondary)",
              }}
            >
              It converts these into a single, adaptive integrity signal. The system
              learns over time. It detects patterns humans miss.
            </p>
            <p
              className="font-dm-sans mt-4"
              style={{
                fontSize: "17px",
                lineHeight: "1.65",
                color: "var(--amber)",
              }}
            >
              Scores describe perception. Integrity measures reality.
            </p>
          </motion.div>

          {/* Closing Blockquote */}
          <motion.blockquote
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            className="mt-12 pl-5 text-center"
            style={{
              borderLeft: "3px solid var(--amber)",
            }}
          >
            <p
              className="font-syne font-semibold"
              style={{
                fontSize: "clamp(18px, 2vw, 22px)",
                lineHeight: "1.5",
                color: "var(--text-primary)",
              }}
            >
              "This is the layer beneath reputation. What someone says does not matter.
              What their behavior proves does."
            </p>
          </motion.blockquote>
        </div>
      </div>
    </section>
  );
}
