"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

export function CaseStudySection() {
  const sectionRef = useRef(null);
  const leftRef = useRef(null);
  const rightRef = useRef(null);

  const isInView = useInView(sectionRef, { once: true, margin: "-80px" });
  const leftInView = useInView(leftRef, { once: true, margin: "-60px" });
  const rightInView = useInView(rightRef, { once: true, margin: "-60px" });

  return (
    <section
      ref={sectionRef}
      className="vx-section"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <div className="vx-container">

        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="font-dm-mono text-[11px] uppercase text-center"
          style={{ letterSpacing: "0.18em", color: "var(--amber)" }}
        >
          DECISION INTEGRITY
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.08, ease: [0.25, 0.1, 0.25, 1] }}
          className="font-syne font-extrabold text-center mt-4"
          style={{ fontSize: "clamp(32px, 4vw, 52px)", lineHeight: "1.1", color: "var(--text-primary)" }}
        >
          What changes in practice.
        </motion.h2>

        {/* Subline */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.16, ease: [0.25, 0.1, 0.25, 1] }}
          className="font-dm-sans text-center mt-4"
          style={{ fontSize: "18px", color: "var(--text-secondary)", letterSpacing: "-0.01em" }}
        >
          This is one example. The same signal failure appears everywhere decisions rely on trust.
        </motion.p>

        {/* Comparison Grid */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── LEFT: WITHOUT VERAXIUS ── */}
          <motion.div
            ref={leftRef}
            initial={{ opacity: 0, x: -32 }}
            animate={leftInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.65, ease: [0.25, 0.1, 0.25, 1] }}
            className="vx-panel p-8 relative"
            style={{
              borderTop: "2px solid var(--red)",
              background: "rgba(255,107,87,0.04)",
            }}
          >
            {/* Column header */}
            <div className="flex items-center gap-3">
              <span
                className="font-dm-mono text-[10px] px-2 py-[2px] uppercase"
                style={{
                  color: "var(--red)",
                  border: "1px solid rgba(255,107,87,0.3)",
                  letterSpacing: "0.14em",
                  borderRadius: "2px",
                }}
              >
                ✕ WITHOUT VERAXIUS
              </span>
            </div>

            {/* Narrative: the surface signals */}
            <div className="mt-6 space-y-1">
              {["A polished resume.", "Curated references.", "A confident interview."].map((line, i) => (
                <motion.p
                  key={i}
                  initial={{ opacity: 0, x: -16 }}
                  animate={leftInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
                  className="font-dm-sans"
                  style={{ fontSize: "15px", lineHeight: "1.8", color: "var(--text-secondary)" }}
                >
                  {line}
                </motion.p>
              ))}
            </div>

            {/* Bridge */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={leftInView ? { opacity: 1 } : {}}
              transition={{ duration: 0.4, delay: 0.38 }}
              className="mt-5 space-y-1"
            >
              <p className="font-dm-sans" style={{ fontSize: "15px", color: "var(--text-tertiary)", fontStyle: "italic" }}>
                The signal looks strong.
              </p>
              <p className="font-dm-sans" style={{ fontSize: "15px", color: "var(--text-tertiary)", fontStyle: "italic" }}>
                The hire is made.
              </p>
            </motion.div>

            {/* Six months later */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={leftInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.5 }}
              className="mt-6"
            >
              <p
                className="font-dm-mono text-[12px] uppercase mb-3"
                style={{ letterSpacing: "0.12em", color: "var(--text-disabled)" }}
              >
                Six months later:
              </p>
              <ul className="space-y-2" style={{ listStyle: "none", padding: 0 }}>
                {["Deadlines slip", "Output drops", "Team friction grows"].map((item, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -12 }}
                    animate={leftInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.35, delay: 0.58 + i * 0.08 }}
                    className="flex items-center gap-2 font-dm-sans"
                    style={{ fontSize: "14px", color: "var(--red)" }}
                  >
                    <span style={{ opacity: 0.7 }}>•</span>
                    {item}
                  </motion.li>
                ))}
              </ul>
              <motion.p
                initial={{ opacity: 0 }}
                animate={leftInView ? { opacity: 1 } : {}}
                transition={{ duration: 0.4, delay: 0.85 }}
                className="font-dm-sans mt-4"
                style={{ fontSize: "15px", color: "var(--red)", fontWeight: 600 }}
              >
                The signal was wrong.
              </motion.p>
            </motion.div>

            {/* COST BOX */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={leftInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.95 }}
              className="mt-6 p-5"
              style={{
                backgroundColor: "rgba(255,107,87,0.1)",
                borderLeft: "3px solid var(--red)",
              }}
            >
              <p
                className="font-dm-mono text-[11px] uppercase mb-3"
                style={{ letterSpacing: "0.16em", color: "var(--red)" }}
              >
                COST
              </p>
              {["6+ months lost.", "Team disruption.", "Rehiring cycle."].map((line, i) => (
                <p key={i} className="font-syne font-bold" style={{ fontSize: "16px", lineHeight: "1.7", color: "var(--red)" }}>
                  {line}
                </p>
              ))}
            </motion.div>
          </motion.div>

          {/* ── RIGHT: WITH VERAXIUS ── */}
          <motion.div
            ref={rightRef}
            initial={{ opacity: 0, x: 32 }}
            animate={rightInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.65, delay: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
            className="vx-panel p-8 relative"
            style={{
              borderTop: "2px solid var(--green)",
              background: "rgba(87,209,140,0.03)",
            }}
          >
            {/* Column header */}
            <div className="flex items-center gap-3">
              <span
                className="font-dm-mono text-[10px] px-2 py-[2px] uppercase"
                style={{
                  color: "var(--green)",
                  border: "1px solid rgba(87,209,140,0.3)",
                  letterSpacing: "0.14em",
                  borderRadius: "2px",
                }}
              >
                ✓ WITH VERAXIUS
              </span>
            </div>

            {/* Narrative: entry into the system */}
            <motion.p
              initial={{ opacity: 0, x: 16 }}
              animate={rightInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.28 }}
              className="font-dm-sans mt-6"
              style={{ fontSize: "15px", lineHeight: "1.8", color: "var(--text-secondary)" }}
            >
              The same candidate enters the system.
            </motion.p>
            <motion.p
              initial={{ opacity: 0, x: 16 }}
              animate={rightInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.36 }}
              className="font-dm-sans mt-1"
              style={{ fontSize: "15px", lineHeight: "1.8", color: "var(--text-secondary)" }}
            >
              Claims are tested against behavior.
            </motion.p>

            {/* Patterns */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={rightInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.46 }}
              className="mt-6"
            >
              <p
                className="font-dm-mono text-[12px] uppercase mb-3"
                style={{ letterSpacing: "0.12em", color: "var(--text-disabled)" }}
              >
                Patterns emerge:
              </p>
              <ul className="space-y-2" style={{ listStyle: "none", padding: 0 }}>
                {[
                  { text: "Strong execution in short cycles", positive: true },
                  { text: "Weak follow-through in long projects", positive: false },
                ].map((item, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: 12 }}
                    animate={rightInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.35, delay: 0.54 + i * 0.1 }}
                    className="flex items-center gap-2 font-dm-sans"
                    style={{ fontSize: "14px", color: item.positive ? "var(--green)" : "var(--text-tertiary)" }}
                  >
                    <span style={{ opacity: 0.7 }}>•</span>
                    {item.text}
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            {/* Signal conclusion */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={rightInView ? { opacity: 1 } : {}}
              transition={{ duration: 0.4, delay: 0.76 }}
              className="font-dm-sans mt-5"
              style={{ fontSize: "15px", color: "var(--green)", fontWeight: 600 }}
            >
              The signal is clear.
            </motion.p>

            {/* Decision block */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={rightInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.86 }}
              className="mt-5 space-y-1"
            >
              {[
                "The role is adjusted.",
                "Expectations are aligned.",
                "Or the hire is not made.",
              ].map((line, i) => (
                <p key={i} className="font-dm-sans" style={{ fontSize: "15px", lineHeight: "1.75", color: "var(--text-secondary)" }}>
                  {line}
                </p>
              ))}
            </motion.div>

            {/* RESULT BOX */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={rightInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.98 }}
              className="mt-6 p-5"
              style={{
                backgroundColor: "rgba(87,209,140,0.08)",
                borderLeft: "3px solid var(--green)",
              }}
            >
              <p
                className="font-dm-mono text-[11px] uppercase mb-3"
                style={{ letterSpacing: "0.16em", color: "var(--green)" }}
              >
                RESULT
              </p>
              {["Fewer bad hires.", "Better role fit.", "Lower risk."].map((line, i) => (
                <p key={i} className="font-syne font-bold" style={{ fontSize: "16px", lineHeight: "1.7", color: "var(--green)" }}>
                  {line}
                </p>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* Where this breaks today / What Veraxius changes */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.36, ease: [0.25, 0.1, 0.25, 1] }}
          className="mt-14"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Column A */}
            <div>
              <p
                className="font-dm-mono text-[14px] uppercase mb-4 max-w-[620px] mx-auto text-left"
                style={{ letterSpacing: "0.18em", color: "var(--red)", textShadow: "0 0 10px rgba(255,107,87,0.2)" }}
              >
                Where this breaks today
              </p>
              <ul className="space-y-2 max-w-[620px] mx-auto" style={{ listStyle: "none", padding: 0 }}>
                {[
                  "Hiring decisions → resume vs real execution",
                  "Subject matter experts → claims vs proven outcomes",
                  "Advisors and consultants → confidence vs consistency",
                  "Vendors and partners → promises vs delivery",
                  "Online identities → profiles vs behavior",
                ].map((line, i) => (
                  <li
                    key={i}
                    className="font-dm-sans flex items-start gap-2"
                    style={{ fontSize: "16px", lineHeight: "1.75", color: "var(--text-secondary)" }}
                  >
                    <span style={{ color: "var(--red)", width: "12px", textAlign: "center", flexShrink: 0 }}>•</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Column B */}
            <div>
              <p
                className="font-dm-mono text-[14px] uppercase mb-4 max-w-[560px] mx-auto text-left"
                style={{ letterSpacing: "0.18em", color: "var(--amber)", textShadow: "0 0 10px rgba(255,185,0,0.2)" }}
              >
                What Veraxius changes
              </p>
              <ul className="space-y-2 max-w-[560px] mx-auto" style={{ listStyle: "none", padding: 0 }}>
                {[
                  "Claims are not trusted",
                  "Claims are tested",
                  "Behavior is tracked",
                  "Patterns are scored",
                  "Decisions become evidence-based",
                ].map((line, i) => (
                  <li
                    key={i}
                    className="font-dm-sans flex items-start gap-2"
                    style={{ fontSize: "16px", lineHeight: "1.75", color: "var(--text-primary)" }}
                  >
                    <span style={{ color: "var(--amber)", width: "12px", textAlign: "center", flexShrink: 0 }}>•</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Final closing line */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="mt-14 text-center"
        >
          <p
            className="font-syne font-bold"
            style={{
              fontSize: "clamp(20px, 2.5vw, 30px)",
              lineHeight: "1.3",
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            The difference is not more data.
          </p>
          <p
            className="font-syne font-bold mt-1"
            style={{
              fontSize: "clamp(20px, 2.5vw, 30px)",
              lineHeight: "1.3",
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            It is validated behavior.
          </p>
          <p
            className="font-syne font-bold mt-1"
            style={{
              fontSize: "clamp(20px, 2.5vw, 30px)",
              lineHeight: "1.3",
              color: "var(--amber)",
              letterSpacing: "-0.01em",
              textShadow: "0 0 28px rgba(255,185,0,0.25)",
            }}
          >
            It is better signal.
          </p>
        </motion.div>

      </div>
    </section>
  );
}
