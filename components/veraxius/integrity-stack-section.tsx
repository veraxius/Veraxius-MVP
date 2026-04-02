"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";

const stackItems = [
  {
    number: "01",
    title: "Veraxius Trust Layer",
    description:
      "Connects data from multiple sources into a single integrity graph. Secure. Auditable. Privacy-first.",
  },
  {
    number: "02",
    title: "Adaptive Integrity Model",
    description:
      "Evaluates signal quality. Weights what matters. Ignores what doesn't.",
  },
  {
    number: "03",
    title: "Adaptive Integrity Metric (AIM)",
    description:
      "Converts behavior into a measurable integrity score. Tracks consistency, reliability, and alignment over time.",
  },
  {
    number: "04",
    title: "Integrity Score",
    description:
      "The output interface: a normalized integrity rating with confidence intervals, trend analysis, and contextual flags. Not a final judgment—a decision support signal.",
  },
];

export function IntegrityStackSection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <section
      ref={sectionRef}
      className="vx-section"
      style={{
        backgroundColor: "var(--bg-secondary)",
      }}
    >
      <div className="vx-container">
        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="font-syne font-extrabold text-center"
          style={{
            fontSize: "clamp(32px, 4vw, 52px)",
            lineHeight: "1.1",
            color: "var(--text-primary)",
          }}
        >
          The Veraxius Integrity Stack.
        </motion.h2>

        {/* Intro */}
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
          className="font-dm-sans text-center mt-6 max-w-2xl mx-auto"
          style={{
            fontSize: "17px",
            lineHeight: "1.65",
            color: "var(--text-secondary)",
          }}
        >
          Four layers. One system. Each component feeds the next, creating an
          integrity signal that is greater than the sum of its inputs.
        </motion.p>

        {/* Amber subline */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
          className="font-dm-mono text-center mt-4"
          style={{
            fontSize: "13px",
            letterSpacing: "0.18em",
            color: "var(--amber)",
          }}
        >
          From raw signals → to decision-ready insight
        </motion.p>

        {/* Micro divider line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeInOut" }}
          className="mt-12 mx-auto max-w-2xl h-px"
          style={{
            background: "linear-gradient(90deg, transparent 0%, var(--amber-border) 50%, transparent 100%)",
            transformOrigin: "center",
          }}
        />

        {/* Stack Items */}
        <div className="mt-12 relative">
          {/* Vertical Line */}
          <div
            className="absolute left-0 top-0 bottom-0 w-px hidden lg:block"
            style={{
              backgroundColor: "var(--amber-border)",
            }}
          />

          <div className="space-y-12 lg:pl-12">
            {stackItems.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -24 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{
                  duration: 0.6,
                  delay: 0.2 + 0.1 * index,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
                className="relative"
              onMouseEnter={() => index === 2 && setHoveredIndex(2)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{
                transform: hoveredIndex === 2 && index === 2 ? "scale(1.025)" : "scale(1)",
                transition: "transform 0.3s ease",
              }}
              >
                {/* Horizontal connector line (desktop only) */}
                <div
                  className="absolute -left-12 top-6 w-8 h-px hidden lg:block"
                  style={{
                    background: `linear-gradient(90deg, var(--amber-border) 0%, transparent 100%)`,
                  }}
                />

                <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6">
                  <span
                    className="font-dm-mono text-[13px]"
                    style={{ color: "var(--amber)", minWidth: "24px" }}
                  >
                    {item.number}
                  </span>
                  <div className="flex-1">
                    <h3
                      className="font-syne font-bold"
                      style={{
                        fontSize: "24px",
                        color: "var(--text-primary)",
                        transition: "text-shadow 0.3s ease",
                        textShadow: hoveredIndex === 2 && index === 2
                          ? "0 0 24px rgba(255,255,255,0.32)"
                          : "none",
                      }}
                    >
                      {item.title}
                    </h3>
                    <p
                      className="font-dm-sans mt-2"
                      style={{
                        fontSize: "15px",
                        lineHeight: "1.65",
                        color: "var(--text-tertiary)",
                        transition: "text-shadow 0.3s ease",
                        textShadow: hoveredIndex === 2 && index === 2
                          ? "0 0 20px rgba(255,185,0,0.28)"
                          : "none",
                      }}
                    >
                      {item.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Closing */}
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="font-dm-mono text-center mt-16"
          style={{
            fontSize: "13px",
            letterSpacing: "0.04em",
            color: "var(--amber)",
          }}
        >
          Simple to read. Hard to fake. Designed to adapt.
        </motion.p>
      </div>
    </section>
  );
}
