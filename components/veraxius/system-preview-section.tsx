"use client";

import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState, useEffect } from "react";

const METRICS = [
  {
    label: "Consistency",
    withValue: "High alignment over time",
    beforeValue: "Not established",
    definition: "How reliably behavior matches stated patterns across time and context.",
  },
  {
    label: "Variance",
    withValue: "Low deviation across actions",
    beforeValue: "Unknown",
    definition: "Degree of deviation across independent data points — lower means more predictable.",
  },
  {
    label: "Confidence",
    withValue: "Strong multi-source agreement",
    beforeValue: "Insufficient data",
    definition: null, // no hover for Confidence
  },
];

export function SystemPreviewSection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: false, margin: "-100px" });
  const [score, setScore] = useState(78);
  const [activeTab, setActiveTab] = useState<"before" | "with">("with");
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);
  const [expandedConfidence, setExpandedConfidence] = useState(false);

  useEffect(() => {
    if (activeTab !== "with") return;
    if (!isInView) {
      setScore(78);
      return;
    }
    const start = 78;
    const end = 84;
    const duration = 900;
    const steps = end - start;
    const stepDuration = duration / steps;
    let current = start;
    const timer = setInterval(() => {
      current += 1;
      setScore(current);
      if (current >= end) clearInterval(timer);
    }, stepDuration);
    return () => clearInterval(timer);
  }, [isInView, activeTab]);

  const isBefore = activeTab === "before";

  return (
    <section
      ref={sectionRef}
      id="system-preview"
      className="vx-section"
      style={{
        backgroundColor: "var(--bg-primary)",
        borderBottom: "1px solid var(--divider)",
      }}
    >
      <div className="vx-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          {/* Left Column - Dashboard Card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            className="vx-panel p-8 relative overflow-hidden order-2 lg:order-1"
            style={{
              borderColor: isBefore ? "var(--divider)" : "var(--amber-border)",
              transition: "border-color 0.3s ease",
            }}
          >
            {/* Top Accent */}
            <div
              className="absolute top-0 left-0 right-0 h-0.5"
              style={{
                background: isBefore
                  ? "linear-gradient(90deg, rgba(255,255,255,0.1) 0%, transparent 100%)"
                  : "linear-gradient(90deg, var(--amber) 0%, var(--amber-glow) 50%, transparent 100%)",
                transition: "background 0.3s ease",
              }}
            />

            {/* Header */}
            <div className="flex justify-between items-center">
              <span
                className="font-dm-mono text-[11px] tracking-label uppercase"
                style={{
                  letterSpacing: "0.15em",
                  color: "var(--text-tertiary)",
                }}
              >
                USER_IDENTITY_VX_2847
              </span>
              <div className="flex items-center gap-2">
                <div
                  className={isBefore ? "w-2 h-2 rounded-full" : "w-2 h-2 rounded-full vx-pulse"}
                  style={{
                    backgroundColor: isBefore ? "var(--text-disabled)" : "var(--green)",
                    boxShadow: isBefore ? "none" : undefined,
                  }}
                />
                <span
                  className="font-dm-mono text-[10px] uppercase"
                  style={{ color: isBefore ? "var(--text-disabled)" : "var(--green)" }}
                >
                  {isBefore ? "UNVERIFIED" : "LIVE"}
                </span>
              </div>
            </div>

            {/* Toggle */}
            <div
              className="mt-5 flex items-center gap-0 border-b"
              style={{ borderColor: "var(--divider)" }}
            >
              {(["before", "with"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="font-dm-mono text-[10px] uppercase pb-2.5 pr-5 transition-all"
                  style={{
                    letterSpacing: "0.14em",
                    color: activeTab === tab ? "var(--text-primary)" : "var(--text-disabled)",
                    borderTop: "none",
                    borderLeft: "none",
                    borderRight: "none",
                    borderBottom: activeTab === tab
                      ? `1px solid ${tab === "before" ? "var(--text-secondary)" : "var(--amber)"}`
                      : "1px solid transparent",
                    marginBottom: "-1px",
                    background: "none",
                    cursor: "pointer",
                    padding: "0 20px 10px 0",
                  }}
                >
                  {tab === "before" ? "Before Veraxius" : "With Veraxius"}
                </button>
              ))}
            </div>

            {/* Score */}
            <div className="mt-8 flex flex-col items-start">
              <div className="flex items-center gap-4">
                <span
                  className="font-syne font-extrabold"
                  style={{
                    fontSize: "72px",
                    color: isBefore ? "var(--text-disabled)" : "var(--amber)",
                    lineHeight: 1,
                    transition: "color 0.3s ease",
                    filter: isBefore ? "blur(3px)" : "none",
                    userSelect: "none",
                  }}
                >
                  {isBefore ? "—" : score}
                </span>
                {!isBefore && (
                  <span
                    className="font-dm-mono text-[11px] uppercase"
                    style={{
                      letterSpacing: "0.12em",
                      color: "var(--green)",
                      padding: "3px 8px",
                      border: "1px solid var(--green)",
                      borderRadius: "2px",
                      opacity: 0.85,
                    }}
                  >
                    High credibility signal
                  </span>
                )}
              </div>
              <span
                className="font-dm-mono text-[10px] tracking-label uppercase mt-2"
                style={{
                  letterSpacing: "0.15em",
                  color: "var(--text-tertiary)",
                }}
              >
                INTEGRITY SCORE
              </span>
              <span
                className="font-dm-mono text-[12px] mt-1"
                style={{ color: isBefore ? "var(--text-disabled)" : "var(--green)" }}
              >
                0-100
              </span>
            </div>

            {/* Metrics */}
            <div className="mt-8 space-y-0">
              {METRICS.map((item, i) => {
                const hasDefinition = !!item.definition;
                const isHovered = hoveredMetric === item.label;
                const isConfidence = item.label === "Confidence";
                return (
                  <div
                    key={i}
                    className="py-3 border-b font-dm-sans"
                    style={{ borderColor: "var(--divider)" }}
                    onMouseEnter={() => hasDefinition && setHoveredMetric(item.label)}
                    onMouseLeave={() => setHoveredMetric(null)}
                    onClick={() => {
                      if (isConfidence) setExpandedConfidence((prev) => !prev);
                    }}
                  >
                    <div className="flex items-start gap-2" style={{ fontSize: "15px", lineHeight: "1.6" }}>
                      <span style={{ color: isBefore ? "var(--text-disabled)" : "var(--amber)", fontWeight: 600 }}>•</span>
                      <span>
                        <span
                          style={{
                            color: "var(--text-primary)",
                            fontWeight: 500,
                            cursor: isConfidence ? "pointer" : "default",
                            borderBottom: hasDefinition || isConfidence ? "1px dotted var(--amber)" : "none",
                          }}
                        >
                          {item.label}
                        </span>
                        <span style={{ color: "var(--text-tertiary)" }}> → </span>
                        <span style={{ color: isBefore ? "var(--text-disabled)" : "var(--text-secondary)" }}>
                          {isBefore ? item.beforeValue : item.withValue}
                        </span>
                      </span>
                    </div>
                    {/* Micro definition on hover */}
                    <AnimatePresence>
                      {hasDefinition && isHovered && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.15 }}
                          className="font-dm-sans"
                          style={{
                            fontSize: "12px",
                            color: "var(--text-tertiary)",
                            fontStyle: "italic",
                            marginTop: "4px",
                            paddingLeft: "14px",
                            lineHeight: "1.5",
                            overflow: "hidden",
                          }}
                        >
                          {item.definition}
                        </motion.p>
                      )}
                    </AnimatePresence>
                    <AnimatePresence>
                      {isConfidence && expandedConfidence && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="font-dm-sans"
                          style={{
                            fontSize: "12px",
                            color: "var(--text-tertiary)",
                            fontStyle: "italic",
                            marginTop: "4px",
                            paddingLeft: "14px",
                            lineHeight: "1.5",
                            overflow: "hidden",
                          }}
                        >
                          How consistently outcomes remain stable across different inputs, scenarios and independent observations.
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* Signal Confidence Highlight */}
            <div
              className="mt-5 flex items-center justify-between px-3 py-2.5"
              style={{
                background: isBefore ? "transparent" : "rgba(255,185,0,0.04)",
                borderLeft: isBefore ? "2px solid rgba(255,255,255,0.08)" : "2px solid rgba(255,185,0,0.35)",
                transition: "all 0.3s ease",
              }}
            >
              <span
                className="font-dm-mono text-[10px] uppercase"
                style={{ letterSpacing: "0.16em", color: "var(--text-primary)", opacity: isBefore ? 0.3 : 0.75 }}
              >
                SIGNAL CONFIDENCE
              </span>
              <span
                className="font-syne font-bold"
                style={{
                  fontSize: "17px",
                  color: isBefore ? "var(--text-disabled)" : "var(--amber)",
                  textShadow: isBefore ? "none" : "0 0 10px rgba(255,185,0,0.4)",
                }}
              >
                {isBefore ? "—" : "87%"}
              </span>
            </div>

            {/* Decision Confidence */}
            <div
              className="mt-6 pt-6 border-t flex items-center justify-between"
              style={{ borderColor: "var(--divider)" }}
            >
              <span
                className="font-dm-mono text-[10px] uppercase"
                style={{ letterSpacing: "0.16em", color: "var(--text-tertiary)" }}
              >
                Decision Confidence
              </span>
              <span
                className="font-dm-mono text-[11px] uppercase font-bold px-3 py-1"
                style={{
                  letterSpacing: "0.16em",
                  color: isBefore ? "var(--text-disabled)" : "var(--green)",
                  border: isBefore ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,200,100,0.3)",
                  background: isBefore ? "transparent" : "rgba(0,200,100,0.06)",
                  borderRadius: "2px",
                  transition: "all 0.3s ease",
                }}
              >
                {isBefore ? "UNCLEAR" : "HIGH"}
              </span>
            </div>
          </motion.div>

          {/* Right Column - Content */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="order-1 lg:order-2"
          >
            {/* Eyebrow */}
            <div
              className="font-dm-mono text-[11px] tracking-eyebrow uppercase"
              style={{
                letterSpacing: "0.18em",
                color: "var(--amber)",
              }}
            >
              EARLY SYSTEM PREVIEW
            </div>

            {/* Headline */}
            <h2
              className="font-syne font-extrabold mt-4"
              style={{
                fontSize: "clamp(32px, 4vw, 52px)",
                lineHeight: "1.1",
                color: "var(--text-primary)",
              }}
            >
              This is what integrity looks like.
            </h2>

            {/* Body */}
            <p
              className="font-dm-sans mt-6"
              style={{
                fontSize: "17px",
                lineHeight: "1.65",
                color: "var(--text-secondary)",
              }}
            >
              Every interaction leaves a trace. Not what people say. What they do. Veraxius
              converts behavior into a measurable signal.
            </p>

            <ul
              className="mt-4 space-y-2"
              style={{ listStyle: "none", padding: 0 }}
            >
              {[
                { label: "Consistency", desc: "shows reliability" },
                { label: "Variance", desc: "reveals instability" },
                { label: "Confidence", desc: "reflects signal strength" },
              ].map((item) => (
                <li key={item.label} className="flex items-start gap-2 font-dm-sans" style={{ fontSize: "16px", color: "var(--text-secondary)", lineHeight: "1.65" }}>
                  <span style={{ color: "var(--amber)", fontWeight: 500 }}>•</span>
                  <span>
                    <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{item.label}</span>
                    {" "}{item.desc}
                  </span>
                </li>
              ))}
            </ul>

            <p
              className="font-dm-sans mt-6"
              style={{
                fontSize: "15px",
                lineHeight: "1.65",
                color: "var(--text-tertiary)",
                fontStyle: "italic",
              }}
            >
              No opinions. No assumptions. Only patterns backed by data.
            </p>

            {/* CTA */}
            <a
              href="#architecture"
              className="inline-block font-dm-mono font-medium text-[13px] tracking-cta uppercase mt-8 px-8 py-4 border transition-all"
              style={{
                letterSpacing: "0.08em",
                borderColor: "var(--divider)",
                color: "var(--text-secondary)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--amber-border)";
                e.currentTarget.style.color = "var(--text-primary)";
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.03)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--divider)";
                e.currentTarget.style.color = "var(--text-secondary)";
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              SEE HOW SCORING WORKS
            </a>

            {/* Support */}
            <p
              className="font-dm-mono mt-6"
              style={{
                fontSize: "11px",
                color: "var(--text-disabled)",
              }}
            >
              Early system model in development.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
