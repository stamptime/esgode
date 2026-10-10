import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// Contraseñas con scrypt: "scrypt$<sal>$<hash>", ambos en hex.

export function hashClave(clave: string): string {
  const sal = randomBytes(16);
  return `scrypt$${sal.toString("hex")}$${scryptSync(clave, sal, 32).toString("hex")}`;
}

export function claveCoincide(clave: string, guardado: string): boolean {
  const [esquema, sal, hash] = guardado.split("$");
  if (esquema !== "scrypt" || !sal || !hash) return false;
  const esperado = Buffer.from(hash, "hex");
  const calculado = scryptSync(clave, Buffer.from(sal, "hex"), esperado.length);
  return timingSafeEqual(calculado, esperado);
}
