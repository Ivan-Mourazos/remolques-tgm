import { describe, expect, it } from "vitest";
import { nombrePdf } from "@/lib/pdf/ruta-pdf";

describe("nombrePdf", () => {
  it("pedido-version.pdf", () => {
    expect(nombrePdf("AR.26.02796", "10")).toBe("AR.26.02796-10.pdf");
  });
  it("sin versión: guion y .pdf (como AR.26.03509-.pdf real)", () => {
    expect(nombrePdf("AR.26.03509", "")).toBe("AR.26.03509-.pdf");
  });
  it("sanea caracteres inválidos en Windows", () => {
    expect(nombrePdf("AR/26:02796", "1*")).toBe("AR_26_02796-1_.pdf");
  });
});
