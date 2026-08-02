import { describe, expect, it } from "vitest";
import { aplicarValor, luminancia, mezcla, VALOR_CARA, VALOR_PLANO } from "@/lib/geometry/tono";

/** Colores muy distintos en tono y en claridad. */
const MATERIALES = ["#2874b2", "#008351", "#1d2025", "#f4f4f0", "#b82b2f"];

describe("luminancia", () => {
  it("va de 0 en negro a 1 en blanco", () => {
    expect(luminancia("#000000")).toBeCloseTo(0, 5);
    expect(luminancia("#ffffff")).toBeCloseTo(1, 5);
  });

  it("pesa el verde más que el rojo y el rojo más que el azul", () => {
    expect(luminancia("#00ff00")).toBeGreaterThan(luminancia("#ff0000"));
    expect(luminancia("#ff0000")).toBeGreaterThan(luminancia("#0000ff"));
  });
});

describe("mezcla", () => {
  it("interpola linealmente entre los dos colores", () => {
    expect(mezcla("#000000", "#ffffff", 0)).toBe("#000000");
    expect(mezcla("#000000", "#ffffff", 1)).toBe("#ffffff");
    expect(mezcla("#000000", "#ffffff", 0.5)).toBe("#808080");
  });
});

describe("aplicarValor", () => {
  it("deja el color con exactamente la luminancia pedida, venga de donde venga", () => {
    for (const material of MATERIALES) {
      for (const valor of [0.2, 0.4, 0.6, 0.85]) {
        expect(luminancia(aplicarValor(material, valor))).toBeCloseTo(valor, 2);
      }
    }
  });

  it("dos materiales distintos dan el mismo gris en la misma cara", () => {
    // El valor codifica la cara, no el material: si no coincidieran, la
    // cubierta de una lona azul se leería como el lateral de una verde.
    const azul = aplicarValor("#2874b2", VALOR_CARA.techo);
    const verde = aplicarValor("#008351", VALOR_CARA.techo);
    expect(luminancia(azul)).toBeCloseTo(luminancia(verde), 2);
  });

  it("conserva el tono, para que el día que haya color siga siendo azul", () => {
    const azulClaro = aplicarValor("#2874b2", 0.8);
    const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(azulClaro.slice(i, i + 2), 16));
    expect(b).toBeGreaterThan(r);
    expect(b).toBeGreaterThan(g);
  });

  it("no se sale del rango aunque le pidan valores imposibles", () => {
    expect(luminancia(aplicarValor("#2874b2", 0))).toBeCloseTo(0, 2);
    expect(luminancia(aplicarValor("#2874b2", 1))).toBeCloseTo(1, 2);
  });
});

describe("VALOR_CARA", () => {
  it("ordena las caras de la más clara a la más oscura", () => {
    expect(VALOR_CARA.techoClaro).toBeGreaterThan(VALOR_CARA.techo);
    expect(VALOR_CARA.techo).toBeGreaterThan(VALOR_CARA.lateralClaro);
    expect(VALOR_CARA.lateralClaro).toBeGreaterThan(VALOR_CARA.lateral);
  });

  it("separa las caras lo bastante para que aguanten una fotocopia", () => {
    const valores = [
      VALOR_CARA.techoClaro, VALOR_CARA.techo,
      VALOR_CARA.lateralClaro, VALOR_CARA.lateral,
    ];
    for (let i = 1; i < valores.length; i++) {
      expect(valores[i - 1] - valores[i]).toBeGreaterThanOrEqual(0.12);
    }
  });

  it("evita los extremos: ni negro empastado ni blanco que desaparece", () => {
    expect(VALOR_CARA.lateral).toBeGreaterThan(0.2);
    expect(VALOR_CARA.techoClaro).toBeLessThan(0.95);
  });
});

describe("VALOR_PLANO", () => {
  it("da a cada plano visible un valor propio", () => {
    // El fallo que esto impide: al aplanar los rellenos, el paño frontal se
    // pintó con el valor de un lateral y el frente pasó a leerse como si
    // fuera otra pared lateral.
    const valores = [VALOR_PLANO.cubierta, VALOR_PLANO.frontal, VALOR_PLANO.lateral];
    expect(new Set(valores).size).toBe(3);
  });

  it("ordena los planos como los ilumina una sola fuente de luz", () => {
    // La cubierta mira arriba y recibe más luz; el frontal mira al
    // observador; el lateral se va de la luz.
    expect(VALOR_PLANO.cubierta).toBeGreaterThan(VALOR_PLANO.frontal);
    expect(VALOR_PLANO.frontal).toBeGreaterThan(VALOR_PLANO.lateral);
  });

  it("separa los tres planos lo bastante para distinguirlos impresos", () => {
    expect(VALOR_PLANO.cubierta - VALOR_PLANO.frontal).toBeGreaterThanOrEqual(0.12);
    expect(VALOR_PLANO.frontal - VALOR_PLANO.lateral).toBeGreaterThanOrEqual(0.12);
  });
});
