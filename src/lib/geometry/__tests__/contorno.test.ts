import { describe, expect, it } from "vitest";
import { contornoCalculado } from "@/lib/geometry/contorno";

describe("contornoCalculado", () => {
  it("TIPO 01: dos laterales más el techo", () => {
    expect(contornoCalculado("TIPO 01", { ancho: 150, alto: 100 })).toBe(350);
  });

  it("TIPO 02: laterales hasta el hombro más las dos vertientes", () => {
    // hombros a 100-20=80; vertiente = √(75² + 20²) = 77,62
    const v = Math.hypot(75, 20);
    expect(contornoCalculado("TIPO 02", { ancho: 150, alto: 100, aguas: 20 }))
      .toBeCloseTo(2 * 80 + 2 * v, 10);
  });

  it("TIPO 02 sin aguas equivale al recto", () => {
    expect(contornoCalculado("TIPO 02", { ancho: 150, alto: 100, aguas: 0 })).toBe(350);
  });

  it("TIPO 03: exige el radio de cumbrera", () => {
    expect(contornoCalculado("TIPO 03", { ancho: 150, alto: 100, aguas: 20 })).toBeNull();
  });

  it("TIPO 03: vertientes más arco tangente de radio conocido", () => {
    const conRadio = contornoCalculado("TIPO 03", { ancho: 150, alto: 100, aguas: 20, radioCumbrera: 30 })!;
    // queda entre el pico puro (TIPO 02) y el arco completo entre hombros
    const pico = contornoCalculado("TIPO 02", { ancho: 150, alto: 100, aguas: 20 })!;
    const rMax = (75 ** 2 + 20 ** 2) / (2 * 20);
    const arcoCompleto = 2 * 80 + 2 * rMax * Math.asin(75 / rMax);
    expect(conRadio).toBeGreaterThan(pico);
    expect(conRadio).toBeLessThan(arcoCompleto);
    // radio enorme → se acota al arco completo
    expect(contornoCalculado("TIPO 03", { ancho: 150, alto: 100, aguas: 20, radioCumbrera: 99999 }))
      .toBeCloseTo(arcoCompleto, 9);
  });

  it("TIPO 03 sin aguas equivale al recto (no necesita radio)", () => {
    expect(contornoCalculado("TIPO 03", { ancho: 150, alto: 100, aguas: 0 })).toBe(350);
  });

  it("TIPO 04: exige el chaflán y lo aplica en las dos esquinas", () => {
    expect(contornoCalculado("TIPO 04", { ancho: 150, alto: 100 })).toBeNull();
    expect(contornoCalculado("TIPO 04", { ancho: 150, alto: 100, chaflan: 10 }))
      .toBeCloseTo(2 * 90 + 2 * Math.hypot(10, 10) + 130, 10);
  });

  it("TIPO 05: exige el radio y suma los dos cuartos de círculo", () => {
    expect(contornoCalculado("TIPO 05", { ancho: 150, alto: 100 })).toBeNull();
    expect(contornoCalculado("TIPO 05", { ancho: 150, alto: 100, radioEsquina: 25 }))
      .toBeCloseTo(2 * 75 + 100 + Math.PI * 25, 10);
  });

  it("medidas incompletas devuelven null", () => {
    expect(contornoCalculado("TIPO 01", { ancho: 0, alto: 100 })).toBeNull();
    expect(contornoCalculado("TIPO 01", { ancho: 150, alto: 0 })).toBeNull();
  });

  it("acota radio y chaflán a la mitad del ancho y al alto", () => {
    // radio imposible (mayor que ancho/2) se recorta a 75
    expect(contornoCalculado("TIPO 05", { ancho: 150, alto: 100, radioEsquina: 500 }))
      .toBeCloseTo(2 * 25 + 0 + Math.PI * 75, 10);
  });
});
