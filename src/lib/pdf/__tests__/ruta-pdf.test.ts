import { describe, expect, it } from "vitest";
import { nombrePdf } from "@/lib/pdf/ruta-pdf";

describe("nombrePdf", () => {
  it("un PDF por pedido con el sufijo fijo -10", () => {
    expect(nombrePdf("AR2603583")).toBe("AR2603583-10.pdf");
  });
  it("sanea caracteres inválidos en Windows", () => {
    expect(nombrePdf("AR/26:02796")).toBe("AR_26_02796-10.pdf");
  });
  it("sin pedido usa SIN-PEDIDO", () => {
    expect(nombrePdf("")).toBe("SIN-PEDIDO-10.pdf");
  });
});
