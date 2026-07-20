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

  it("TIPO 03 sin radios calcula como pico puro (TIPO 02)", () => {
    const pico = contornoCalculado("TIPO 02", { ancho: 150, alto: 100, aguas: 20 });
    expect(contornoCalculado("TIPO 03", { ancho: 150, alto: 100, aguas: 20, radioCumbrera: 0, radioHombro: 0 }))
      .toBeCloseTo(pico!, 10);
    expect(contornoCalculado("TIPO 03", { ancho: 150, alto: 100, aguas: 20 }))
      .toBeCloseTo(pico!, 10);
  });

  it("TIPO 03: cada radio recorta exactamente su esquina teórica", () => {
    const w = 150, h = 100, c = 20;
    const a = w / 2;
    const theta = Math.atan2(c, a);
    const L = Math.hypot(a, c);
    const vivo = 2 * (h - c) + 2 * L;
    // recorte de una esquina de giro phi y radio r: 2·r·tan(phi/2) − r·phi
    const recorte = (r: number, phi: number) => 2 * r * Math.tan(phi / 2) - r * phi;

    const soloCumbrera = contornoCalculado("TIPO 03", { ancho: w, alto: h, aguas: c, radioCumbrera: 30 })!;
    expect(soloCumbrera).toBeCloseTo(vivo - recorte(30, 2 * theta), 9);

    const soloHombros = contornoCalculado("TIPO 03", { ancho: w, alto: h, aguas: c, radioHombro: 15 })!;
    expect(soloHombros).toBeCloseTo(vivo - 2 * recorte(15, Math.PI / 2 - theta), 9);

    const ambos = contornoCalculado("TIPO 03", { ancho: w, alto: h, aguas: c, radioCumbrera: 30, radioHombro: 15 })!;
    expect(ambos).toBeCloseTo(vivo - recorte(30, 2 * theta) - 2 * recorte(15, Math.PI / 2 - theta), 9);

    // redondear siempre acorta respecto a la esquina viva
    expect(ambos).toBeLessThan(soloCumbrera);
    expect(soloCumbrera).toBeLessThan(vivo);
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
