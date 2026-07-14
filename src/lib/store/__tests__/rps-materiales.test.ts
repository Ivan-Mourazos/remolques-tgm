import { describe, expect, it } from "vitest";
import { rowsToMateriales } from "@/lib/store/rps-materiales";

describe("rowsToMateriales", () => {
  it("mapea CodArticle/Description con trim y descarta vacíos", () => {
    const out = rowsToMateriales([
      { CodArticle: "ALPHAAZ15P250 ", Description: " LONA ALPHA 1L 580 g/m² :AZUL 5015 :250 AN (580)" },
      { CodArticle: "  ", Description: "SIN CODIGO" },
    ]);
    expect(out).toEqual([
      {
        codigoBobina: "ALPHAAZ15P250",
        nombre: "LONA ALPHA 1L 580 g/m² :AZUL 5015 :250 AN (580)",
      },
    ]);
  });
});
