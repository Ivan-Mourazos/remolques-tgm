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
