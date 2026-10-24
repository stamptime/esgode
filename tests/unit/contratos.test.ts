import { describe, expect, it } from "vitest";
import {
  COPIAS,
  capitalDe,
  codigoContrato,
  copiaInfo,
  erroresContrato,
  estadoDe,
  faltantes,
  isoDia,
  letras,
  limpiarContrato,
  numeroConSigla,
  numeroContrato,
  pasoCompleto,
  planDe,
  sumarPeriodos,
  tasaPeriodo,
  valoresCuotas,
  vencidas,
} from "@/lib/contratos";
import type { ContratoNuevo } from "@/lib/types";
import { contrato, nuevo } from "./datos";

describe("números en letras", () => {
  it("escribe el valor como va en el contrato", () => {
    expect(letras(3_600_000)).toBe("tres millones seiscientos mil pesos");
    expect(letras(10_000_000)).toBe("diez millones de pesos");
    expect(letras(1_021_000)).toBe("un millón veintiún mil pesos");
  });
});

describe("número del contrato", () => {
  it("el borrador no tiene número", () => {
    const c = contrato({ etapa: "borrador", numero: null, anio: null });
    expect(numeroContrato(c)).toBe("sin número");
    expect(numeroConSigla(c)).toBe("Borrador sin número");
    expect(codigoContrato(c)).toMatch(/^ESG-AP-\d{4}-____$/);
  });
  it("acuerdo y compraventa usan su formato", () => {
    expect(numeroContrato(contrato())).toBe("No. 014 del 2026");
    expect(numeroConSigla(contrato({ tipo: "compraventa", numero: 3 }))).toBe("CV No. 26-03 del 2026");
  });
});

describe("copias", () => {
  it("son Original, Contabilidad, Tienda y Gerencia", () => {
    expect(COPIAS).toEqual(["original", "contabilidad", "tienda", "gerencia"]);
    expect(copiaInfo("tienda", "acuerdo").doc).toBe("SOPORTE 2 DE 3 · TIENDA");
    expect(copiaInfo("original", "compraventa").nombre).toBe("Original · Vendedor");
  });
});

describe("periodicidad", () => {
  const base = new Date(2026, 10, 5);
  it("semanal suma 7 días, quincenal 15 y mensual el mismo día del mes", () => {
    expect(isoDia(sumarPeriodos(base, 2, "semanal"))).toBe("2026-11-19");
    expect(isoDia(sumarPeriodos(base, 2, "quincenal"))).toBe("2026-12-05");
    expect(isoDia(sumarPeriodos(base, 2, "mensual"))).toBe("2027-01-05");
  });
  it("la tasa del periodo es la equivalente de la mensual", () => {
    expect(tasaPeriodo(1.9, "mensual")).toBeCloseTo(0.019, 10);
    expect(Math.pow(1 + tasaPeriodo(1.9, "quincenal"), 2)).toBeCloseTo(1.019, 10);
    expect(Math.pow(1 + tasaPeriodo(1.9, "semanal"), 52 / 12)).toBeCloseTo(1.019, 10);
  });
});

describe("cuotas", () => {
  it("sin intereses suman el capital exacto (la última ajusta)", () => {
    const v = valoresCuotas(1_000_000, 3, 0, false);
    expect(v.reduce((a, b) => a + b, 0)).toBe(1_000_000);
    expect(v).toEqual([333_333, 333_333, 333_334]);
  });
  it("con intereses usan la tasa del periodo", () => {
    const mensual = valoresCuotas(3_600_000, 6, 1.9, true, "mensual")[0];
    const semanal = valoresCuotas(3_600_000, 6, 1.9, true, "semanal")[0];
    expect(mensual).toBe(Math.round((3_600_000 * 0.019) / (1 - Math.pow(1.019, -6))));
    expect(semanal).toBeLessThan(mensual);
    expect(semanal).toBeGreaterThan(600_000);
  });
  it("el plan semanal pone las fechas cada 7 días", () => {
    const plan = planDe(nuevo({ periodo: "semanal", fechaPago: "2026-11-05", nCuotas: 3 }), 0, new Date(2026, 9, 24));
    expect(plan.map((p) => isoDia(p.fecha))).toEqual(["2026-11-05", "2026-11-12", "2026-11-19"]);
  });
  it("el pago único con intereses separa capital e intereses", () => {
    const plan = planDe(nuevo({ forma: "unico", conIntereses: true, intereses: 50_000 }), 1.9, new Date());
    expect(plan.map((p) => p.concepto)).toEqual(["Capital", "Intereses"]);
    expect(plan[1].valor).toBe(50_000);
  });
});

describe("capital a financiar", () => {
  it("en acuerdos es el valor del producto menos la cuota inicial", () => {
    expect(capitalDe(nuevo({ precio: 4_200_000, inicial: 600_000, capital: 1 }))).toBe(3_600_000);
  });
  it("en compraventa y en contratos anteriores es el capital escrito", () => {
    expect(capitalDe(nuevo({ tipo: "compraventa", capital: 1_020_000 }))).toBe(1_020_000);
    expect(capitalDe(nuevo({ precio: null, inicial: null, capital: 900_000 }))).toBe(900_000);
  });
});

describe("validación", () => {
  const conCapital = (d: ContratoNuevo) => ({ ...d, capital: capitalDe(d) });

  it("un contrato completo no tiene errores", () => {
    expect(erroresContrato(conCapital(nuevo()))).toEqual({});
  });
  it("la dirección es obligatoria también en acuerdos", () => {
    const d = nuevo();
    d.cliente.dir = " ";
    expect(erroresContrato(d, 2).dir).toMatch(/dirección/);
  });
  it("el IMEI tiene 15 dígitos y el primero es obligatorio en compraventa", () => {
    const corto = nuevo({ equipo: { ...nuevo().equipo, imeis: ["12345"] } });
    expect(erroresContrato(corto, 3).imei0).toMatch(/15 dígitos/);
    const sinImei = nuevo({ tipo: "compraventa", equipo: { ...nuevo().equipo, imeis: [""] } });
    expect(erroresContrato(sinImei, 3).imei0).toMatch(/obligatorio/);
    const portatil = nuevo({ tipo: "compraventa", equipo: { ...nuevo().equipo, categoria: "portatil", imeis: [] } });
    expect(erroresContrato(portatil, 3).imei0).toBeUndefined();
  });
  it("la cuota inicial debe ser menor que el valor del producto", () => {
    expect(erroresContrato(conCapital(nuevo({ inicial: 4_200_000 })), 4).inicial).toMatch(/menor/);
  });
  it("con intereses exige tasa y no deja pasar la usura", () => {
    expect(erroresContrato(conCapital(nuevo({ conIntereses: true, tasa: 0 })), 4).tasa).toMatch(/tasa mensual/);
    expect(erroresContrato(conCapital(nuevo({ conIntereses: true, tasa: 2.5 })), 4, 2.1).tasa).toMatch(/usura/);
    expect(erroresContrato(conCapital(nuevo({ conIntereses: true, tasa: 2.0 })), 4, 2.1).tasa).toBeUndefined();
  });
  it("la fecha de pago debe ser posterior a hoy", () => {
    expect(erroresContrato(conCapital(nuevo({ fechaPago: "2020-01-01" })), 4).fechaPago).toMatch(/posterior/);
  });
  it("lista lo que falta y qué pasos están completos", () => {
    const d = nuevo({ equipo: { ...nuevo().equipo, marca: "" } });
    expect(pasoCompleto(d, 2)).toBe(true);
    expect(pasoCompleto(d, 3)).toBe(false);
    expect(faltantes(conCapital(d))).toEqual(["Escribe la marca."]);
  });
});

describe("estado", () => {
  const hoy = new Date(2026, 11, 20);
  it("sigue las etapas y la cartera", () => {
    expect(estadoDe(contrato({ etapa: "borrador" }))).toBe("borrador");
    expect(estadoDe(contrato())).toBe("porfirmar");
    const firmado = contrato({ etapa: "firmado", firma: "digital", fechaPago: "2026-11-05" });
    expect(estadoDe(firmado, hoy)).toBe("mora");
    expect(vencidas(firmado, hoy)).toHaveLength(2);
    expect(estadoDe({ ...firmado, pagos: Array(2).fill({ en: "", por: "" }) }, hoy)).toBe("aldia");
    expect(estadoDe({ ...firmado, pagos: Array(6).fill({ en: "", por: "" }) }, hoy)).toBe("pagado");
    expect(estadoDe(contrato({ etapa: "firmado", tipo: "compraventa" }), hoy)).toBe("cerrado");
    expect(estadoDe(contrato({ anulado: true }))).toBe("anulado");
  });
});

describe("limpieza de lo que llega del formulario", () => {
  it("corrige formas, calcula el capital y deja solo dígitos en los IMEI", () => {
    const sucio = {
      ...nuevo(),
      tipo: "otra cosa",
      acreedor: "nadie",
      periodo: "diario",
      capital: 1,
      tasa: 1.9,
      equipo: { ...nuevo().equipo, imeis: ["35-1234 5678", "", "1", "2", "3"] },
      cliente: { ...nuevo().cliente, nombre: "  Laura   " },
    } as unknown as ContratoNuevo;
    const d = limpiarContrato(sucio);
    expect(d.tipo).toBe("acuerdo");
    expect(d.acreedor).toBe("esmer");
    expect(d.periodo).toBe("mensual");
    expect(d.capital).toBe(3_600_000);
    expect(d.tasa).toBe(0); // sin intereses no hay tasa
    expect(d.equipo.imeis).toEqual(["3512345678", "", "1", "2"]);
    expect(d.cliente.nombre).toBe("Laura");
  });
  it("en compraventa no guarda valor del producto ni plan", () => {
    const d = limpiarContrato(nuevo({ tipo: "compraventa", capital: 1_020_000, forma: "unico" }));
    expect(d.precio).toBeNull();
    expect(d.inicial).toBeNull();
    expect(d.nCuotas).toBe(1);
    expect(d.fechaPago).toBe("");
    expect(d.capital).toBe(1_020_000);
  });
  it("conserva ELEX y la periodicidad elegida", () => {
    const d = limpiarContrato(nuevo({ acreedor: "elex", periodo: "quincenal", conIntereses: true, tasa: 1.75 }));
    expect([d.acreedor, d.periodo, d.tasa]).toEqual(["elex", "quincenal", 1.75]);
  });
});
