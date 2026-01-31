import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import mkcert from "vite-plugin-mkcert";
import path from "path";

export default defineConfig({
  plugins: [react(), mkcert()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  base: "/",
  server: {
    https: {},
    host: "0.0.0.0",
    port: 4173,
  },
});
