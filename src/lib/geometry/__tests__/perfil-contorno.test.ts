import { describe, expect, it } from "vitest";
import { perfilForma } from "@/lib/geometry/perfil";
import { contornoCalculado } from "@/lib/geometry/contorno";

/**
 * El perfil dibuja la pieza y el contorno dice cuánto mide, pero son dos
 * módulos independientes: nada garantizaba que hablasen de la misma forma.
 * Esto los ata.
 *
 * El perímetro de la polilínea sale algo por debajo del contorno porque los
 * arcos se dibujan como cuerdas, y ese déficit es el único desvío admitido.
 */
const perimetro = (puntos: Array<[number, number]>) => puntos.reduce(
  (total, [x, y], indice) => (indice === 0 ? 0 : total + Math.hypot(x - puntos[indice - 1][0], y - puntos[indice - 1][1])),
  0,
);

describe("el perfil y el contorno describen la misma pieza", () => {
  const PIEZA = { ancho: 126, alto: 90, chaflan: 13.2 };

  it.each([
    ["sin curvas", 0, 0],
    ["solo la de abajo", 7, 0],
    ["solo la de arriba", 0, 7.5],
    ["las dos", 7, 7.5],
  ])("TIPO 04 · %s", (_, radioChaflanAbajo, radioChaflanArriba) => {
    const { puntos } = perfilForma("TIPO 04", {
      ancho: PIEZA.ancho, altoDelante: PIEZA.alto, chaflan: PIEZA.chaflan,
      radioChaflanAbajo, radioChaflanArriba,
    });
    const contorno = contornoCalculado("TIPO 04", {
      ...PIEZA, radioChaflanAbajo, radioChaflanArriba,
    })!;
    const desvio = contorno - perimetro(puntos);
    // Nunca por encima: una cuerda no puede ser más larga que su arco.
    expect(desvio).toBeGreaterThanOrEqual(-1e-9);
    expect(desvio).toBeLessThan(0.05);
  });

  it("sin curvas la coincidencia es exacta, porque no hay arcos que discretizar", () => {
    const { puntos } = perfilForma("TIPO 04", { ancho: 126, altoDelante: 90, chaflan: 13.2 });
    expect(perimetro(puntos)).toBeCloseTo(contornoCalculado("TIPO 04", PIEZA)!, 9);
  });
});
