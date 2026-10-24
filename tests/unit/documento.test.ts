import { describe, expect, it } from "vitest";
import { bloquesDocumento, liquidacion, paginar, paginasAnexo } from "@/lib/documento";
import type { Foto } from "@/lib/types";
import { contrato, textoDe } from "./datos";

const foto = (archivo: string): Foto => ({ archivo, en: "2026-10-24T15:00:00.000Z", por: "Camila Rojas" });

describe("plantillas con Esmer Gómez Delgado", () => {
  it("nombra al acreedor con su cédula, como en los Word originales", () => {
    const t = textoDe(bloquesDocumento(contrato()));
    expect(t).toContain("ACUERDO DE PAGO No. 014 DEL 2026 SUSCRITO");
    expect(t).toContain("ESMER GOMEZ DELGADO identificado con cedula No 1.118.559.507");
    expect(t).toContain("CLAUSULA ACELERATORIA: El señor ESMER GOMEZ DELGADO acreedor");
    expect(t).toContain("tiene para con el señor ESMER GOMEZ DELGADO:");
  });
  it("la compraventa conserva «al señor ESMER GÓMEZ»", () => {
    const t = textoDe(bloquesDocumento(contrato({ tipo: "compraventa", capital: 1_020_000 })));
    expect(t).toContain("al señor ESMER GÓMEZ quien manifiesta recibir");
    expect(t).toContain("por el SEÑOR Gómez Delgado al correo");
  });
});

describe("plantillas con ELEX COMPANY SAS", () => {
  it("cambia nombre, documento y artículo en los acuerdos", () => {
    for (const parche of [
      {},
      { conIntereses: true, tasa: 1.9 },
      { forma: "unico" as const },
      { forma: "unico" as const, conIntereses: true, tasa: 1.9 },
    ]) {
      const t = textoDe(bloquesDocumento(contrato({ acreedor: "elex", ...parche })));
      expect(t).toContain("ELEX COMPANY SAS identificada con NIT 901395864-1");
      expect(t).not.toMatch(/ESMER|1\.118\.559\.507|señor ELEX/);
    }
  });
  it("cambia nombre y artículo en la compraventa", () => {
    const t = textoDe(bloquesDocumento(contrato({ acreedor: "elex", tipo: "compraventa", capital: 1_020_000 })));
    expect(t).toContain("ELEX COMPANY SAS identificada con NIT 901395864-1 en calidad de COMPRADOR");
    expect(t).toContain("a ELEX COMPANY SAS quien manifiesta recibir");
    expect(t).toContain("ELEX COMPANY SAS tendrá 30 días");
    expect(t).not.toMatch(/ESMER|Gómez Delgado/);
  });
});

describe("borrador y periodicidad", () => {
  it("el borrador lleva ____ en vez del número", () => {
    const t = textoDe(bloquesDocumento(contrato({ etapa: "borrador", numero: null, anio: null })));
    expect(t).toContain("ACUERDO DE PAGO No. ____ DEL");
  });
  it("las cuotas semanales van cada 7 días", () => {
    const t = textoDe(bloquesDocumento(contrato({ periodo: "semanal", fechaPago: "2026-11-05", nCuotas: 3 })));
    expect(t).toContain("Primera cuota: El día 05 del mes NOVIEMBRE del año 2026");
    expect(t).toContain("Segunda cuota: El día 12 del mes NOVIEMBRE del año 2026");
    expect(t).toContain("Tercera cuota: El día 19 del mes NOVIEMBRE del año 2026");
  });
  it("a 5 cuotas lista de la primera a la quinta y no más", () => {
    const t = textoDe(bloquesDocumento(contrato({ nCuotas: 5, fechaPago: "2026-11-05" })));
    expect(t).toContain("Quinta cuota: El día 05 del mes MARZO del año 2027");
    expect(t).not.toContain("Sexta cuota");
    expect(liquidacion(contrato({ nCuotas: 5 }))[3][1]).toBe("5 cuotas mensuales de $720.000");
  });
});

describe("anexo de evidencias", () => {
  it("la liquidación resume valor, inicial, capital y total", () => {
    const filas = liquidacion(contrato());
    expect(filas.map((f) => f[0])).toEqual([
      "Valor del producto",
      "Cuota inicial",
      "Capital a financiar",
      "Plan de pagos",
      "Intereses corrientes",
      "Total a pagar",
    ]);
    expect(filas[2][1]).toBe("$3.600.000");
    expect(filas[3][1]).toBe("6 cuotas mensuales de $600.000");
    expect(filas[5][1]).toBe("$3.600.000");
  });
  it("con intereses suma los intereses al total", () => {
    const filas = liquidacion(contrato({ conIntereses: true, tasa: 1.9 }));
    expect(filas[4][1]).toMatch(/1,9 % mensual$/);
    expect(filas[5][1]).not.toBe("$3.600.000");
  });
  it("no hay anexo en una compraventa sin fotos", () => {
    expect(paginasAnexo(contrato({ tipo: "compraventa", precio: null }))).toEqual([]);
  });
  it("ordena las fotos y pasa las entregas extra a otra página", () => {
    const c = contrato({
      fotos: {
        cedulaFrente: foto("a.jpg"),
        frente: foto("b.jpg"),
        detalle: foto("c.jpg"),
        entregas: Array.from({ length: 6 }, (_, i) => foto(`e${i}.jpg`)),
      },
    });
    const paginas = paginasAnexo(c);
    expect(paginas).toHaveLength(2);
    expect(paginas[0].cedula.map((f) => f.titulo)).toEqual(["Cédula de ciudadanía — frente"]);
    expect(paginas[0].equipo.map((f) => f.titulo)).toEqual(["Frente", "Estado y detalles"]);
    expect(paginas[0].entregas).toHaveLength(4);
    expect(paginas[1].entregas.map((f) => f.titulo)).toEqual([
      "Entrega del equipo — foto 5",
      "Entrega del equipo — foto 6",
    ]);
  });
});

describe("paginación", () => {
  it("las firmas no quedan solas y cada plantilla cabe en hojas carta", () => {
    for (const c of [contrato(), contrato({ nCuotas: 12 }), contrato({ tipo: "compraventa", capital: 1_020_000 })]) {
      const hojas = paginar(bloquesDocumento(c), c.tipo === "compraventa");
      expect(hojas.length).toBeGreaterThan(0);
      const ultima = hojas[hojas.length - 1];
      expect(ultima[ultima.length - 1].tipo).toBe("firmas");
      expect(ultima.length).toBeGreaterThan(1);
    }
  });
});
