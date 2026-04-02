"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const consequences = [
  { text: "Bad hires that cost months.", key: "cost" },
  { text: "Partnerships that collapse late.", key: "late" },
  { text: "Capital allocated to the wrong bets.", key: null },
  { text: "Confidence built on weak signals.", key: null },
  { text: "Problems detected too late to fix.", key: "late" },
];

const visibleCosts = ["Bad hires.", "Failed vendors.", "Broken partnerships."];
const invisibleCosts = ["Missed opportunities.", "Misjudged talent.", "Delayed action."];

export function CostSection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      ref={sectionRef}
      className="vx-section"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <div className="vx-container">
        <div className="max-w-[640px] mx-auto text-center">

          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="font-dm-mono text-[11px] uppercase"
            style={{ letterSpacing: "0.18em", color: "var(--amber)" }}
          >
            THE COST OF WEAK SIGNAL
          </motion.div>

          {/* Headline */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.08, ease: [0.25, 0.1, 0.25, 1] }}
            className="font-syne font-extrabold mt-4"
            style={{
              fontSize: "clamp(32px, 4vw, 52px)",
              lineHeight: "1.1",
              color: "var(--text-primary)",
            }}
          >
            You are already paying for this problem.
          </motion.h2>

          {/* Consequence list — one by one */}
          <div className="mt-14 space-y-5">
            {consequences.map((item, index) => (
              <motion.p
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{
                  duration: 0.5,
                  delay: 0.2 + index * 0.18,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
                className="font-syne font-semibold"
                style={{
                  fontSize: "clamp(18px, 2.4vw, 26px)",
                  lineHeight: "1.3",
                  color: "var(--text-tertiary)",
                  letterSpacing: "-0.01em",
                }}
              >
                {item.text}
              </motion.p>
            ))}
          </div>

          {/* "This is not occasional. This is continuous." */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 1.22 }}
            className="mt-10"
          >
            <p
              className="font-dm-mono text-[14px]"
              style={{ color: "var(--amber)", letterSpacing: "0.06em" }}
            >
              This is not occasional.
            </p>
            <p
              className="font-dm-mono text-[14px] mt-1"
              style={{ color: "var(--amber)", letterSpacing: "0.06em" }}
            >
              This is continuous.
            </p>
          </motion.div>

          {/* Amber separator */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={isInView ? { scaleX: 1 } : {}}
            transition={{ duration: 0.6, delay: 1.38, ease: [0.25, 0.1, 0.25, 1] }}
            className="mx-auto mt-12 h-px w-24"
            style={{ backgroundColor: "var(--amber)", transformOrigin: "left" }}
          />

          {/* Cost paragraph — structured */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, delay: 1.48, ease: [0.25, 0.1, 0.25, 1] }}
            className="mt-12 text-left"
          >
            <p
              className="font-dm-sans text-center"
              style={{ fontSize: "16px", lineHeight: "1.7", color: "var(--text-secondary)" }}
            >
              Every decision made on weak signals carries a{" "}
              <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>cost.</span>
            </p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Visible */}
              <div>
                <p
                  className="font-dm-mono text-[12px] uppercase mb-3 text-center"
                  style={{ letterSpacing: "0.16em", color: "var(--amber)" }}
                >
                  Visible:
                </p>
                <ul className="space-y-2 w-fit mx-auto" style={{ listStyle: "none", padding: 0 }}>
                  {visibleCosts.map((line, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 font-dm-sans"
                      style={{ fontSize: "16px", lineHeight: "1.55", color: "var(--text-tertiary)" }}
                    >
                      <span style={{ color: "var(--red)", opacity: 0.7, flexShrink: 0, fontSize: "10px", marginTop: "4px" }}>▸</span>
                      {line}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Invisible */}
              <div>
                <p
                  className="font-dm-mono text-[12px] uppercase mb-3 text-center"
                  style={{ letterSpacing: "0.16em", color: "var(--amber)" }}
                >
                  Invisible:
                </p>
                <ul className="space-y-2 w-fit mx-auto" style={{ listStyle: "none", padding: 0 }}>
                  {invisibleCosts.map((line, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 font-dm-sans"
                      style={{ fontSize: "16px", lineHeight: "1.55", color: "var(--text-tertiary)" }}
                    >
                      <span style={{ color: "var(--text-disabled)", opacity: 0.6, flexShrink: 0, fontSize: "10px", marginTop: "4px" }}>▸</span>
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>

          {/* "Veraxius does not add cost." */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, delay: 1.62, ease: [0.25, 0.1, 0.25, 1] }}
            className="mt-12"
          >
            <p
              className="font-syne font-bold"
              style={{
                fontSize: "clamp(18px, 2.2vw, 24px)",
                lineHeight: "1.35",
                color: "var(--text-secondary)",
                letterSpacing: "-0.01em",
              }}
            >
              Veraxius does not add cost.
            </p>
            <p
              className="font-syne font-bold mt-1"
              style={{
                fontSize: "clamp(18px, 2.2vw, 24px)",
                lineHeight: "1.35",
                color: "var(--text-primary)",
                letterSpacing: "-0.01em",
              }}
            >
              It stops unnecessary{" "}
              <span style={{ color: "var(--amber)", textShadow: "0 0 20px rgba(255,185,0,0.22)" }}>
                loss.
              </span>
            </p>
          </motion.div>

          {/* Hard close */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 1.76, ease: [0.25, 0.1, 0.25, 1] }}
            className="mt-8"
          >
            <div className="h-px w-8 mx-auto mb-6" style={{ background: "var(--divider)" }} />
            <p
              className="font-dm-mono text-[14px]"
              style={{ color: "var(--amber)", letterSpacing: "0.06em", lineHeight: "1.8" }}
            >
              The question is not whether you are paying.
            </p>
            <p
              className="font-dm-mono text-[14px]"
              style={{ color: "var(--text-secondary)", letterSpacing: "0.06em" }}
            >
              It is how much you are{" "}
              <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>losing.</span>
            </p>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
