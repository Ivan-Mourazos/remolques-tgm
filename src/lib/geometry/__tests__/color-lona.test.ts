import { describe, expect, it } from "vitest";
import { colorBaseMaterial, coloresMaterial } from "@/lib/geometry/color-lona";

describe("color de lona para el planteamiento", () => {
  it("reconoce códigos RAL aunque el texto sea variable", () => {
    expect(colorBaseMaterial("LONA NS86 580: GRIS 7038")).toBe("#b5b8b1");
    expect(colorBaseMaterial("LONA ALPHA: AZUL RAL 5015")).toBe("#2874b2");
  });

  it("reconoce colores de materiales escritos a mano", () => {
    expect(colorBaseMaterial("LONA PVC 650 ROJO ESPECIAL")).toBe("#b82b2f");
  });

  it("usa un neutro estable cuando no reconoce el color", () => {
    const colores = coloresMaterial("LONA MANUAL SIN COLOR");
    expect(colores.techo).toMatch(/^#[0-9a-f]{6}$/);
    expect(colores.lateral).not.toBe(colores.techo);
  });
});
