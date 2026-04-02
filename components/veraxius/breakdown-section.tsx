"use client";

import { AnimatePresence, motion, useInView } from "framer-motion";
import { useRef, useState } from "react";

const breakdownItems = [
  "Resumes are optimized, not truthful.",
  "Reputation is curated, not proven.",
  "Data is abundant. Validation is missing.",
  "Visibility is mistaken for credibility.",
  "AI did not create this weakness.",
];

// Original indicators data and bar component (restored)
const signalData = [
  { label: "Resume accuracy", value: 28 },
  { label: "Verified claims", value: 31 },
  { label: "Behavioral match", value: 22 },
  { label: "Signal confidence", value: 19 },
];

function AnimatedBar({ value, delay }: { value: number; delay: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, margin: "-50px" });

  return (
    <div ref={ref} className="h-1 flex-1 bg-[var(--divider)] overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={isInView ? { width: `${value}%` } : { width: 0 }}
        transition={{ duration: 1, delay, ease: [0.25, 0.1, 0.25, 1] }}
        className="h-full"
        style={{ backgroundColor: "var(--red-transparent)" }}
      />
    </div>
  );
}

export function BreakdownSection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const [showBadHiresDetail, setShowBadHiresDetail] = useState(false);
  const [showPerceptionDetail, setShowPerceptionDetail] = useState(false);
  const [showNoiseDetail, setShowNoiseDetail] = useState(false);
  const [showLoudestDetail, setShowLoudestDetail] = useState(false);
  const [showAmplifiedDetail, setShowAmplifiedDetail] = useState(false);

  return (
    <section
      ref={sectionRef}
      className="vx-section"
      style={{
        background: "linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)",
        borderTop: "1px solid var(--divider)",
      }}
    >
      <div className="vx-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          {/* Left Column */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <h2
              className="font-syne font-extrabold"
              style={{
                fontSize: "clamp(32px, 4vw, 52px)",
                lineHeight: "1.1",
                color: "var(--text-primary)",
              }}
            >
              The system is already failing.
            </h2>

            <div className="mt-10">
              {breakdownItems.map((item, index) => (
                <div
                  key={index}
                  className="py-4 border-b"
                  style={{ borderColor: "var(--divider)" }}
                >
                  <div className="flex items-start gap-4">
                    <span
                      className="font-dm-mono text-lg"
                      style={{ color: "var(--red)" }}
                    >
                      —
                    </span>
                    <div className="flex-1">
                      {index === 0 ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setShowBadHiresDetail((prev) => !prev)}
                            className="font-dm-sans text-left w-full"
                            style={{
                              fontSize: "17px",
                              lineHeight: "1.7",
                              color: "var(--text-secondary)",
                            }}
                            aria-expanded={showBadHiresDetail}
                          >
                            {item}
                          </button>
                          <AnimatePresence initial={false}>
                            {showBadHiresDetail ? (
                              <motion.div
                                initial={{ height: 0, opacity: 0, y: -6 }}
                                animate={{ height: "auto", opacity: 1, y: 0 }}
                                exit={{ height: 0, opacity: 0, y: -6 }}
                                transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                                className="overflow-hidden"
                              >
                                <p
                                  className="font-dm-sans pt-1"
                                  style={{
                                    fontSize: "15px",
                                    lineHeight: "1.6",
                                    color: "var(--text-tertiary)",
                                  }}
                                >
                                  Bad hires are scaling.
                                </p>
                              </motion.div>
                            ) : null}
                          </AnimatePresence>
                        </>
                      ) : index === 1 ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setShowPerceptionDetail((prev) => !prev)}
                            className="font-dm-sans text-left w-full"
                            style={{
                              fontSize: "17px",
                              lineHeight: "1.7",
                              color: "var(--text-secondary)",
                            }}
                            aria-expanded={showPerceptionDetail}
                          >
                            {item}
                          </button>
                          <AnimatePresence initial={false}>
                            {showPerceptionDetail ? (
                              <motion.div
                                initial={{ height: 0, opacity: 0, y: -6 }}
                                animate={{ height: "auto", opacity: 1, y: 0 }}
                                exit={{ height: 0, opacity: 0, y: -6 }}
                                transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                                className="overflow-hidden"
                              >
                                <p
                                  className="font-dm-sans pt-1"
                                  style={{
                                    fontSize: "15px",
                                    lineHeight: "1.6",
                                    color: "var(--text-tertiary)",
                                  }}
                                >
                                  Perception replaces reality.
                                </p>
                              </motion.div>
                            ) : null}
                          </AnimatePresence>
                        </>
                      ) : index === 2 ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setShowNoiseDetail((prev) => !prev)}
                            className="font-dm-sans text-left w-full"
                            style={{
                              fontSize: "17px",
                              lineHeight: "1.7",
                              color: "var(--text-secondary)",
                            }}
                            aria-expanded={showNoiseDetail}
                          >
                            {item}
                          </button>
                          <AnimatePresence initial={false}>
                            {showNoiseDetail ? (
                              <motion.div
                                initial={{ height: 0, opacity: 0, y: -6 }}
                                animate={{ height: "auto", opacity: 1, y: 0 }}
                                exit={{ height: 0, opacity: 0, y: -6 }}
                                transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                                className="overflow-hidden"
                              >
                                <p
                                  className="font-dm-sans pt-1"
                                  style={{
                                    fontSize: "15px",
                                    lineHeight: "1.6",
                                    color: "var(--text-tertiary)",
                                  }}
                                >
                                  Noise is mistaken for signal.
                                </p>
                              </motion.div>
                            ) : null}
                          </AnimatePresence>
                        </>
                      ) : index === 3 ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setShowLoudestDetail((prev) => !prev)}
                            className="font-dm-sans text-left w-full"
                            style={{
                              fontSize: "17px",
                              lineHeight: "1.7",
                              color: "var(--text-secondary)",
                            }}
                            aria-expanded={showLoudestDetail}
                          >
                            {item}
                          </button>
                          <AnimatePresence initial={false}>
                            {showLoudestDetail ? (
                              <motion.div
                                initial={{ height: 0, opacity: 0, y: -6 }}
                                animate={{ height: "auto", opacity: 1, y: 0 }}
                                exit={{ height: 0, opacity: 0, y: -6 }}
                                transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                                className="overflow-hidden"
                              >
                                <p
                                  className="font-dm-sans pt-1"
                                  style={{
                                    fontSize: "15px",
                                    lineHeight: "1.6",
                                    color: "var(--text-tertiary)",
                                  }}
                                >
                                  The loudest wins, not the most accurate.
                                </p>
                              </motion.div>
                            ) : null}
                          </AnimatePresence>
                        </>
                      ) : index === 4 ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setShowAmplifiedDetail((prev) => !prev)}
                            className="font-dm-sans text-left w-full"
                            style={{
                              fontSize: "17px",
                              lineHeight: "1.7",
                              color: "var(--text-secondary)",
                            }}
                            aria-expanded={showAmplifiedDetail}
                          >
                            {item}
                          </button>
                          <AnimatePresence initial={false}>
                            {showAmplifiedDetail ? (
                              <motion.div
                                initial={{ height: 0, opacity: 0, y: -6 }}
                                animate={{ height: "auto", opacity: 1, y: 0 }}
                                exit={{ height: 0, opacity: 0, y: -6 }}
                                transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                                className="overflow-hidden"
                              >
                                <p
                                  className="font-dm-sans pt-1"
                                  style={{
                                    fontSize: "15px",
                                    lineHeight: "1.6",
                                    color: "var(--text-tertiary)",
                                  }}
                                >
                                  It amplified it to a breaking point.
                                </p>
                              </motion.div>
                            ) : null}
                          </AnimatePresence>
                        </>
                      ) : (
                        <span
                          className="font-dm-sans"
                          style={{
                            fontSize: "17px",
                            lineHeight: "1.7",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {item}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Closing Quote */}
            <div
              className="mt-8 pl-5"
              style={{
                borderLeft: "2px solid var(--amber-border)",
              }}
            >
              <p
                className="italic"
                style={{
                  fontSize: "15px",
                  lineHeight: "1.6",
                  color: "var(--text-tertiary)",
                }}
              >
                High-stakes decisions are now being made on low-integrity inputs. That is no longer sustainable.
              </p>
            </div>
          </motion.div>

          {/* Right Column — both panels stacked inside a single column wrapper */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-center gap-3">
              <div className="w-6 h-px bg-[var(--amber)]"></div>
              <div
                className="font-dm-mono text-[11px] uppercase text-[var(--amber)]"
                style={{ letterSpacing: "0.18em" }}
              >
                System diagnostic: Signal Integrity
              </div>
              <div className="w-6 h-px bg-[var(--amber)]"></div>
            </div>
            {/* Panel 1: Signal Failure Indicators */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
              className="vx-panel p-8 relative overflow-hidden"
            >
              {/* Top Accent Line */}
              <div
                className="absolute top-0 left-0 right-0 h-0.5"
                style={{
                  background: "linear-gradient(90deg, var(--red) 0%, transparent 100%)",
                }}
              />

              {/* Label */}
              <div
                className="font-dm-mono text-[10px] tracking-label uppercase"
                style={{
                  letterSpacing: "0.15em",
                  color: "var(--red)",
                }}
              >
                SIGNAL FAILURE INDICATORS
              </div>

              {/* Bars */}
              <div className="mt-8 space-y-6">
                {signalData.map((item, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-center mb-2">
                      <span
                        className="font-dm-mono text-[13px]"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {item.label}
                      </span>
                      <span
                        className="font-dm-mono text-[12px]"
                        style={{ color: "var(--red)" }}
                      >
                        {item.value}%
                      </span>
                    </div>
                    <AnimatedBar value={item.value} delay={0.3 + index * 0.1} />
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Panel 2: Without / With Veraxius */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
              className="vx-panel p-8 relative overflow-hidden"
            >
              {/* Top Accent Line */}
              <div
                className="absolute top-0 left-0 right-0 h-0.5"
                style={{
                  background: "linear-gradient(90deg, var(--amber) 0%, transparent 100%)",
                }}
              />

              {/* Header */}
              <div className="grid grid-cols-3 gap-4 items-end">
                <div></div>
                <div
                  className="text-center font-dm-mono text-[11px] uppercase pb-2"
                  style={{
                    letterSpacing: "0.12em",
                    color: "var(--red)",
                    borderBottom: "2px solid var(--red)",
                  }}
                >
                  Without Veraxius
                </div>
                <div
                  className="text-center font-dm-mono text-[11px] uppercase pb-2"
                  style={{
                    letterSpacing: "0.12em",
                    color: "var(--amber)",
                    borderBottom: "2px solid var(--amber)",
                  }}
                >
                  With Veraxius
                </div>
              </div>

              {/* Rows */}
              <div className="mt-6 divide-y" style={{ borderColor: "var(--divider)" }}>
                <div className="grid grid-cols-3 gap-4 py-4">
                  <div className="font-dm-sans" style={{ color: "var(--text-secondary)", fontSize: "16px" }}>Signal confidence</div>
                  <div className="text-center font-dm-sans" style={{ color: "var(--red)", fontSize: "16px" }}>Low</div>
                  <div className="text-center font-dm-sans" style={{ color: "var(--amber)", fontSize: "16px" }}>High</div>
                </div>
                <div className="grid grid-cols-3 gap-4 py-4">
                  <div className="font-dm-sans" style={{ color: "var(--text-secondary)", fontSize: "16px" }}>Claim validation</div>
                  <div className="text-center font-dm-sans" style={{ color: "var(--red)", fontSize: "16px" }}>Manual</div>
                  <div className="text-center font-dm-sans" style={{ color: "var(--amber)", fontSize: "16px" }}>Automated</div>
                </div>
                <div className="grid grid-cols-3 gap-4 py-4">
                  <div className="font-dm-sans" style={{ color: "var(--text-secondary)", fontSize: "16px" }}>Decision risk</div>
                  <div className="text-center font-dm-sans" style={{ color: "var(--red)", fontSize: "16px" }}>High</div>
                  <div className="text-center font-dm-sans" style={{ color: "var(--amber)", fontSize: "16px" }}>Reduced</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
