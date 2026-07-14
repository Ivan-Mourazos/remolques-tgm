import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS } from "@/lib/calc/params";
import { calcOllaos } from "@/lib/calc/ollaos";

describe("calcOllaos", () => {
  it("caso largo 246 paso 35 (verificado en Excel)", () => {
    const res = calcOllaos(246, 0, 35, DEFAULT_PARAMS);
    expect(res.largo.n).toBe(7);
    expect(res.largo.dist).toBe(35.1);
    expect(res.largo.posiciones).toEqual([2.5, 37.6, 72.7, 107.8, 142.9, 178, 213.1]);
  });

  it("ambos ejes y acumulado con dist decimal", () => {
    const res = calcOllaos(250, 152, 35, DEFAULT_PARAMS);
    expect(res.largo.n).toBe(7);
    expect(res.largo.dist).toBe(35.7);
    expect(res.ancho.n).toBe(4);
    expect(res.ancho.dist).toBe(38);
    expect(res.ancho.posiciones).toEqual([2.5, 40.5, 78.5, 116.5]);
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
