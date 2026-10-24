import { defineConfig, devices } from "@playwright/test";

// Pruebas de punta a punta del módulo de contratos. Corren contra
// E2E_URL (por defecto el servidor local en el puerto 3123) y usan la misma
// base de datos y almacenamiento que producción: todo lo que crean lleva
// «(PRUEBA E2E)» y se borra al terminar (tests/e2e/global-teardown.ts).

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  use: {
    baseURL: process.env.E2E_URL ?? "http://localhost:3123",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "es-CO",
    timezoneId: "America/Bogota",
  },
  projects: [{ name: "celular", use: { ...devices["iPhone 13"], browserName: "chromium" } }],
});
