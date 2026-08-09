import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    // `e2e/` é do Playwright, que tem seu próprio runner e precisa de um
    // navegador. Sem esta exclusão o Vitest tenta executá-los e falha.
    exclude: ["node_modules/**", ".next/**", "e2e/**"],
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
