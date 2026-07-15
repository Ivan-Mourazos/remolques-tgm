import { describe, expect, it } from "vitest";
import { longitudContornoTerminado } from "@/lib/geometry/contorno";

describe("longitudContornoTerminado", () => {
  it("mide laterales y cubierta sin incluir la base inferior", () => {
    expect(longitudContornoTerminado("TIPO 01", 141, 88.4)).toBeCloseTo(317.8, 5);
  });

  it("respeta las esquinas redondeadas del perfil terminado", () => {
    const esperado = 2 * (88.4 - 15) + (141 - 30) + Math.PI * 15;
    expect(longitudContornoTerminado("TIPO 05", 141, 88.4, 0, 15)).toBeCloseTo(esperado, 1);
  });

  it("TIPO 05 exige el radio real para no asumir el del cliente", () => {
    expect(longitudContornoTerminado("TIPO 05", 141, 88.4)).toBe(0);
  });

  it("devuelve cero mientras falten medidas necesarias", () => {
    expect(longitudContornoTerminado("TIPO 03", 0, 88.4, 15)).toBe(0);
    expect(longitudContornoTerminado("TIPO 03", 141, 0, 15)).toBe(0);
  });
});
