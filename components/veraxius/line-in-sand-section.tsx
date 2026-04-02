"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const contrasts = [
  { trust: "Trust is assumed.", integrity: "Integrity is measured." },
  { trust: "Trust is claimed.", integrity: "Integrity is proven." },
  { trust: "Trust expires.", integrity: "Integrity adapts." },
];

// Wraps the word "Integrity" in the brand accent color
function HighlightIntegrity({ text }: { text: string }) {
  const parts = text.split(/(Integrity)/);
  return (
    <>
      {parts.map((part, i) =>
        part === "Integrity" ? (
          <span
            key={i}
            style={{
              color: "var(--amber)",
            }}
          >
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
}

export function LineInSandSection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      ref={sectionRef}
      className="vx-section"
      style={{ backgroundColor: "var(--bg-secondary)" }}
    >
      <div className="vx-container">
        <div className="max-w-[800px] mx-auto text-center">

          {/* Headline with animated strikethrough */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            className="relative inline-block"
          >
            <h2
              className="font-syne font-extrabold"
              style={{
                fontSize: "clamp(36px, 5vw, 64px)",
                lineHeight: "1.1",
                color: "var(--text-primary)",
              }}
            >
              Trust is no longer enough.
            </h2>
          </motion.div>

          {/* Eyebrow label between columns */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
            className="mt-12 flex items-center justify-center gap-3"
          >
            <div className="w-12 h-px" style={{ backgroundColor: "var(--amber)" }} />
            <span
              className="font-dm-mono text-[11px] uppercase"
              style={{ letterSpacing: "0.18em", color: "var(--amber)" }}
            >
              From belief → to verification
            </span>
            <div className="w-12 h-px" style={{ backgroundColor: "var(--amber)" }} />
          </motion.div>

          {/* Contrast Rows — increased spacing for breathing room */}
          <div className="mt-10 space-y-12">
            {contrasts.map((row, index) => {
              const rowDelay = 0.2 + 0.15 * index;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -24 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{
                    duration: 0.6,
                    delay: rowDelay,
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                  className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-8 items-center"
                >
                  {/* Left — Trust side (animated strikethrough) */}
                  <div className="flex justify-end w-full">
                    <div className="relative inline-block">
                      <span
                        className="font-syne font-semibold"
                        style={{
                          fontSize: "clamp(18px, 2.5vw, 28px)",
                          color: "var(--text-tertiary)",
                        }}
                      >
                        {row.trust}
                      </span>
                      <motion.div
                        style={{
                          position: "absolute",
                          left: 0,
                          right: 0,
                          top: "52%",
                          height: "1.5px",
                          backgroundColor: "var(--text-tertiary)",
                          transformOrigin: "left",
                        }}
                        initial={{ scaleX: 0 }}
                        animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
                        transition={{
                          duration: 0.5,
                          delay: rowDelay + 0.3,
                          ease: "easeIn",
                        }}
                      />
                    </div>
                  </div>

                  {/* Divider vertical — draws top→bottom */}
                  <motion.div
                    className="hidden md:block w-px h-8"
                    style={{
                      backgroundColor: "var(--amber)",
                      transformOrigin: "top",
                    }}
                    initial={{ scaleY: 0 }}
                    animate={isInView ? { scaleY: 1 } : { scaleY: 0 }}
                    transition={{ duration: 0.6, delay: rowDelay + 0.2, ease: "easeInOut" }}
                  />

                  {/* Divider horizontal (mobile) — draws left→right */}
                  <motion.div
                    className="md:hidden h-px w-16 mx-auto"
                    style={{
                      backgroundColor: "var(--amber)",
                      transformOrigin: "left",
                    }}
                    initial={{ scaleX: 0 }}
                    animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
                    transition={{ duration: 0.6, delay: rowDelay + 0.2, ease: "easeInOut" }}
                  />

                  {/* Right — Integrity side with highlighted word */}
                  <div
                    className="font-syne font-semibold text-left"
                    style={{
                      fontSize: "clamp(18px, 2.5vw, 28px)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <HighlightIntegrity text={row.integrity} />
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Closing block */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            className="mt-16"
          >
            <p
              className="font-dm-sans"
              style={{
                fontSize: "17px",
                lineHeight: "1.65",
                color: "var(--text-secondary)",
              }}
            >
              Trust asks you to believe. Integrity forces verification. In a world where
              fabrication is easy, belief becomes risk. Veraxius replaces trust with a
              system that:
            </p>
            <ul
              className="mt-4 space-y-2 flex flex-col items-center"
              style={{ listStyle: "none", padding: 0 }}
            >
              {["Measures credibility", "Adapts over time", "Resists manipulation"].map(
                (item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 font-dm-sans"
                    style={{ fontSize: "17px", color: "var(--amber)", lineHeight: "1.65" }}
                  >
                    <span style={{ color: "var(--amber)", fontWeight: 500 }}>•</span>
                    <span>{item}</span>
                  </li>
                )
              )}
            </ul>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
