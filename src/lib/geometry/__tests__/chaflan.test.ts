import { describe, expect, it } from "vitest";
import { esquinaChaflan, GIRO_CHAFLAN, recorteEsquina } from "@/lib/geometry/chaflan";

/** La pieza real de Iván: pedido AR.26.03714, sobre la lona hecha. */
const PIEZA = { ancho: 126, alto: 90, chaflan: 13.2, radioAbajo: 7, radioArriba: 7.5 };

describe("esquinaChaflan", () => {
  it("deriva la pata dividiendo la cara entre raíz de dos", () => {
    const e = esquinaChaflan(PIEZA)!;
    expect(e.pata).toBeCloseTo(9.3338, 3);
    expect(e.cara).toBeCloseTo(13.2, 3);
  });

  it("calcula la tangente de cada radio sobre las rectas que une", () => {
    const e = esquinaChaflan(PIEZA)!;
    expect(e.tangenteAbajo).toBeCloseTo(2.8995, 3);
    expect(e.tangenteArriba).toBeCloseTo(3.1066, 3);
  });

  it("deja el tramo recto que queda del chaflán tras los dos arcos", () => {
    const e = esquinaChaflan(PIEZA)!;
    expect(e.caraRecta).toBeCloseTo(13.2 - 2.8995 - 3.1066, 3);
  });

  it("con radios a cero no recorta nada: la cara entera es recta", () => {
    const e = esquinaChaflan({ ancho: 126, alto: 90, chaflan: 13.2 })!;
    expect(e.tangenteAbajo).toBe(0);
    expect(e.tangenteArriba).toBe(0);
    expect(e.caraRecta).toBeCloseTo(13.2, 5);
  });

  it("no devuelve esquina sin chaflán", () => {
    expect(esquinaChaflan({ ancho: 126, alto: 90, chaflan: 0 })).toBeNull();
    expect(esquinaChaflan({ ancho: 126, alto: 90, chaflan: -5 })).toBeNull();
  });

  it("acota la pata al alto y a medio ancho, y recalcula la cara desde ella", () => {
    // Una cara enorme no puede producir una pata que no cabe en la pieza:
    // el contorno saldría más largo que el remolque.
    const e = esquinaChaflan({ ancho: 20, alto: 90, chaflan: 400 })!;
    expect(e.pata).toBeCloseTo(10, 5);
    expect(e.cara).toBeCloseTo(10 * Math.SQRT2, 5);
  });

  it("acota el radio de abajo para que su tangente quepa en la pared", () => {
    const e = esquinaChaflan({ ancho: 400, alto: 20, chaflan: 14.14, radioAbajo: 999 })!;
    expect(e.tangenteAbajo).toBeLessThanOrEqual(20 - e.pata + 1e-9);
  });

  it("acota el radio de arriba para que su tangente quepa en el techo", () => {
    const e = esquinaChaflan({ ancho: 30, alto: 400, chaflan: 14.14, radioArriba: 999 })!;
    expect(e.tangenteArriba).toBeLessThanOrEqual(30 / 2 - e.pata + 1e-9);
  });

  it("reduce los dos radios a la vez si entre ambos se comen la cara", () => {
    const e = esquinaChaflan({ ancho: 400, alto: 400, chaflan: 10, radioAbajo: 50, radioArriba: 50 })!;
    expect(e.tangenteAbajo + e.tangenteArriba).toBeLessThanOrEqual(e.cara + 1e-9);
    expect(e.caraRecta).toBeGreaterThanOrEqual(0);
    // Reducción proporcional: partiendo de radios iguales, siguen iguales.
    expect(e.radioAbajo).toBeCloseTo(e.radioArriba, 6);
  });

  it("reduce los radios manteniendo su proporción, no repartiendo la cara por igual", () => {
    // radioAbajo:radioArriba = 2:1. Una implementación que, al comerse la
    // cara, repartiera el hueco por igual entre los dos radios (en vez de
    // reducir cada uno proporcionalmente) pasaría la prueba anterior — con
    // radios iguales de entrada un reparto igual es indistinguible de una
    // reducción proporcional — pero fallaría aquí.
    const e = esquinaChaflan({ ancho: 400, alto: 400, chaflan: 10, radioAbajo: 50, radioArriba: 25 })!;
    expect(e.radioAbajo / e.radioArriba).toBeCloseTo(2, 6);
    // Las dos tangentes se reparten la cara en la misma proporción 2:1.
    expect(e.tangenteAbajo).toBeCloseTo((2 / 3) * e.cara, 6);
    expect(e.tangenteArriba).toBeCloseTo((1 / 3) * e.cara, 6);
    expect(e.tangenteAbajo + e.tangenteArriba).toBeCloseTo(e.cara, 6);
  });

  it("nunca produce tramo recto negativo ni valores no finitos", () => {
    for (const chaflan of [0.1, 1, 13.2, 50]) {
      for (const radio of [0, 1, 20, 500]) {
        const e = esquinaChaflan({ ancho: 126, alto: 90, chaflan, radioAbajo: radio, radioArriba: radio });
        expect(e).not.toBeNull();
        expect(Number.isFinite(e!.pata)).toBe(true);
        expect(Number.isFinite(e!.caraRecta)).toBe(true);
        expect(e!.caraRecta).toBeGreaterThanOrEqual(-1e-9);
      }
    }
  });

  it("trata un radio NaN como arista viva, sin propagar NaN a caraRecta", () => {
    const abajo = esquinaChaflan({ ancho: 126, alto: 90, chaflan: 13.2, radioAbajo: NaN })!;
    expect(abajo.radioAbajo).toBe(0);
    expect(Number.isFinite(abajo.caraRecta)).toBe(true);
    expect(abajo.caraRecta).toBeCloseTo(13.2, 3);

    const arriba = esquinaChaflan({ ancho: 126, alto: 90, chaflan: 13.2, radioArriba: NaN })!;
    expect(arriba.radioArriba).toBe(0);
    expect(Number.isFinite(arriba.caraRecta)).toBe(true);
  });

  it("un radio infinito se acota, no se convierte en arista viva", () => {
    // Es el desenlace de una división por cero aguas arriba. Anularlo daría
    // una esquina viva en silencio; acotarlo da la esquina redondeada más
    // grande que cabe, que es lo que ya hacía antes de tocar la guarda.
    //
    // Manda la restricción de la cara: la tangente se come el chaflán entero
    // antes de llegar al límite de la pared, así que no queda tramo recto.
    const e = esquinaChaflan({ ancho: 126, alto: 90, chaflan: 13.2, radioAbajo: Infinity })!;
    expect(e.radioAbajo).toBeGreaterThan(0);
    expect(Number.isFinite(e.radioAbajo)).toBe(true);
    expect(e.tangenteAbajo).toBeCloseTo(e.cara, 6);
    expect(e.caraRecta).toBeCloseTo(0, 6);
  });

  it("un radio negativo infinito se trata como cero", () => {
    const e = esquinaChaflan({ ancho: 126, alto: 90, chaflan: 13.2, radioAbajo: -Infinity })!;
    expect(e.radioAbajo).toBe(0);
    expect(e.caraRecta).toBeCloseTo(13.2, 3);
  });

  it("el giro de cada esquina es de 45 grados", () => {
    expect(GIRO_CHAFLAN).toBeCloseTo(Math.PI / 4, 10);
  });
});

describe("recorteEsquina", () => {
  it("con giro de 45 grados, un radio de 7 recorta unas 0,3012 unidades", () => {
    const esperado = 2 * 7 * Math.tan(GIRO_CHAFLAN / 2) - 7 * GIRO_CHAFLAN;
    expect(recorteEsquina(7)).toBeCloseTo(esperado, 9);
    expect(recorteEsquina(7)).toBeCloseTo(0.3012, 4);
  });

  it("el recorte es proporcional al radio", () => {
    expect(recorteEsquina(2 * 7)).toBeCloseTo(2 * recorteEsquina(7), 9);
  });
});
