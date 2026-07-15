import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS, findClienteBaqueton, findRecogida } from "@/lib/calc/params";

describe("DEFAULT_PARAMS (hoja PAR)", () => {
  it("tiene las 7 recogidas con sus demasías", () => {
    const nombres = DEFAULT_PARAMS.recogidas.map((r) => r.nombre);
    expect(nombres).toEqual([
      "NO", "GOMA", "CREMALLERA", "VELCRO",
      "PUENTES ESVA", "PUENTES LATERALES", "PUENTES HIJOS DE PEDRO LOPEZ",
    ]);
    expect(findRecogida(DEFAULT_PARAMS, "GOMA")).toMatchObject({ delante: 27, atras: 27 });
    expect(findRecogida(DEFAULT_PARAMS, "PUENTES LATERALES")).toMatchObject({
      delante: 41, atras: 21, lateralSoloAtras: 9, lateralSoloDelante: 9,
    });
    expect(findRecogida(DEFAULT_PARAMS, "PUENTES HIJOS DE PEDRO LOPEZ")).toMatchObject({
      delante: 42.5, atras: 42.5, lateralSoloAtras: 11.5, lateralSoloDelante: 9,
    });
    expect(findRecogida(DEFAULT_PARAMS, "no existe").nombre).toBe("NO");
  });

  it("constantes de lona", () => {
    expect(DEFAULT_PARAMS.demasiaAlto).toBe(4.5);
    expect(DEFAULT_PARAMS.demasiaContornoNormal).toBe(3);
    expect(DEFAULT_PARAMS.demasiaContornoEnfundar).toBe(13);
    expect(DEFAULT_PARAMS.demasiaLonaHecha).toBe(1);
    expect(DEFAULT_PARAMS.pasoOllaosDefecto).toBe(35);
    expect(DEFAULT_PARAMS.primerOllao).toBe(2.5);
  });

  it("clientes de baquetón con demasías aditivas", () => {
    expect(findClienteBaqueton(DEFAULT_PARAMS, "HIJOS DE PEDRO LOPEZ")).toMatchObject({
      extraLargoCostura: 11, extraAnchoCostura: 2,
      extraBaquetonLargoDelante: 1, extraBaquetonLargoDetras: 11,
      extraLargoFinal: 0, extraAnchoFinal: 0, extraBaquetonTrasero: 10,
    });
    expect(findClienteBaqueton(DEFAULT_PARAMS, "AYALA")).toMatchObject({
      extraLargoCostura: 1, extraAnchoCostura: 1, extraLargoFinal: 1, extraAnchoFinal: 1,
    });
    expect(findClienteBaqueton(DEFAULT_PARAMS, "GENERAL WOLDER")).toMatchObject({
      extraLargoCostura: -1, extraAnchoCostura: -1,
      extraBaquetonLargoDelante: -0.5, extraBaquetonLargoDetras: -0.5,
    });
    expect(findClienteBaqueton(DEFAULT_PARAMS, "GENERAL WOLDER").observaciones).toHaveLength(3);
    expect(findClienteBaqueton(DEFAULT_PARAMS, "").nombre).toBe("GENERAL");
  });
});
