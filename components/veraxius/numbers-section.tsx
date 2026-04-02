"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";

const stats = [
  { value: 70, suffix: "%", label: "More likely to spread than truth" },
  { value: 6, prefix: "", suffix: "x", label: "Faster spread than verified information" },
  { value: 70, suffix: "%", label: "Of leaders say fraud risk is underestimated" },
  { value: 80, suffix: "%", label: "Of turnover driven by bad hiring decisions" },
  { value: 19, suffix: "%", label: "Can only confidently detect fraud" },
];

function CountUpNumber({
  value,
  prefix = "",
  suffix = "",
  delay,
  isInView,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  delay: number;
  isInView: boolean;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    const timeout = setTimeout(() => {
      const duration = 1500;
      const steps = 30;
      const stepValue = value / steps;
      const stepDuration = duration / steps;
      let current = 0;

      const interval = setInterval(() => {
        current += stepValue;
        if (current >= value) {
          setCount(value);
          clearInterval(interval);
        } else {
          setCount(Math.floor(current));
        }
      }, stepDuration);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timeout);
  }, [value, delay, isInView]);

  return (
    <span>
      {prefix}
      {count}
      {suffix}
    </span>
  );
}

export function NumbersSection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      ref={sectionRef}
      className="vx-section"
      style={{
        backgroundColor: "var(--bg-secondary)",
        borderTop: "1px solid var(--divider)",
        borderBottom: "1px solid var(--divider)",
      }}
    >
      <div className="vx-container">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex items-center justify-center gap-3 mb-6"
        >
          <div className="w-6 h-px bg-[var(--amber)]"></div>
          <span
            className="font-dm-mono text-[11px] uppercase text-[var(--amber)]"
            style={{ letterSpacing: "0.18em" }}
          >
            REAL-WORLD IMPACT
          </span>
          <div className="w-6 h-px bg-[var(--amber)]"></div>
        </motion.div>

        {/* Section Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="font-syne font-bold text-center"
          style={{
            fontSize: "clamp(28px, 3.5vw, 44px)",
            color: "var(--text-primary)",
          }}
        >
          The cost of broken signals is exponential.
        </motion.h2>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-[2px] mt-16">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 24 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.6,
                delay: 0.1 * index,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              className={`vx-panel p-12 relative group cursor-default md:col-span-2 min-h-[420px] ${
                index === 3 ? "md:col-start-2" : ""
              } ${index === 4 ? "md:col-start-4" : ""}`}
              style={{
                transition: "border-color 0.25s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--amber-border)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--divider)";
              }}
            >
              {/* Bottom Accent */}
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 h-px w-24 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  background: "var(--amber-border)",
                }}
              />

              {index === 0 && (
                <div
                  className="font-dm-mono text-[11px] uppercase text-center"
                  style={{
                    letterSpacing: "0.12em",
                    color: "var(--red)",
                  }}
                >
                  MISINFORMATION
                </div>
              )}
              {index === 1 && (
                <div
                  className="font-dm-mono text-[11px] uppercase text-center"
                  style={{
                    letterSpacing: "0.12em",
                    color: "var(--red)",
                  }}
                >
                  MISINFORMATION SPEED
                </div>
              )}
              {index === 2 && (
                <div
                  className="font-dm-mono text-[11px] uppercase text-center"
                  style={{
                    letterSpacing: "0.12em",
                    color: "var(--red)",
                  }}
                >
                  FAKE EXPERTISE
                </div>
              )}
              {index === 3 && (
                <div
                  className="font-dm-mono text-[11px] uppercase text-center"
                  style={{
                    letterSpacing: "0.12em",
                    color: "var(--red)",
                  }}
                >
                  BROKEN DECISIONS
                </div>
              )}
              {index === 4 && (
                <div
                  className="font-dm-mono text-[11px] uppercase text-center"
                  style={{
                    letterSpacing: "0.12em",
                    color: "var(--red)",
                  }}
                >
                  TRUST GAP
                </div>
              )}
              <div
                className="font-syne font-extrabold"
                style={{
                  fontSize: "clamp(48px, 5vw, 72px)",
                  color: "var(--amber)",
                }}
              >
                <CountUpNumber
                  value={stat.value}
                  prefix={stat.prefix}
                  suffix={stat.suffix}
                  delay={0.3 + index * 0.15}
                  isInView={isInView}
                />
              </div>
              <p
                className="mt-4 font-dm-sans text-center"
                style={{
                  fontSize: "14px",
                  lineHeight: "1.6",
                  color: "var(--text-tertiary)",
                }}
              >
                {stat.label}
              </p>
              {index === 0 && (
                <p
                  className="mt-2 font-dm-sans text-center"
                  style={{
                    fontSize: "14px",
                    lineHeight: "1.5",
                    color: "var(--text-tertiary)",
                  }}
                >
                  False information outperforms accuracy at scale.
                </p>
              )}
              {index === 1 && (
                <p
                  className="mt-2 font-dm-sans text-center"
                  style={{
                    fontSize: "14px",
                    lineHeight: "1.5",
                    color: "var(--text-tertiary)",
                  }}
                >
                  False news reaches people before truth has a chance.
                </p>
              )}
              {index === 2 && (
                <p
                  className="mt-2 font-dm-sans text-center"
                  style={{
                    fontSize: "14px",
                    lineHeight: "1.5",
                    color: "var(--text-tertiary)",
                  }}
                >
                  Decision-makers know the system is exposed.
                </p>
              )}
              {index === 3 && (
                <p
                  className="mt-2 font-dm-sans text-center"
                  style={{
                    fontSize: "14px",
                    lineHeight: "1.5",
                    color: "var(--text-tertiary)",
                  }}
                >
                  Failure starts at the input layer.
                </p>
              )}
              {index === 4 && (
                <p
                  className="mt-2 font-dm-sans text-center"
                  style={{
                    fontSize: "14px",
                    lineHeight: "1.5",
                    color: "var(--text-tertiary)",
                  }}
                >
                  Markets operate without verification.
                </p>
              )}
              {index === 3 && (
                <a
                  href="https://humcapinc.com/cost-of-bad-hires-blog/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-fit mx-auto mt-9 font-dm-mono text-[11px] uppercase"
                  style={{
                    letterSpacing: "0.1em",
                    color: "var(--text-tertiary)",
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--divider)",
                    padding: "2px 8px",
                    borderRadius: "2px",
                    textDecoration: "none",
                    transition: "color 0.2s, border-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--amber)";
                    e.currentTarget.style.borderColor = "var(--amber-border)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-tertiary)";
                    e.currentTarget.style.borderColor = "var(--divider)";
                  }}
                >
                  HumCap
                </a>
              )}
              {index === 2 && (
                <a
                  href="https://checkr.com/resources/articles/hiring-hoax-manager-survey-2025"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-fit mx-auto mt-9 font-dm-mono text-[11px] uppercase"
                  style={{
                    letterSpacing: "0.1em",
                    color: "var(--text-tertiary)",
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--divider)",
                    padding: "2px 8px",
                    borderRadius: "2px",
                    textDecoration: "none",
                    transition: "color 0.2s, border-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--amber)";
                    e.currentTarget.style.borderColor = "var(--amber-border)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-tertiary)";
                    e.currentTarget.style.borderColor = "var(--divider)";
                  }}
                >
                  Checkr Hiring Report
                </a>
              )}
              {index === 4 && (
                <a
                  href="https://www.techradar.com/pro/employers-admit-candidates-faking-identities-with-aiare-outsmarting-them-with-fraudulent-hires-costing-companies-thousands"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-fit mx-auto mt-9 font-dm-mono text-[11px] uppercase"
                  style={{
                    letterSpacing: "0.1em",
                    color: "var(--text-tertiary)",
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--divider)",
                    padding: "2px 8px",
                    borderRadius: "2px",
                    textDecoration: "none",
                    transition: "color 0.2s, border-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--amber)";
                    e.currentTarget.style.borderColor = "var(--amber-border)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-tertiary)";
                    e.currentTarget.style.borderColor = "var(--divider)";
                  }}
                >
                  TechRadar / Checkr
                </a>
              )}
              {index === 1 && (
                <a
                  href="https://news.mit.edu/2018/study-twitter-false-news-travels-faster-true-stories-0308"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-fit mx-auto mt-9 font-dm-mono text-[11px] uppercase"
                  style={{
                    letterSpacing: "0.1em",
                    color: "var(--text-tertiary)",
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--divider)",
                    padding: "2px 8px",
                    borderRadius: "2px",
                    textDecoration: "none",
                    transition: "color 0.2s, border-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--amber)";
                    e.currentTarget.style.borderColor = "var(--amber-border)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-tertiary)";
                    e.currentTarget.style.borderColor = "var(--divider)";
                  }}
                >
                  MIT Research
                </a>
              )}
              {index === 0 && (
                <a
                  href="https://mitsloan.mit.edu/ideas-made-to-matter/study-false-news-spreads-faster-truth"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-fit mx-auto mt-[3.685rem] font-dm-mono text-[11px] uppercase"
                  style={{
                    letterSpacing: "0.1em",
                    color: "var(--text-tertiary)",
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--divider)",
                    padding: "2px 8px",
                    borderRadius: "2px",
                    textDecoration: "none",
                    transition: "color 0.2s, border-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--amber)";
                    e.currentTarget.style.borderColor = "var(--amber-border)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-tertiary)";
                    e.currentTarget.style.borderColor = "var(--divider)";
                  }}
                >
                  MIT Sloan / Science Study
                </a>
              )}
            </motion.div>
          ))}
        </div>

        {/* Closing Line */}
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="font-dm-mono text-center mt-12"
          style={{
            fontSize: "14px",
            color: "var(--text-tertiary)",
          }}
        >
          The problem is not lack of data. It is lack of integrity in that data.
        </motion.p>
      </div>
    </section>
  );
}
