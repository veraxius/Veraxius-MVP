"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const pillars = [
  {
    number: "01",
    title: "Data advantage",
    lines: [
      "More signals → higher accuracy.",
      "Resolution improves continuously.",
    ],
  },
  {
    number: "02",
    title: "Model advantage",
    lines: [
      "The system learns from every outcome.",
      "Predictions get sharper over time.",
    ],
  },
  {
    number: "03",
    title: "Switching cost",
    lines: [
      "Historical integrity becomes embedded.",
      "Leaving means losing signal history.",
    ],
  },
  {
    number: "04",
    title: "Network effects",
    lines: [
      "More users → stronger signals → better decisions → more users.",
    ],
  },
];

export function WhyThisWinsSection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      ref={sectionRef}
      className="vx-section"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <div className="vx-container">
        <div className="max-w-[680px]">

          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="font-dm-mono text-[11px] uppercase"
            style={{ letterSpacing: "0.18em", color: "var(--amber)" }}
          >
            STRUCTURAL ADVANTAGE
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
            Integrity{" "}
            <span
              style={{
                color: "var(--amber)",
                textShadow: "0 0 28px rgba(255,185,0,0.25)",
              }}
            >
              compounds.
            </span>{" "}
            Static systems don&apos;t.
          </motion.h2>

          {/* Core statement — 3 sharp lines */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, delay: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
            className="mt-10 space-y-2"
          >
            {[
              "Every interaction improves the system.",
              "Every signal strengthens the model.",
              "Over time, the gap widens.",
            ].map((line, i) => (
              <p
                key={i}
                className="font-syne font-semibold"
                style={{
                  fontSize: "clamp(16px, 1.8vw, 20px)",
                  lineHeight: "1.5",
                  color: i === 2 ? "var(--text-primary)" : "var(--text-secondary)",
                  letterSpacing: "-0.01em",
                }}
              >
                {line}
              </p>
            ))}
          </motion.div>

          {/* Structural advantage callout */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.28 }}
            className="mt-8 pl-5"
            style={{ borderLeft: "2px solid var(--amber-border)" }}
          >
            <p
              className="font-dm-sans"
              style={{ fontSize: "15px", lineHeight: "1.7", color: "var(--text-tertiary)" }}
            >
              This is not a feature.{" "}
              <span
                className="font-semibold"
                style={{
                  color: "var(--amber)",
                  textShadow: "0 0 16px rgba(255,185,0,0.18)",
                }}
              >
                This is compounding infrastructure.
              </span>
            </p>
          </motion.div>

          {/* Moat pillars */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.36 }}
            className="mt-12"
          >
            {/* Pillars label */}
            <p
              className="font-dm-mono text-[11px] uppercase mb-8"
            style={{ letterSpacing: "0.16em", color: "var(--text-primary)" }}
          >
            The advantage increases with every use.
            </p>

            <div className="space-y-8">
              {pillars.map((pillar, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -16 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.45, delay: 0.42 + index * 0.09 }}
                  className="flex items-start gap-6"
                >
                  {/* Number */}
                  <span
                    className="font-dm-mono text-[11px] mt-[3px]"
                    style={{
                      color: "var(--amber)",
                      textShadow: "0 0 16px rgba(255,185,0,0.18)",
                      flexShrink: 0,
                      letterSpacing: "0.1em",
                    }}
                  >
                    {pillar.number}
                  </span>

                  {/* Content */}
                  <div>
                    <p
                      className="font-syne font-bold"
                      style={{
                        fontSize: "15px",
                        color: "var(--amber)",
                        textShadow: "0 0 16px rgba(255,185,0,0.18)",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {pillar.title}
                    </p>
                    <div className="mt-2 space-y-[3px]">
                      {pillar.lines.map((line, i) => (
                        <p
                          key={i}
                          className="font-dm-sans"
                          style={{ fontSize: "14px", lineHeight: "1.6", color: "var(--text-tertiary)" }}
                        >
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Closing blockquote */}
          <motion.blockquote
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.82, ease: [0.25, 0.1, 0.25, 1] }}
            className="mt-14 pl-5"
            style={{ borderLeft: "3px solid var(--amber)" }}
          >
            <p
              className="font-syne font-semibold"
              style={{
                fontSize: "clamp(16px, 1.8vw, 20px)",
                lineHeight: "1.55",
                color: "var(--text-secondary)",
                letterSpacing: "-0.01em",
              }}
            >
              The winner in{" "}
              <span
                className="font-semibold"
                style={{
                  color: "var(--amber)",
                  textShadow: "0 0 16px rgba(255,185,0,0.18)",
                }}
              >
                integrity
              </span>{" "}
              infrastructure will not be the loudest.
            </p>
            <p
              className="font-syne font-semibold mt-1"
              style={{
                fontSize: "clamp(16px, 1.8vw, 20px)",
                lineHeight: "1.55",
                color: "var(--text-primary)",
                letterSpacing: "-0.01em",
              }}
            >
              It will be the one with the most data, the strongest model, and the deepest integrations.
            </p>
          </motion.blockquote>

        </div>
      </div>
    </section>
  );
}
