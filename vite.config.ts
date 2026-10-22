import { defineConfig, type Plugin } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Content Security Policy for the built site: scripts, data and workers only from this site,
// map tiles from OneMap, fonts from Google. connect-src 'self' means page code can't send
// anything (such as a saved floor plan) to another server. Dev keeps Vite's defaults.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://www.onemap.gov.sg",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'self' blob:",
  "frame-src 'self' blob:",
  "base-uri 'self'",
  "form-action 'none'",
].join("; ");

const contentSecurityPolicy = (): Plugin => ({
  name: "content-security-policy",
  apply: "build",
  transformIndexHtml: () => [{ tag: "meta", attrs: { "http-equiv": "Content-Security-Policy", content: CSP }, injectTo: "head-prepend" }],
});

// Relative base so the same build works on Vercel (root) and GitHub Pages (/<repo>/).
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss(), contentSecurityPolicy()],
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
  },
});
