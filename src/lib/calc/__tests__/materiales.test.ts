import { describe, expect, it } from "vitest";
import { MATERIALES_SEED } from "@/lib/calc/materiales-seed";

describe("MATERIALES_SEED (hoja TC)", () => {
  it("50 materiales, sin códigos duplicados", () => {
    expect(MATERIALES_SEED).toHaveLength(50);
    const codigos = MATERIALES_SEED.map((m) => m.codigoBobina);
    expect(new Set(codigos).size).toBe(50);
  });
  it("casos conocidos", () => {
    expect(
      MATERIALES_SEED.find((m) => m.nombre === "LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN")?.codigoBobina,
    ).toBe("ALPHAAZ15P250");
    expect(
      MATERIALES_SEED.find((m) => m.codigoBobina === "NS86GR38P250")?.nombre,
    ).toBe("LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN");
  });
});
