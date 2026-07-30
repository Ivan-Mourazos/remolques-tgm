import { describe, expect, it } from "vitest";
import { colorBaseMaterial, coloresMaterial } from "@/lib/geometry/color-lona";
import { luminancia, VALOR_CARA } from "@/lib/geometry/tono";

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

describe("coloresMaterial pasa por la escala de valores", () => {
  const MATERIALES = ["AZUL 5015", "VERDE 6024", "NEGRO 9005", "BLANCO 9010", "ROJO"];

  it("da a cada cara exactamente su valor, con cualquier material", () => {
    for (const material of MATERIALES) {
      const c = coloresMaterial(material);
      expect(luminancia(c.techoClaro)).toBeCloseTo(VALOR_CARA.techoClaro, 2);
      expect(luminancia(c.techo)).toBeCloseTo(VALOR_CARA.techo, 2);
      expect(luminancia(c.lateralClaro)).toBeCloseTo(VALOR_CARA.lateralClaro, 2);
      expect(luminancia(c.lateral)).toBeCloseTo(VALOR_CARA.lateral, 2);
    }
  });

  it("mantiene el orden de claridad entre caras aunque el material sea muy oscuro o muy claro", () => {
    // Es lo que el sistema anterior no garantizaba: con una lona negra, el
    // «techo claro» salía más oscuro que el «lateral» de una lona blanca.
    for (const material of ["NEGRO 9005", "BLANCO 9010"]) {
      const c = coloresMaterial(material);
      expect(luminancia(c.techoClaro)).toBeGreaterThan(luminancia(c.techo));
      expect(luminancia(c.techo)).toBeGreaterThan(luminancia(c.lateralClaro));
      expect(luminancia(c.lateralClaro)).toBeGreaterThan(luminancia(c.lateral));
    }
  });

  it("la cubierta de una lona negra es más clara que el lateral de una blanca", () => {
    expect(luminancia(coloresMaterial("NEGRO 9005").techoClaro))
      .toBeGreaterThan(luminancia(coloresMaterial("BLANCO 9010").lateral));
  });
});
