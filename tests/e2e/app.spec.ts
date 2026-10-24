import { expect, test } from "@playwright/test";
import { entrar } from "./ayudas";

// Logo oficial e instalación de la app.

test("el ingreso muestra el logo oficial de la tienda", async ({ page }) => {
  await page.goto("/login");
  const logo = page.getByRole("img", { name: "esgode, tiendas de tecnología" });
  await expect(logo).toBeVisible();
  await expect(logo.locator("img").first()).toHaveAttribute("src", "/logos/esgode-lockup-ink.png");
});

test("en iPhone la calculadora ofrece instalar la app con los pasos de Safari", async ({ browser }) => {
  // El contexto del staff es un iPhone 13 (agente de Safari en iOS).
  const p = await entrar(browser, "staff");
  await p.goto("/calculadora");
  await p.getByRole("button", { name: "Instalar" }).click();
  const hoja = p.getByRole("dialog", { name: "Instalar Esgode" });
  await expect(hoja).toBeVisible();
  await expect(hoja).toContainText("Agregar a inicio");
  await hoja.getByRole("button", { name: "Ahora no" }).click();
  await expect(p.getByRole("button", { name: "Instalar" })).toHaveCount(0);
  // «Ahora no» se recuerda en este celular.
  await p.reload();
  await expect(p.getByRole("img", { name: "esgode" }).first()).toBeVisible();
  await expect(p.getByRole("button", { name: "Instalar" })).toHaveCount(0);
  await p.context().close();
});

test("el staff ve Mis contratos en el menú de la cuenta", async ({ browser }) => {
  const page = await entrar(browser, "staff");
  await page.goto("/calculadora");
  await page.getByRole("button", { name: /Cuenta de/ }).click();
  await page.getByRole("menuitem", { name: "Mis contratos" }).click();
  await expect(page.getByRole("heading", { name: "Contratos" })).toBeVisible();
  await expect(page.getByRole("radio", { name: /^Borradores/ })).toBeVisible();
  await page.context().close();
});
