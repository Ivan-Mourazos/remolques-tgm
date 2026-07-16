import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS } from "@/lib/calc/params";
import { normalizarParams, validarParams } from "@/lib/calc/validar-params";

describe("normalizarParams", () => {
  it("rellena campos ausentes con los valores por defecto", () => {
    const p = normalizarParams({ demasiaAlto: 5 });
    expect(p.demasiaAlto).toBe(5);
    expect(p.ajusteContornoBase).toBe(7);
    expect(p.recogidas).toEqual(DEFAULT_PARAMS.recogidas);
  });
  it("con null devuelve los valores por defecto", () => {
    expect(normalizarParams(null)).toEqual(DEFAULT_PARAMS);
  });
});

describe("validarParams", () => {
  it("acepta los parámetros por defecto", () => {
    expect(validarParams(DEFAULT_PARAMS)).toEqual({ ok: true, params: DEFAULT_PARAMS });
  });
  it("rechaza números no finitos o ausentes", () => {
    const res = validarParams({ ...DEFAULT_PARAMS, demasiaAlto: "4,5" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errores.join(" ")).toContain("demasiaAlto");
  });
  it("rechaza paso de ollaos no positivo", () => {
    expect(validarParams({ ...DEFAULT_PARAMS, pasoOllaosDefecto: 0 }).ok).toBe(false);
  });
  it("exige la recogida NO y el cliente GENERAL", () => {
    expect(validarParams({ ...DEFAULT_PARAMS, recogidas: DEFAULT_PARAMS.recogidas.slice(1) }).ok).toBe(false);
    expect(validarParams({ ...DEFAULT_PARAMS, clientesBaqueton: [] }).ok).toBe(false);
  });
  it("rechaza recogidas con demasías no numéricas", () => {
    const rotas = [{ ...DEFAULT_PARAMS.recogidas[0], delante: null }];
    expect(validarParams({ ...DEFAULT_PARAMS, recogidas: rotas }).ok).toBe(false);
  });
});
