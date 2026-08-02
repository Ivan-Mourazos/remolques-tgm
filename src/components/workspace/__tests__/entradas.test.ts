import { describe, expect, it } from "vitest";
import { emptyLona, emptyBaqueton } from "@/components/workspace/entradas-vacias";
import { calcLona } from "@/lib/calc/lona";
import { calcBaqueton } from "@/lib/calc/baqueton";
import { DEFAULT_PARAMS } from "@/lib/calc/params";

describe("entradas vacías", () => {
  it("calculan sin lanzar aunque estén a cero (como el Excel con IFERROR)", () => {
    expect(() => calcLona(emptyLona(), DEFAULT_PARAMS)).not.toThrow();
    expect(() => calcBaqueton(emptyBaqueton(), DEFAULT_PARAMS)).not.toThrow();
    expect(calcLona(emptyLona(), DEFAULT_PARAMS).panoContorno).toBeNull();
    expect(calcLona(emptyLona(), DEFAULT_PARAMS).ollaos.largo.posiciones).toEqual([]);
  });
  it("paso de ollaos por defecto 35", () => {
    expect(emptyLona().pasoOllaos).toBe(35);
    expect(emptyBaqueton().pasoOllaos).toBe(35);
  });
});

describe("una entrada vacía no puede estar completa", () => {
  it("la lona arranca con las seis decisiones sin tomar", () => {
    const lona = emptyLona();
    expect(lona.tipoPerfil).toBe("");
    expect(lona.modoOllaos).toBe("");
    expect(lona.recogeDelante).toBe("");
    expect(lona.recogeAtras).toBe("");
    expect(lona.ventana).toBeNull();
    expect(lona.rotulacion).toBeNull();
    expect(lona.bastillaEnfundar).toBeNull();
  });

  it("el baquetón arranca sin modo de ollaos ni rotulación", () => {
    const baqueton = emptyBaqueton();
    expect(baqueton.modoOllaos).toBe("");
    expect(baqueton.rotulacion).toBeNull();
  });
});
