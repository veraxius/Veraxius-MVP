import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "vx-bg": "var(--bg-primary)",
        "vx-bg-secondary": "var(--bg-secondary)",
        "vx-panel": "var(--bg-panel)",
        "vx-text": "var(--text-primary)",
        "vx-text-secondary": "var(--text-secondary)",
        "vx-text-tertiary": "var(--text-tertiary)",
        "vx-text-disabled": "var(--text-disabled)",
        "vx-steel": "var(--steel)",
        "vx-amber": "var(--amber)",
        "vx-amber-glow": "var(--amber-glow)",
        "vx-amber-border": "var(--amber-border)",
        "vx-green": "var(--green)",
        "vx-red": "var(--red)",
        "vx-blue": "var(--blue)",
        "vx-divider": "var(--divider)",
        "vx-divider-strong": "var(--divider-strong)",
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
        "vx-gradient-primary-secondary": "linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)",
        "vx-gradient-secondary-primary": "linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)",
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
