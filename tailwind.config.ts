import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Exact color system from prompt
        "vx-bg": "#0A0A0B",
        "vx-bg-secondary": "#131417",
        "vx-panel": "#101114",
        "vx-text": "#F5F7FA",
        "vx-text-secondary": "rgba(245, 247, 250, 0.72)",
        "vx-text-tertiary": "rgba(245, 247, 250, 0.48)",
        "vx-text-disabled": "rgba(245, 247, 250, 0.28)",
        "vx-steel": "#6C727F",
        "vx-amber": "#FFB84D",
        "vx-amber-glow": "#FFC978",
        "vx-amber-border": "rgba(255, 184, 77, 0.24)",
        "vx-green": "#57D18C",
        "vx-red": "#FF6B57",
        "vx-blue": "#4DA3FF",
        "vx-divider": "rgba(255, 255, 255, 0.08)",
        "vx-divider-strong": "rgba(255, 255, 255, 0.12)",
      },
      fontFamily: {
        syne: ["var(--font-syne)", "sans-serif"],
        "dm-sans": ["var(--font-dm-sans)", "sans-serif"],
        "dm-mono": ["var(--font-dm-mono)", "monospace"],
      },
      maxWidth: {
        "vx-content": "1100px",
      },
      backgroundImage: {
        "vx-gradient-primary-secondary": "linear-gradient(180deg, #0A0A0B 0%, #131417 100%)",
        "vx-gradient-secondary-primary": "linear-gradient(180deg, #131417 0%, #0A0A0B 100%)",
        "vx-amber-gradient": "linear-gradient(90deg, #FFB84D 0%, #FFC978 100%)",
        "vx-red-gradient": "linear-gradient(90deg, #FF6B57 0%, transparent 100%)",
      },
      letterSpacing: {
        "eyebrow": "0.18em",
        "cta": "0.08em",
        "label": "0.15em",
        "logo": "0.12em",
      },
      animation: {
        "pulse-slow": "pulse 2s ease-in-out infinite",
        "count-up": "countUp 1s ease-out forwards",
      },
      keyframes: {
        countUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
