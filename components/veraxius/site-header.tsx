"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export function SiteHeader() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--divider)]"
      style={{
        backgroundColor: "var(--bg-header)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      <div className="vx-container flex items-center justify-between py-4">
        {/* Logo */}
        <a href="#" aria-label="Veraxius home" className="flex items-center">
          <Image
            src="/Veraxius Logo FINAL FINAL 2 Horizontal Version-02.png"
            alt="Veraxius"
            width={180}
            height={36}
            priority
            style={{ height: "36px", width: "auto" }}
          />
        </a>

        {/* CTA Button */}
        <a
          href="#early-access"
          className="font-dm-mono font-medium text-[11px] tracking-cta uppercase bg-[var(--amber)] text-[var(--bg-primary)] px-5 py-3 transition-colors hover:bg-[var(--amber-glow)]"
          style={{ letterSpacing: "0.08em" }}
        >
          Request Early Access
        </a>
      </div>
    </motion.header>
  );
}
