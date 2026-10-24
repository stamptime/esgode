import { join } from "node:path";
import { devices, expect, type Browser, type Page } from "@playwright/test";
import { MARCA, estadoE2E } from "./entorno";

export const FOTO = join(__dirname, "fixtures/foto.jpg");
export const CEDULA = join(__dirname, "fixtures/cedula.jpg");

/** Contexto de celular (staff) o de escritorio (admin) con la sesión abierta. */
export async function entrar(browser: Browser, rol: "staff" | "admin"): Promise<Page> {
  const contexto = await browser.newContext(
    rol === "staff"
      ? { ...devices["iPhone 13"], locale: "es-CO", timezoneId: "America/Bogota" }
      : { viewport: { width: 1440, height: 900 }, locale: "es-CO", timezoneId: "America/Bogota" },
  );
  // window.print abre un diálogo del sistema: en pruebas solo se cuenta.
  await contexto.addInitScript(() => {
    (window as unknown as { impresiones: number }).impresiones = 0;
    window.print = () => {
      (window as unknown as { impresiones: number }).impresiones++;
    };
    // El aviso de desarrollo de Next («Insight») tapa botones en el celular.
    document.addEventListener("DOMContentLoaded", () => {
      const estilo = document.createElement("style");
      estilo.textContent = "nextjs-portal { display: none !important; }";
      document.head.append(estilo);
    });
  });
  const page = await contexto.newPage();
  const cuenta = estadoE2E()[rol];
  await page.goto("/login");
  await page.getByLabel("Usuario", { exact: true }).fill(cuenta.usuario);
  await page.getByLabel("Contraseña", { exact: true }).fill(cuenta.clave);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
  return page;
}

export interface OpcionesBorrador {
  nombre: string;
  tipo?: "acuerdo" | "compraventa";
  elex?: boolean;
  periodo?: "Semanal" | "Quincenal" | "Mensual";
  conIntereses?: boolean;
  fotos?: boolean;
}

export const nombrePrueba = (n: string) => `${n} ${MARCA}`;

const radio = (page: Page, grupo: string, opcion: string | RegExp) =>
  page.getByRole("radiogroup", { name: grupo }).getByRole("radio", { name: opcion });

/** Llena los cuatro pasos y crea el borrador para revisión. Devuelve el id del contrato. */
export async function crearBorrador(page: Page, o: OpcionesBorrador): Promise<string> {
  const compra = o.tipo === "compraventa";
  await page.goto("/contratos/nuevo");
  await expect(page.getByRole("heading", { name: "Nuevo contrato" })).toBeVisible();
  // Lo escrito en este celular sin guardar en el servidor se recupera; en las pruebas se empieza de cero.
  const recuperado = page.getByRole("button", { name: "Empezar de nuevo" });
  if (await recuperado.isVisible()) await recuperado.click();
  await expect(page.getByText("Paso 1 de 4")).toBeVisible();

  // Paso 1
  await page.getByRole("radio", { name: compra ? /Compraventa/ : /Acuerdo de pago/ }).click();
  if (o.elex) await radio(page, compra ? "Comprador" : "Acreedor", "Esgode · ELEX").click();
  if (o.conIntereses) await page.getByText("Con intereses corrientes", { exact: true }).click();
  await page.getByRole("button", { name: "Continuar" }).click();

  // Paso 2
  await expect(page.getByText("Paso 2 de 4")).toBeVisible();
  await page.getByLabel("Nombre completo", { exact: true }).fill(o.nombre);
  await page.getByLabel("Cédula", { exact: true }).fill("1118000111");
  await page.getByLabel("Expedida en", { exact: true }).fill("Yopal");
  await page.getByLabel("Dirección de residencia", { exact: true }).fill("Calle 10 # 20-30, barrio Centro");
  await page.getByLabel("Correo para notificaciones", { exact: true }).fill("prueba@correo.com");
  await page.getByLabel("Celular para notificaciones", { exact: true }).fill("3001234567");
  if (o.fotos) {
    await page.getByLabel("Tomar foto: Frente", { exact: true }).setInputFiles(CEDULA);
    await expect(page.getByRole("img", { name: "Frente" })).toBeVisible();
    await page.getByLabel("Tomar foto: Reverso", { exact: true }).setInputFiles(CEDULA);
    await expect(page.getByRole("img", { name: "Reverso" })).toBeVisible();
  }
  await page.getByRole("button", { name: "Continuar" }).click();

  // Paso 3
  await expect(page.getByText("Paso 3 de 4")).toBeVisible();
  await page.getByLabel("Marca", { exact: true }).fill("Apple");
  await page.getByLabel("Modelo", { exact: true }).fill("iPhone 15");
  await page.getByLabel("Color", { exact: true }).fill("Negro");
  await page.getByLabel("Capacidad", { exact: true }).fill("128 GB");
  await page.getByLabel(/^Serial/).fill("F2LXK9ABCD12");
  await page.getByLabel(/^IMEI 1/).fill("351234567890123");
  if (o.fotos) {
    await page.getByLabel("Tomar foto: Frente", { exact: true }).setInputFiles(FOTO);
    await expect(page.getByText("1 de 4")).toBeVisible();
  }
  if (compra) {
    await page.getByText("Compró el equipo en Esgode", { exact: true }).click();
    await page.getByText("No está reportado como hurtado", { exact: true }).click();
    await page.getByText("Sin bloqueos ni deuda con operadores", { exact: true }).click();
  }
  await page.getByRole("button", { name: "Continuar" }).click();

  // Paso 4
  await expect(page.getByText("Paso 4 de 4")).toBeVisible();
  if (compra) {
    await page.getByLabel("Valor de compra", { exact: true }).fill("1020000");
  } else {
    await page.getByLabel("Valor del producto", { exact: true }).fill("4200000");
    await page.getByLabel("Cuota inicial", { exact: true }).fill("600000");
    await expect(page.getByText("$ 3.600.000").first()).toBeVisible();
    if (o.periodo) await radio(page, "Periodicidad de pago", o.periodo).click();
  }
  await page.getByRole("button", { name: "Crear borrador para revisión" }).click();
  await page.waitForURL(/\/contratos\/[0-9a-f-]{36}$/);
  return page.url().split("/").pop()!;
}

/** Administración abre el contrato y lo aprueba. */
export async function aprobar(admin: Page, id: string) {
  await admin.goto(`/contratos/${id}`);
  await admin.getByRole("button", { name: "Aprobar · listo para firmar" }).click();
  await expect(admin.getByRole("heading", { name: "Listo para firmar" })).toBeVisible();
}

/** Dibuja una firma en el recuadro con el mouse (funciona girado o no). */
export async function dibujarFirma(page: Page) {
  const lienzo = page.getByRole("img", { name: "Área para firmar" });
  const caja = (await lienzo.boundingBox())!;
  const x0 = caja.x + caja.width * 0.3;
  const y0 = caja.y + caja.height * 0.3;
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(x0 + i * 8, y0 + (i % 2 ? 30 : -10) + i * 6, { steps: 2 });
  await page.mouse.up();
}
