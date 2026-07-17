import { describe, expect, it } from "vitest";
import { cumbreraRedondeada } from "@/lib/geometry/cumbrera";

const ancho = 150;
const alto = 100;
const caida = 20;
const a = ancho / 2;
// Radio máximo geométrico: el arco pasa por los dos hombros (sin vertientes).
const rMax = (a ** 2 + caida ** 2) / (2 * caida);

describe("cumbreraRedondeada", () => {
  it("exige datos completos", () => {
    expect(cumbreraRedondeada(ancho, alto, 0, 30)).toBeNull();
    expect(cumbreraRedondeada(ancho, alto, caida, 0)).toBeNull();
    expect(cumbreraRedondeada(0, alto, caida, 30)).toBeNull();
  });

  it("el punto de tangencia está sobre el arco y la vertiente es tangente", () => {
    const cum = cumbreraRedondeada(ancho, alto, caida, 30)!;
    const { centro, tangenteIzquierda: t } = cum;
    // sobre la circunferencia
    expect(Math.hypot(t.x - centro.x, t.y - centro.y)).toBeCloseTo(cum.radio, 9);
    // tangencia: (S − T) ⟂ (T − C), con S el hombro izquierdo
    const s = { x: 0, y: alto - caida };
    const st = { x: s.x - t.x, y: s.y - t.y };
    const tc = { x: t.x - centro.x, y: t.y - centro.y };
    expect(st.x * tc.x + st.y * tc.y).toBeCloseTo(0, 6);
    // la vertiente mide la distancia hombro–tangente
    expect(cum.vertiente).toBeCloseTo(Math.hypot(st.x, st.y), 9);
  });

  it("con radio máximo desaparecen las vertientes (arco completo)", () => {
    const cum = cumbreraRedondeada(ancho, alto, caida, rMax)!;
    expect(cum.vertiente).toBeCloseTo(0, 9);
    expect(cum.arco).toBeCloseTo(2 * rMax * Math.asin(a / rMax), 9);
  });

  it("con radio pequeño tiende al pico puro del TIPO 02", () => {
    const cum = cumbreraRedondeada(ancho, alto, caida, 0.001)!;
    const pico = 2 * Math.hypot(a, caida);
    expect(2 * cum.vertiente + cum.arco).toBeCloseTo(pico, 2);
  });

  it("un radio imposible se acota al máximo geométrico", () => {
    const cum = cumbreraRedondeada(ancho, alto, caida, 10_000)!;
    expect(cum.radio).toBeCloseTo(rMax, 9);
  });

  it("la longitud de cubierta queda entre el pico y el arco completo", () => {
    const arcoCompleto = 2 * rMax * Math.asin(a / rMax);
    const pico = 2 * Math.hypot(a, caida);
    const cubierta = (r: number) => {
      const c = cumbreraRedondeada(ancho, alto, caida, r)!;
      return 2 * c.vertiente + c.arco;
    };
    // a igual alto total, redondear la cumbrera alarga ligeramente la lona
    expect(cubierta(30)).toBeGreaterThan(pico);
    expect(cubierta(30)).toBeLessThan(arcoCompleto);
    expect(cubierta(20)).toBeLessThan(cubierta(60));
  });
});
