import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0b1220",
          800: "#111a2e",
          700: "#16213b",
          600: "#1e2d4d",
        },
        teal: {
          DEFAULT: "#14b8a6",
          soft: "#2dd4bf",
        },
        amber: {
          DEFAULT: "#f59e0b",
          soft: "#fbbf24",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
