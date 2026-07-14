import { describe, expect, it } from "vitest";
import { nombreExcel } from "@/lib/excel/nombre-excel";

describe("nombreExcel", () => {
  it("añade el sufijo interno -10 al nº de pedido", () => {
    expect(nombreExcel("AR.26.02796")).toBe("AR.26.02796-10.xlsx");
  });
  it("sanea caracteres inválidos de Windows y respeta los puntos", () => {
    expect(nombreExcel("AR/26:02796")).toBe("AR_26_02796-10.xlsx");
  });
  it("pedido vacío → SIN-PEDIDO", () => {
    expect(nombreExcel("")).toBe("SIN-PEDIDO-10.xlsx");
  });
});
