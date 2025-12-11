// tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  content: [
    "./index.html",
    "./public/index.html",
    "./src/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    screens: {
      sm: "640px",
      md: "768px",
      desk: "991px", // ← 너가 쓰던 기준
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {},
  },
  plugins: [],
  darkMode: "class",
} satisfies Config;
