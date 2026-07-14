import { describe, expect, it } from "vitest";
import { rowsToMateriales } from "@/lib/store/rps-materiales";

describe("rowsToMateriales", () => {
  it("mapea CodArticle/Description/stock con trim y descarta vacíos", () => {
    const out = rowsToMateriales([
      { CodArticle: "ALPHAAZ15P250 ", Description: " LONA ALPHA 1L 580 g/m² :AZUL 5015 :250 AN (580)", StockArzua: 220 },
      { CodArticle: "  ", Description: "SIN CODIGO", StockArzua: 5 },
    ]);
    expect(out).toEqual([
      {
        codigoBobina: "ALPHAAZ15P250",
        nombre: "LONA ALPHA 1L 580 g/m² :AZUL 5015 :250 AN (580)",
        stockArzua: 220,
      },
    ]);
  });

  it("stock nulo/ausente queda como null", () => {
    const out = rowsToMateriales([
      { CodArticle: "X", Description: "LONA X 580 :ROJO :250", StockArzua: null },
      { CodArticle: "Y", Description: "LONA Y 650 :AZUL :250" },
    ]);
    expect(out[0].stockArzua).toBeNull();
    expect(out[1].stockArzua).toBeNull();
  });

  it("solo conserva las familias PVC 580 y 650", () => {
    const out = rowsToMateriales([
      { CodArticle: "A", Description: "LONA ALPHA 1L 580 :AZUL :250" },
      { CodArticle: "B", Description: "LONA G650 2L 650 :ROJO :250" },
      { CodArticle: "C", Description: "LONA STARPLUS 1L 610 :GRIS :250" },
      { CodArticle: "D", Description: "REJILLA 580 :NEGRO :300" },
      { CodArticle: "E", Description: "RESTOS LONA PVC :580 GRAMOS" },
    ]);
    expect(out.map((material) => material.codigoBobina)).toEqual(["A", "B"]);
  });
});
