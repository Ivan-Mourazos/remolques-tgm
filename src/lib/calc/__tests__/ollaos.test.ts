import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS } from "@/lib/calc/params";
import { calcOllaos } from "@/lib/calc/ollaos";

describe("calcOllaos", () => {
  it("fija primer y último ollao y reparte uniformemente los intermedios", () => {
    const res = calcOllaos(246, 0, 35, DEFAULT_PARAMS);
    expect(res.largo.n).toBe(8);
    expect(res.largo.dist).toBe(34.4);
    expect(res.largo.posiciones).toEqual([2.5, 36.9, 71.4, 105.8, 140.2, 174.6, 209.1, 243.5]);
  });

  it("ambos ejes y acumulado con dist decimal", () => {
    const res = calcOllaos(250, 152, 35, DEFAULT_PARAMS);
    expect(res.largo.n).toBe(8);
    expect(res.largo.dist).toBe(35);
    expect(res.ancho.n).toBe(5);
    expect(res.ancho.dist).toBe(36.8);
    expect(res.ancho.posiciones).toEqual([2.5, 39.3, 76, 112.8, 149.5]);
  });

  it("medida 0 o paso 0 devuelve vacío", () => {
    expect(calcOllaos(0, 100, 35, DEFAULT_PARAMS).largo).toEqual({ n: 0, dist: 0, posiciones: [] });
    expect(calcOllaos(100, 100, 0, DEFAULT_PARAMS).largo.posiciones).toEqual([]);
  });

  it("tope de 12 posiciones", () => {
    const res = calcOllaos(1000, 0, 35, DEFAULT_PARAMS);
    expect(res.largo.n).toBe(29);
    expect(res.largo.posiciones).toHaveLength(12);
  });
});
