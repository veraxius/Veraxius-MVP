"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

// Timing for each pipeline step
const NODE_DELAYS = [0.3, 0.65, 1.0, 1.35, 1.7];
const ARROW_DELAYS = [0.52, 0.87, 1.22, 1.57];

const nodeVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (delay: number) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.45, delay, ease: [0.25, 0.1, 0.25, 1] },
  }),
};

const arrowVariants = {
  hidden: { opacity: 0 },
  visible: (delay: number) => ({
    opacity: 1,
    transition: { duration: 0.25, delay },
  }),
};

export function ArchitectureDiagramSection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      ref={sectionRef}
      id="architecture"
      className="vx-section"
      style={{ backgroundColor: "var(--bg-primary)" }}
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
          <span style={{ color: "var(--amber)", textShadow: "0 0 24px rgba(255,185,0,0.3)" }}>Integrity</span> requires architecture.
        </motion.h2>

        {/* Intro */}
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
          className="font-dm-sans text-center mt-6 max-w-2xl mx-auto"
          style={{ fontSize: "17px", lineHeight: "1.65", color: "var(--text-secondary)" }}
        >
          From raw behavior to verified signal.
          <br />
          Every step reduces noise. Every Step increases truth.
        </motion.p>

        {/* Diagram Panel */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          className="vx-panel mt-16 relative overflow-hidden"
          style={{ borderColor: "var(--amber-border)", padding: "48px" }}
        >
          {/* Top accent line */}
          <div
            className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: "linear-gradient(90deg, var(--amber) 0%, var(--amber-glow) 50%, transparent 100%)" }}
          />

          {/* Flow Diagram */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4">

            {/* Node 1 — Raw Signals */}
            <motion.div
              className="text-center"
              variants={nodeVariants}
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              custom={NODE_DELAYS[0]}
            >
              <div className="px-6 py-4 border" style={{ borderColor: "var(--divider)" }}>
                <span className="font-dm-mono text-[12px] uppercase" style={{ letterSpacing: "0.15em", color: "var(--text-secondary)" }}>
                  Raw Signals
                </span>
              </div>
            </motion.div>

            {/* Arrow 1 */}
            <motion.div
              variants={arrowVariants}
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              custom={ARROW_DELAYS[0]}
              className="hidden md:block"
            >
              <motion.span
                className="font-dm-mono text-base"
                style={{ color: "var(--text-tertiary)", display: "block" }}
                animate={isInView ? { x: [0, 4, 0], opacity: [0.5, 1, 0.5] } : {}}
                transition={{ duration: 1.8, delay: ARROW_DELAYS[0] + 0.3, repeat: Infinity, ease: "easeInOut" }}
              >
                →
              </motion.span>
            </motion.div>
            <div className="font-dm-mono text-lg md:hidden" style={{ color: "var(--text-tertiary)" }}>↓</div>

            {/* Node 2 — Signal Alignment */}
            <motion.div
              className="text-center"
              variants={nodeVariants}
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              custom={NODE_DELAYS[1]}
            >
              <div className="px-6 py-4 border" style={{ borderColor: "var(--divider)" }}>
                <span className="font-dm-mono text-[12px] uppercase" style={{ letterSpacing: "0.15em", color: "var(--text-secondary)" }}>
                  Signal Alignment
                </span>
              </div>
            </motion.div>

            {/* Arrow 2 */}
            <motion.div
              variants={arrowVariants}
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              custom={ARROW_DELAYS[1]}
              className="hidden md:block"
            >
              <motion.span
                className="font-dm-mono text-base"
                style={{ color: "var(--text-tertiary)", display: "block" }}
                animate={isInView ? { x: [0, 4, 0], opacity: [0.5, 1, 0.5] } : {}}
                transition={{ duration: 1.8, delay: ARROW_DELAYS[1] + 0.3, repeat: Infinity, ease: "easeInOut" }}
              >
                →
              </motion.span>
            </motion.div>
            <div className="font-dm-mono text-lg md:hidden" style={{ color: "var(--text-tertiary)" }}>↓</div>

            {/* Node 3 — Pattern Extraction */}
            <motion.div
              className="text-center"
              variants={nodeVariants}
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              custom={NODE_DELAYS[2]}
            >
              <div className="px-6 py-4 border" style={{ borderColor: "var(--divider)" }}>
                <span className="font-dm-mono text-[12px] uppercase" style={{ letterSpacing: "0.15em", color: "var(--text-secondary)" }}>
                  Pattern Extraction
                </span>
              </div>
            </motion.div>

            {/* Arrow 3 */}
            <motion.div
              variants={arrowVariants}
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              custom={ARROW_DELAYS[2]}
              className="hidden md:block"
            >
              <motion.span
                className="font-dm-mono text-base"
                style={{ color: "var(--amber)", display: "block", opacity: 0.7 }}
                animate={isInView ? { x: [0, 4, 0], opacity: [0.5, 1, 0.5] } : {}}
                transition={{ duration: 1.6, delay: ARROW_DELAYS[2] + 0.3, repeat: Infinity, ease: "easeInOut" }}
              >
                →
              </motion.span>
            </motion.div>
            <div className="font-dm-mono text-lg md:hidden" style={{ color: "var(--text-tertiary)" }}>↓</div>

            {/* Node 4 — AIM Engine (the brain) */}
            <motion.div
              className="text-center relative flex flex-col items-center gap-2"
              variants={nodeVariants}
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              custom={NODE_DELAYS[3]}
            >
              <motion.div
                className="px-6 py-4 border-2"
                style={{ borderColor: "var(--amber)" }}
                animate={isInView ? {
                  boxShadow: [
                    "0 0 0px rgba(255,185,0,0)",
                    "0 0 14px rgba(255,185,0,0.25)",
                    "0 0 0px rgba(255,185,0,0)",
                  ],
                } : {}}
                transition={{ duration: 2.4, delay: NODE_DELAYS[3] + 0.6, repeat: Infinity, ease: "easeInOut" }}
              >
                <span
                  className="font-dm-mono text-[12px] uppercase font-medium"
                  style={{ letterSpacing: "0.15em", color: "var(--amber)" }}
                >
                  AIM Engine
                </span>
              </motion.div>
              <span className="font-dm-mono text-[10px] uppercase" style={{ letterSpacing: "0.14em", color: "var(--text-disabled)" }}>
                Time Signals
              </span>
            </motion.div>

            {/* Arrow 4 */}
            <motion.div
              variants={arrowVariants}
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              custom={ARROW_DELAYS[3]}
              className="hidden md:block"
            >
              <motion.span
                className="font-dm-mono text-base"
                style={{ color: "var(--amber)", display: "block" }}
                animate={isInView ? { x: [0, 5, 0], opacity: [0.6, 1, 0.6] } : {}}
                transition={{ duration: 1.4, delay: ARROW_DELAYS[3] + 0.3, repeat: Infinity, ease: "easeInOut" }}
              >
                →
              </motion.span>
            </motion.div>
            <div className="font-dm-mono text-lg md:hidden" style={{ color: "var(--text-tertiary)" }}>↓</div>

            {/* Node 5 — Integrity Output */}
            <motion.div
              className="text-center relative"
              variants={nodeVariants}
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              custom={NODE_DELAYS[4]}
            >
              <div className="px-6 py-4 border" style={{ borderColor: "var(--divider)" }}>
                <span className="font-dm-mono text-[12px] uppercase" style={{ letterSpacing: "0.15em", color: "var(--text-secondary)" }}>
                  Integrity Output
                </span>
              </div>

              {/* Feedback Loop */}
              <div
                className="hidden lg:block absolute top-full left-1/2 mt-4 w-px h-8"
                style={{ background: `repeating-linear-gradient(to bottom, var(--amber-border) 0, var(--amber-border) 4px, transparent 4px, transparent 8px)` }}
              />
              <div
                className="hidden lg:block absolute top-[calc(100%+32px)] left-1/2 w-[120px] h-px"
                style={{ background: `repeating-linear-gradient(to left, var(--amber-border) 0, var(--amber-border) 4px, transparent 4px, transparent 8px)` }}
              />
              {/* Vertical segment — shortened 32px at top */}
              <div
                className="hidden lg:block absolute left-[calc(50%-120px)] w-px"
                style={{
                  top: "32px",
                  height: "calc(100% + 120px)",
                  background: `repeating-linear-gradient(to bottom, var(--amber-border) 0, var(--amber-border) 4px, transparent 4px, transparent 8px)`,
                }}
              />
              {/* Horizontal bend at top — goes left from the vertical line */}
              <div
                className="hidden lg:block absolute h-px"
                style={{
                  top: "32px",
                  left: "calc(50% - 200px)",
                  width: "80px",
                  background: `repeating-linear-gradient(to right, var(--amber-border) 0, var(--amber-border) 4px, transparent 4px, transparent 8px)`,
                }}
              />
              {/* Feedback Engine Label */}
              <div
                className="hidden lg:block absolute top-[calc(100%+140px)] left-[calc(50%-120px)]"
                style={{ transform: "translateX(-50%)" }}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="font-dm-mono text-[10px] uppercase" style={{ letterSpacing: "0.15em", color: "var(--amber)" }}>
                    FEEDBACK ENGINE
                  </span>
                  <span className="font-dm-mono text-[10px] uppercase" style={{ letterSpacing: "0.14em", color: "var(--text-disabled)" }}>
                    Time Signals
                  </span>
                </div>
              </div>
            </motion.div>

          </div>

          {/* Signal Pills */}
          <motion.div
            className="mt-10 flex flex-wrap justify-center gap-3"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: NODE_DELAYS[4] + 0.3 }}
          >
            <span className="font-dm-mono text-[11px] uppercase px-4 py-2" style={{ letterSpacing: "0.15em", backgroundColor: "rgba(77,163,255,0.1)", color: "var(--blue)" }}>
              Behavioral Signals
            </span>
            <span className="font-dm-mono text-[11px] uppercase px-4 py-2" style={{ letterSpacing: "0.15em", backgroundColor: "rgba(255,184,77,0.1)", color: "var(--amber)" }}>
              Context Signals
            </span>
            <span className="font-dm-mono text-[11px] uppercase px-4 py-2" style={{ letterSpacing: "0.15em", backgroundColor: "rgba(108,114,127,0.1)", color: "var(--steel)" }}>
              Time Signals
            </span>
          </motion.div>

          {/* Caption */}
          <motion.p
            className="font-dm-mono text-center mt-8 italic"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: NODE_DELAYS[4] + 0.5 }}
            style={{ fontSize: "15px", color: "var(--amber)", textShadow: "0 0 16px rgba(255,185,0,0.35)" }}
          >
            Integrity is computed, not declared.
          </motion.p>

        </motion.div>
      </div>
    </section>
  );
}
