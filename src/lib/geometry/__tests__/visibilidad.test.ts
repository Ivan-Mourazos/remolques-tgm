import { describe, expect, it } from "vitest";
import {
  aristaLongitudinalVisible,
  recortarFueraDePoligono,
} from "@/lib/geometry/visibilidad";

const cuadrado = [
  { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 },
];

describe("recortarFueraDePoligono", () => {
  it("conserva una arista que sale hacia fuera desde el contorno", () => {
    expect(recortarFueraDePoligono({ desde: { x: 10, y: 0 }, hasta: { x: 16, y: -4 } }, cuadrado))
      .toEqual([{ desde: { x: 10, y: 0 }, hasta: { x: 16, y: -4 } }]);
  });

  it("oculta el tramo tapado por la cara cercana", () => {
    const [visible] = recortarFueraDePoligono(
      { desde: { x: 0, y: 10 }, hasta: { x: 16, y: -6 } },
      cuadrado,
    );
    expect(visible.desde.x).toBeCloseTo(10);
    expect(visible.desde.y).toBeCloseTo(0);
    expect(visible.hasta).toEqual({ x: 16, y: -6 });
  });

  it("elimina una arista totalmente tapada", () => {
    expect(recortarFueraDePoligono(
      { desde: { x: 0, y: 5 }, hasta: { x: 8, y: 5 } },
      cuadrado,
    )).toEqual([]);
  });
});

describe("aristaLongitudinalVisible", () => {
  const frenteChaflan = [
    { x: 107, y: 278 },
    { x: 107, y: 176 },
    { x: 130, y: 151 },
    { x: 295, y: 151 },
    { x: 320, y: 176 },
    { x: 320, y: 278 },
  ];
  const fondoChaflan = frenteChaflan.map(({ x, y }) => ({ x: x + 151, y: y - 73 }));

  it("oculta la arista del chaflan izquierdo tapada por ambas caras contiguas", () => {
    expect(aristaLongitudinalVisible(frenteChaflan, fondoChaflan, 1)).toBe(false);
  });

  it("mantiene la arista donde el chaflan se une al techo visible", () => {
    expect(aristaLongitudinalVisible(frenteChaflan, fondoChaflan, 2)).toBe(true);
  });

  it("mantiene las aristas del techo y lateral derechos", () => {
    expect([3, 4].every((indice) => (
      aristaLongitudinalVisible(frenteChaflan, fondoChaflan, indice)
    ))).toBe(true);
  });
});
