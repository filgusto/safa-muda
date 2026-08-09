import { defineConfig, devices } from "@playwright/test";

/**
 * Testes de ponta a ponta dos fluxos críticos.
 *
 * Os testes unitários cobrem o núcleo de domínio; estes cobrem o que só quebra
 * com tudo junto — sessão, banco, revalidação de rota.
 *
 * `E2E_BASE_URL` aponta para uma instância já rodando (a stack do Docker, por
 * exemplo). Sem ela, o Playwright sobe a aplicação sozinho — é o caminho da CI.
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL,
    locale: "pt-BR",
    trace: "on-first-retry",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run start",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
