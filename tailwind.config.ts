import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#F5F1E8", // 主文字 · 月白
        gold: "#E8C88A", // 金色强调
        "gold-deep": "#967C4E", // 金色暗部
        muted: "#8A8AA3", // 次级灰
        "night-start": "#0B1026",
        "night-end": "#1E1B3A",
        glass: "rgba(255,255,255,0.04)",
        "glass-border": "rgba(255,255,255,0.10)",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Noto Serif SC", "serif"],
        sans: ["var(--font-sans)", "Noto Sans SC", "sans-serif"],
      },
      borderRadius: {
        glass: "24px",
      },
      backdropBlur: {
        glass: "20px",
      },
      backgroundImage: {
        night: "linear-gradient(180deg, #0B1026 0%, #1E1B3A 100%)",
      },
      transitionDuration: {
        fade: "400ms",
      },
    },
  },
  plugins: [],
};

export default config;
