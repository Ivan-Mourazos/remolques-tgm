import { describe, expect, it } from "vitest";
import {
  controlDescuelgue, flechaDescuelgue, MINIMO_SIMBOLO, marcasDistinguibles, tamanoSimbolo,
} from "@/lib/geometry/caida";

describe("flechaDescuelgue", () => {
  it("crece con el vano", () => {
    expect(flechaDescuelgue(200)).toBeGreaterThan(flechaDescuelgue(100));
  });

  it("no descuelga nada en un vano nulo o negativo", () => {
    expect(flechaDescuelgue(0)).toBe(0);
    expect(flechaDescuelgue(-50)).toBe(0);
  });

  it("está acotada: una lona va tensada, no es una sábana", () => {
    // Sin tope, un remolque largo saldría con una panza de caricatura que
    // además confundiría sobre la forma real.
    expect(flechaDescuelgue(10000)).toBeLessThanOrEqual(12);
  });

  it("se mantiene discreta en los vanos habituales", () => {
    expect(flechaDescuelgue(300)).toBeLessThan(300 * 0.03);
  });
});

describe("controlDescuelgue", () => {
  it("deja el punto de control por debajo del centro del tramo", () => {
    const control = controlDescuelgue({ x: 0, y: 100 }, { x: 200, y: 100 });
    expect(control.x).toBeCloseTo(100, 5);
    expect(control.y).toBeGreaterThan(100);
  });

  it("descuelga perpendicular al tramo, también si está inclinado", () => {
    const control = controlDescuelgue({ x: 0, y: 0 }, { x: 100, y: 100 });
    // La normal de un tramo a 45° reparte el descuelgue entre las dos
    // coordenadas, así que ninguna se queda en el punto medio exacto.
    expect(control.x).not.toBeCloseTo(50, 3);
    expect(control.y).not.toBeCloseTo(50, 3);
  });

  it("no mueve nada cuando los dos extremos coinciden", () => {
    const control = controlDescuelgue({ x: 40, y: 40 }, { x: 40, y: 40 });
    expect(control).toEqual({ x: 40, y: 40 });
  });
});

describe("tamanoSimbolo", () => {
  it("agranda lo que se identifica", () => {
    expect(tamanoSimbolo(10)).toBeGreaterThan(10);
  });

  it("nunca baja del mínimo legible, por pequeño que sea el remolque", () => {
    expect(tamanoSimbolo(0.2)).toBeGreaterThanOrEqual(MINIMO_SIMBOLO);
  });

  it("sigue creciendo con el tamaño real por encima del mínimo", () => {
    expect(tamanoSimbolo(40)).toBeGreaterThan(tamanoSimbolo(20));
  });
});

describe("marcasDistinguibles", () => {
  it("deja pasar las marcas que se separan lo suficiente", () => {
    const fila = [{ x: 0, y: 0 }, { x: 14, y: 0 }, { x: 28, y: 0 }];
    expect(marcasDistinguibles(fila, 7)).toEqual(fila);
  });

  it("descarta la que la perspectiva ha dejado encima de otra", () => {
    // El caso real de la esquina: el último ollao del frente y el primero del
    // lateral, a 2,5 cm del mismo vértice pero en caras perpendiculares, caen
    // a un píxel en pantalla mientras el símbolo mide 7.
    const frente = { x: 355.7, y: 338 };
    const lateral = { x: 354.7, y: 338.1 };
    expect(marcasDistinguibles([frente, lateral], 7)).toEqual([frente]);
  });

  it("conserva la primera de cada grupo y respeta el orden", () => {
    const marcas = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 20, y: 0 }, { x: 21, y: 0 }];
    expect(marcasDistinguibles(marcas, 7)).toEqual([{ x: 0, y: 0 }, { x: 20, y: 0 }]);
  });

  it("acepta las que se tocan justo sin llegar a solaparse", () => {
    const marcas = [{ x: 0, y: 0 }, { x: 7, y: 0 }];
    expect(marcasDistinguibles(marcas, 7)).toEqual(marcas);
  });

  it("no toca nada cuando no hay separación que exigir", () => {
    const marcas = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
    expect(marcasDistinguibles(marcas, 0)).toEqual(marcas);
  });
});
