import { describe, expect, it } from "vitest";
import { nombrePdf } from "@/lib/pdf/ruta-pdf";

describe("nombrePdf", () => {
  it("un PDF por pedido, sin sufijo de versión (el sufijo -10 es de los Excel)", () => {
    expect(nombrePdf("AR.26.02796")).toBe("AR.26.02796.pdf");
  });
  it("sanea caracteres inválidos en Windows", () => {
    expect(nombrePdf("AR/26:02796")).toBe("AR_26_02796.pdf");
  });
  it("sin pedido usa SIN-PEDIDO", () => {
    expect(nombrePdf("")).toBe("SIN-PEDIDO.pdf");
  });
});
