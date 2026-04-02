"use client";

import { motion, useInView } from "framer-motion";
import Image from "next/image";
import { useRef } from "react";

export function SiteFooter() {
  const footerRef = useRef(null);
  const isInView = useInView(footerRef, { once: true, margin: "-50px" });

  return (
    <footer
      ref={footerRef}
      className="py-20"
      style={{
        backgroundColor: "var(--bg-primary)",
        borderTop: "1px solid var(--divider)",
      }}
    >
      <div className="vx-container">

        {/* Closing statement */}
        <div className="max-w-[520px]">

          {/* Headline — two lines, each as its own statement */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
            className="font-syne font-extrabold"
            style={{
              fontSize: "clamp(22px, 2.8vw, 34px)",
              lineHeight: "1.2",
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
            }}
          >
            The infrastructure for reliable decisions is being built.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.14, ease: [0.25, 0.1, 0.25, 1] }}
            className="font-syne font-extrabold mt-1"
            style={{
              fontSize: "clamp(22px, 2.8vw, 34px)",
              lineHeight: "1.2",
              color: "var(--amber)",
              letterSpacing: "-0.02em",
              textShadow: "0 0 28px rgba(255,185,0,0.22)",
            }}
          >
            Veraxius is defining it.
          </motion.p>

        </div>

        {/* Bottom bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.66, ease: [0.25, 0.1, 0.25, 1] }}
          className="mt-20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4"
          style={{ borderTop: "1px solid var(--divider)" }}
        >
          {/* Logo */}
          <a href="#" aria-label="Veraxius home" className="flex items-center">
            <Image
              src="/Veraxius Logo FINAL FINAL 2 Horizontal Version-02.png"
              alt="Veraxius"
              width={200}
              height={40}
              priority
              style={{ height: "40px", width: "auto" }}
            />
          </a>

          {/* Copyright */}
          <p
            className="font-dm-mono text-[11px]"
            style={{ color: "var(--text-secondary)", letterSpacing: "0.06em" }}
          >
            © 2026 Veraxius. All rights reserved.
          </p>

          {/* Footer CTA */}
          <a
            href="#early-access"
            className="font-dm-mono font-medium text-[11px] uppercase px-5 py-3 transition-all"
            style={{
              letterSpacing: "0.1em",
              backgroundColor: "var(--amber)",
              color: "var(--bg-primary)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.filter = "brightness(1.08)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.filter = "brightness(1)";
            }}
          >
            Apply for Early Access
          </a>
        </motion.div>

      </div>
    </footer>
  );
}
