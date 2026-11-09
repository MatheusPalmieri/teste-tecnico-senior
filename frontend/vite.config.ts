/// <reference types="vitest/config" />
import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
  test: {
    environment: "happy-dom",
    globals: true,
    env: {
      VITE_API_URL: "http://localhost:8000/api",
    },
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    sequence: {
      shuffle: true,
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/test/**",
        "**/*.d.ts",
        "**/*.test.{ts,tsx}",
        "src/main.tsx",
        "**/*.config.*",
        "src/**/index.ts",
        "src/**/types.ts",
        "src/app/pages/{check-in,check-out,dashboard,guests,reservations,settings}-page.tsx",
      ],
      thresholds: {
        lines: 92,
        statements: 90,
        branches: 89,
        functions: 85,
      },
    },
  },
});
