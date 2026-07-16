import { describe, expect, it } from "vitest";
import { nombrePdf } from "@/lib/pdf/ruta-pdf";

describe("nombrePdf", () => {
  it("una versión: PEDIDO-VERSION.pdf", () => {
    expect(nombrePdf("AR.26.02796", ["10"])).toBe("AR.26.02796-10.pdf");
  });
  it("varias versiones: un solo PDF por pedido", () => {
    expect(nombrePdf("AR.26.02796", ["10", "11"])).toBe("AR.26.02796.pdf");
  });
  it("sanea caracteres inválidos en Windows", () => {
    expect(nombrePdf("AR/26:02796", ["1*"])).toBe("AR_26_02796-1_.pdf");
  });
  it("sin pedido usa SIN-PEDIDO", () => {
    expect(nombrePdf("", ["10"])).toBe("SIN-PEDIDO-10.pdf");
  });
});
