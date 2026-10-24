import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { borrarBorrador, guardarBorrador, leerBorrador } from "@/lib/borrador";
import { nuevo } from "./datos";

const SIN_JURA = { tradicion: false, hurto: false, bloqueo: false };

beforeEach(() => {
  const datos = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => void datos.set(k, v),
    removeItem: (k: string) => void datos.delete(k),
    key: (i: number) => [...datos.keys()][i] ?? null,
    get length() {
      return datos.size;
    },
  });
  // Object.keys(localStorage) recorre las claves guardadas.
  Object.defineProperty(globalThis.localStorage, Symbol.iterator, { value: () => datos.keys() });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("borrador en el celular", () => {
  it("guarda y recupera por usuario, con el id del borrador del servidor", () => {
    guardarBorrador("u1", { paso: 3, d: nuevo(), jura: SIN_JURA, borradorId: "abc" });
    expect(leerBorrador("u1")?.paso).toBe(3);
    expect(leerBorrador("u1")?.borradorId).toBe("abc");
    expect(leerBorrador("u2")).toBeNull();
  });
  it("vence a las 12 horas", () => {
    vi.useFakeTimers();
    guardarBorrador("u1", { paso: 2, d: nuevo(), jura: SIN_JURA });
    vi.advanceTimersByTime(12 * 60 * 60 * 1000 + 1);
    expect(leerBorrador("u1")).toBeNull();
  });
  it("se borra al crear el borrador para revisión", () => {
    guardarBorrador("u1", { paso: 4, d: nuevo(), jura: SIN_JURA });
    borrarBorrador("u1");
    expect(leerBorrador("u1")).toBeNull();
  });
  it("ignora datos dañados", () => {
    localStorage.setItem("esgode:borrador-contrato:u1", "{no es json");
    expect(leerBorrador("u1")).toBeNull();
  });
});
