import { describe, expect, it } from "vitest";
import { nombrePdf } from "@/lib/pdf/ruta-pdf";

describe("nombrePdf", () => {
  it("un PDF por pedido con el sufijo fijo -10", () => {
    expect(nombrePdf("AR2603583")).toBe("AR2603583-10.pdf");
  });

  it("quita los puntos: en PLANTEAMIENTOS los ficheros van sin ellos", () => {
    expect(nombrePdf("AR.26.04329")).toBe("AR2604329-10.pdf");
  });

  it("el mismo pedido escrito de dos formas da el mismo fichero", () => {
    expect(nombrePdf("AR.26.04329")).toBe(nombrePdf("ar 26 04329"));
  });

  it("sanea caracteres inválidos en Windows", () => {
    expect(nombrePdf("AR/26:02796")).toBe("AR2602796-10.pdf");
  });

  it("sin pedido usa SIN-PEDIDO", () => {
    expect(nombrePdf("")).toBe("SIN-PEDIDO-10.pdf");
  });
});
