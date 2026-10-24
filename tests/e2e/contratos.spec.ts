import { expect, test, type Page } from "@playwright/test";
import { FOTO, aprobar, crearBorrador, dibujarFirma, entrar, nombrePrueba } from "./ayudas";

// Flujo completo: borrador → aprobado → firmado, con fotos, PDF y registro.
// Las pruebas comparten estado (el mismo contrato pasa de una a otra).

test.describe.configure({ mode: "serial" });

let staff: Page;
let admin: Page;
let acuerdoId = "";
let incompletoId = "";
let compraventaId = "";
let numero = "";

test.beforeAll(async ({ browser }) => {
  staff = await entrar(browser, "staff");
  admin = await entrar(browser, "admin");
});

test.afterAll(async () => {
  await staff?.context().close();
  await admin?.context().close();
});

test("el staff llena el formulario con fotos y crea el borrador para revisión", async () => {
  acuerdoId = await crearBorrador(staff, { nombre: nombrePrueba("Laura Pérez"), fotos: true, periodo: "Semanal" });
  await expect(staff.getByRole("heading", { name: "Revisión del contrato" })).toBeVisible();
  await expect(staff.getByText("borrador sin número")).toBeVisible();
  await expect(staff.getByText("Borrador en revisión.")).toBeVisible();
  // El visor del PDF se ve completo (una hoja carta ajustada al ancho).
  const visor = staff.getByRole("document", { name: "Vista previa del PDF" });
  await expect(visor).toBeVisible();
  expect((await visor.boundingBox())!.height).toBeGreaterThan(300);
  await staff.getByRole("button", { name: "Página siguiente" }).click();
  await expect(staff.getByText(/^Página 2 de \d$/).first()).toBeVisible();
  await staff.getByRole("button", { name: "Página anterior" }).click();
  // El PDF lleva la marca y no tiene número.
  await expect(staff.locator(".doc-marca").first()).toHaveText("BORRADOR · NO VÁLIDO");
  await expect(staff.locator(".doc-hoja").first()).toContainText("ACUERDO DE PAGO No. ____");
  // Cuotas semanales: cada 7 días.
  await expect(staff.locator(".doc-hoja").first()).toContainText(/Segunda cuota: El día \d{2} del mes/);
  // Enviar a revisión: WhatsApp con el enlace al borrador y el PDF con marca (no cuenta como copia descargada).
  await expect(staff.getByRole("link", { name: "WhatsApp" })).toHaveAttribute(
    "href",
    new RegExp(`wa\\.me/\\?text=.*contratos%2F${acuerdoId}`),
  );
  await staff.getByRole("link", { name: "Descargar PDF" }).click();
  await staff.waitForURL(/documento\?copias=original&archivo=uno/);
  await expect.poll(() => staff.evaluate(() => (window as unknown as { impresiones: number }).impresiones)).toBe(1);
  await expect(staff.locator(".doc-hoja:not(.doc-oculta) .doc-pie").first()).toContainText(
    "BORRADOR · ORIGINAL · DEUDOR",
  );
  await staff.goto(`/contratos/${acuerdoId}`);
  // El staff no aprueba: espera a administración.
  await expect(staff.getByText("Esperando la aprobación de administración")).toBeVisible();
  await expect(staff.getByRole("button", { name: /Aprobar/ })).toHaveCount(0);
});

test("se puede guardar a medias y seguir desde Mis contratos", async () => {
  await staff.goto("/contratos/nuevo");
  await expect(staff.getByText("Paso 1 de 4")).toBeVisible();
  await staff.getByRole("button", { name: "Continuar" }).click();
  await staff.getByLabel("Nombre completo", { exact: true }).fill(nombrePrueba("Juan Ortiz"));
  await staff.getByRole("button", { name: "Guardar borrador" }).click();
  await expect(staff.getByText("Borrador guardado", { exact: true })).toBeVisible();
  await expect(staff.getByText(/Borrador guardado a las/)).toBeVisible();
  // La URL lleva el borrador: si el navegador recarga (al volver de WhatsApp), sigue en el mismo.
  await expect(staff).toHaveURL(/\/contratos\/nuevo\?borrador=[0-9a-f-]{36}$/);
  await staff.getByLabel("Cédula", { exact: true }).fill("99887766");
  await staff.reload();
  await expect(staff.getByRole("heading", { name: "Editar borrador" })).toBeVisible();
  await expect(staff.getByLabel("Nombre completo", { exact: true })).toHaveValue(nombrePrueba("Juan Ortiz"));
  await expect(staff.getByLabel("Cédula", { exact: true })).toHaveValue("99887766");
  // Empezar un contrato nuevo no trae el borrador guardado: ese sigue en Mis contratos.
  await staff.goto("/contratos/nuevo");
  await expect(staff.getByText("Paso 1 de 4")).toBeVisible();
  await expect(staff.getByText("Recuperamos el contrato")).toHaveCount(0);

  await staff.goto("/contratos");
  const tarjeta = staff.getByRole("link", { name: new RegExp(nombrePrueba("Juan Ortiz").replace(/[()]/g, "\\$&")) });
  await expect(tarjeta).toContainText("Paso 2 de 4");
  await tarjeta.click();
  await staff.waitForURL(/\/contratos\/[0-9a-f-]{36}$/);
  incompletoId = staff.url().split("/").pop()!;
  await staff.getByRole("link", { name: "Editar datos del contrato" }).click();
  await expect(staff.getByRole("heading", { name: "Editar borrador" })).toBeVisible();
  await expect(staff.getByLabel("Nombre completo", { exact: true })).toHaveValue(nombrePrueba("Juan Ortiz"));
});

test("administración no puede aprobar un borrador incompleto", async () => {
  await admin.goto(`/contratos/${incompletoId}`);
  await admin.getByRole("button", { name: "Aprobar · listo para firmar" }).click();
  await expect(admin.getByText(/^Falta corregir el borrador:/)).toBeVisible();
  await expect(admin.getByRole("heading", { name: "Revisión del contrato" })).toBeVisible();
});

test("administración aprueba: se asigna el número y la pantalla del staff se actualiza sola", async () => {
  await staff.goto(`/contratos/${acuerdoId}`);
  await aprobar(admin, acuerdoId);
  const subtitulo = admin.getByText(/Acuerdo de pago No\. \d{3} del \d{4}/);
  await expect(subtitulo).toBeVisible();
  numero = (await subtitulo.textContent())!.match(/No\. \d{3}/)![0];
  // El staff no recarga: la revisión consulta cada 15 s.
  await expect(staff.getByRole("heading", { name: "Listo para firmar" })).toBeVisible({ timeout: 25_000 });
  await expect(staff.locator(".doc-marca")).toHaveCount(0);
  await expect(staff.locator(".doc-hoja").first()).toContainText(`ACUERDO DE PAGO ${numero}`);
});

test("volver a borrador quita la aprobación y conserva el número", async () => {
  await staff.getByRole("button", { name: "Volver a borrador para corregir" }).click();
  await staff.getByRole("button", { name: "Volver a borrador" }).last().click();
  await expect(staff.getByRole("heading", { name: "Revisión del contrato" })).toBeVisible();
  await aprobar(admin, acuerdoId);
  await expect(admin.getByText(new RegExp(`^Acuerdo de pago ${numero} del \\d{4}$`))).toBeVisible();
});

test("la clienta firma en el celular, en horizontal, sin código SMS", async () => {
  await staff.goto(`/contratos/${acuerdoId}`);
  await staff.getByRole("link", { name: "Pasar el celular a la clienta" }).click();
  await expect(staff.getByRole("heading", { name: "Firma tu contrato" })).toBeVisible();
  await expect(staff.getByText(/código/i)).toHaveCount(0);
  await expect(staff.getByRole("button", { name: "Acepta las condiciones" })).toBeDisabled();
  await staff.getByRole("checkbox", { name: /acepto sus condiciones/ }).click();
  await staff.getByRole("button", { name: "Firmar contrato" }).click();

  const hoja = staff.getByRole("dialog", { name: "Firma en horizontal" });
  await expect(hoja).toBeVisible();
  // En vertical, el recuadro se gira 90° para firmar a lo ancho.
  await expect(staff.locator(".firma-giro--rotada")).toBeVisible();
  const firmar = hoja.getByRole("button", { name: "Firmar contrato" });
  await expect(firmar).toBeDisabled();
  await dibujarFirma(staff);
  await firmar.click();
  await expect(staff.getByRole("heading", { name: "Contrato firmado" })).toBeVisible();
  await expect(staff.getByText(/Verificación del documento/)).toBeVisible();
});

test("el PDF firmado lleva la firma, no lleva el anexo de fotos y queda en el historial", async () => {
  await staff.getByRole("link", { name: "Ver contrato firmado y descargar PDF" }).click();
  await expect(staff.getByRole("heading", { name: "Contrato firmado" })).toBeVisible();
  await staff.getByRole("checkbox", { name: /Soporte 3 · Gerencia/ }).click();
  await expect(staff.getByText("3 copias")).toBeVisible();
  await staff.getByRole("link", { name: "Descargar PDF" }).click();
  await staff.waitForURL(/documento\?copias=original,contabilidad,tienda&archivo=uno/);
  await expect.poll(() => staff.evaluate(() => (window as unknown as { impresiones: number }).impresiones)).toBe(1);

  const hojas = staff.locator(".doc-hoja:not(.doc-oculta)");
  await expect(hojas.first()).toContainText("Firmado electrónicamente · verificación");
  await expect(staff.getByRole("img", { name: /Firma de LAURA PÉREZ/ }).first()).toBeVisible();
  // El anexo de evidencias fotográficas está desactivado por ahora.
  await expect(staff.locator(".doc-anexo")).toHaveCount(0);
  await expect(staff.locator(".doc-paginas").first()).not.toContainText("EVIDENCIAS FOTOGRÁFICAS");

  await admin.goto("/admin/contratos");
  await admin.getByRole("cell", { name: numero.replace("No. ", "AP-") }).click();
  await expect(admin.getByText(/Descargado .* · /).first()).toBeVisible();
});

test("después de firmar se agregan evidencias de entrega", async () => {
  await staff.goto(`/contratos/${acuerdoId}`);
  await staff.getByLabel("Tomar foto: Tomar foto").setInputFiles(FOTO);
  await expect(staff.getByText("1 foto en el contrato")).toBeVisible();
  const entrega = staff.getByRole("img", { name: "Entrega 1" });
  await expect(entrega).toBeVisible();
  await expect.poll(() => entrega.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
});

test("las fotos no se ven sin sesión", async ({ browser }) => {
  const anonimo = await browser.newContext();
  const r = await anonimo.request.get(`/api/contratos/${acuerdoId}/fotos/cualquiera.jpg`);
  expect(r.status()).toBe(401);
  const subir = await anonimo.request.post(`/api/contratos/${acuerdoId}/fotos`, { multipart: { hueco: "entrega" } });
  expect(subir.status()).toBe(401);
  await anonimo.close();
});

test("compraventa con ELEX firmada en papel con la foto del original", async () => {
  compraventaId = await crearBorrador(staff, { nombre: nombrePrueba("Diego Ruiz"), tipo: "compraventa", elex: true });
  await expect(staff.locator(".doc-hoja").first()).toContainText(
    "ELEX COMPANY SAS identificada con NIT 901395864-1 en calidad de COMPRADOR",
  );
  await aprobar(admin, compraventaId);
  await staff.goto(`/contratos/${compraventaId}`);
  await staff.getByRole("radio", { name: /Firmar en papel/ }).click();
  await expect(staff.getByRole("group", { name: "Copias incluidas en el PDF" })).toBeVisible();
  await staff.getByLabel("Subir foto del original firmado").setInputFiles(FOTO);
  await expect(staff.getByRole("heading", { name: "Contrato firmado" })).toBeVisible();
  await expect(staff.getByText(/Firmado en papel el/)).toBeVisible();
  await expect(staff.getByRole("img", { name: "Original firmado" })).toBeVisible();
});

test("registro: borradores, eliminar, registrar pago y anular con motivo", async () => {
  await admin.goto("/admin/contratos");
  await admin.getByRole("radio", { name: /^Borradores/ }).click();
  await admin.getByRole("cell", { name: new RegExp("Juan Ortiz") }).click();
  await expect(admin.getByText("Progreso del formulario")).toBeVisible();
  await expect(admin.getByText("Falta completar")).toBeVisible();
  await admin.getByRole("button", { name: "Eliminar borrador" }).click();
  await admin.getByRole("button", { name: "Eliminar borrador" }).last().click();
  await expect(admin.getByRole("cell", { name: new RegExp("Juan Ortiz") })).toHaveCount(0);

  await admin.getByRole("radio", { name: /^Todos/ }).click();
  await admin.getByRole("cell", { name: numero.replace("No. ", "AP-") }).click();
  await expect(admin.getByText("Evidencia de entrega")).toBeVisible();
  await admin.getByRole("button", { name: "Registrar pago" }).click();
  await expect(admin.getByText("Pagada").first()).toBeVisible();

  await admin.getByRole("cell", { name: new RegExp("Diego Ruiz") }).click();
  await admin.getByRole("button", { name: "Anular contrato" }).click();
  await admin.getByLabel("Motivo").fill("Prueba automática de anulación");
  await admin.getByRole("button", { name: "Anular contrato" }).last().click();
  await expect(admin.getByText("Anulado · Prueba automática de anulación.")).toBeVisible();
});
