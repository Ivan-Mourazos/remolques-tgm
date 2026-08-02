import { describe, expect, it } from "vitest";
import {
  aristaLongitudinalVisible,
  caraExtrudidaVisible,
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

describe("caraExtrudidaVisible", () => {
  // Caso real de un TIPO 04 (200×125, alto 90, chaflán 17,5) proyectado.
  const frente = [
    { x: 100, y: 344 }, { x: 100, y: 163 }, { x: 144, y: 119 },
    { x: 369, y: 119 }, { x: 413, y: 163 }, { x: 413, y: 344 },
  ];
  const fondo = [
    { x: 320, y: 244 }, { x: 320, y: 63 }, { x: 364, y: 19 },
    { x: 589, y: 19 }, { x: 633, y: 63 }, { x: 633, y: 244 },
  ];

  it("descarta el chaflán del lado oculto", () => {
    // Sin esta guarda, la franja del chaflán izquierdo se proyecta dentro del
    // paño frontal y lo tapa: el frente parece transparente.
    expect(caraExtrudidaVisible(frente, fondo, 1)).toBe(false);
  });

  it("conserva el techo y el chaflán que sí se ven", () => {
    expect(caraExtrudidaVisible(frente, fondo, 2)).toBe(true);
    expect(caraExtrudidaVisible(frente, fondo, 3)).toBe(true);
  });

  it("descarta índices fuera de rango en vez de reventar", () => {
    expect(caraExtrudidaVisible(frente, fondo, -1)).toBe(false);
    expect(caraExtrudidaVisible(frente, fondo, 99)).toBe(false);
  });
});

describe("caraExtrudidaVisible no descarta de más", () => {
  // TIPO 02 (dos aguas, 200×125, alto 90, aguas 15) proyectado. Las dos
  // vertientes del tejado se ven: descartar una dejaría medio techo vacío.
  const frente = [
    { x: 100, y: 344 }, { x: 100, y: 156.5 }, { x: 256.25, y: 119 },
    { x: 412.5, y: 156.5 }, { x: 412.5, y: 344 },
  ];
  const fondo = [
    { x: 320, y: 244 }, { x: 320, y: 56.5 }, { x: 476.25, y: 19 },
    { x: 632.5, y: 56.5 }, { x: 632.5, y: 244 },
  ];

  it("conserva las dos vertientes de un tejado a dos aguas", () => {
    expect(caraExtrudidaVisible(frente, fondo, 1)).toBe(true);
    expect(caraExtrudidaVisible(frente, fondo, 2)).toBe(true);
  });

  it("sigue descartando la pared del lado oculto", () => {
    expect(caraExtrudidaVisible(frente, fondo, 0)).toBe(false);
  });
});
