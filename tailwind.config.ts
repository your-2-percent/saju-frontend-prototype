// tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  content: [
    "./index.html",
    "./public/index.html",
    "./src/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    screens: {          // ✅ extend 말고 여기!
      desk: "991px",
    },
    extend: {},         // 나머지 확장은 여기
    
  },
  plugins: [],
  darkMode: "class"
} satisfies Config;
