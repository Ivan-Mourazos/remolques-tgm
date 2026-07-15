export interface Punto2D {
  x: number;
  y: number;
}

export function controlesCatmullRom(
  puntos: Punto2D[],
  indice: number,
  tension = 0.62,
): { c1: Punto2D; c2: Punto2D } {
  const p0 = puntos[indice - 1] ?? puntos[indice];
  const p1 = puntos[indice];
  const p2 = puntos[indice + 1];
  const p3 = puntos[indice + 2] ?? p2;
  return {
    c1: {
      x: p1.x + ((p2.x - p0.x) * tension) / 6,
      y: p1.y + ((p2.y - p0.y) * tension) / 6,
    },
    c2: {
      x: p2.x - ((p3.x - p1.x) * tension) / 6,
      y: p2.y - ((p3.y - p1.y) * tension) / 6,
    },
  };
}

const distancia = (a: Punto2D, b: Punto2D) => Math.hypot(b.x - a.x, b.y - a.y);

function puntoBezier(p0: Punto2D, c1: Punto2D, c2: Punto2D, p3: Punto2D, t: number): Punto2D {
  const u = 1 - t;
  return {
    x: u ** 3 * p0.x + 3 * u ** 2 * t * c1.x + 3 * u * t ** 2 * c2.x + t ** 3 * p3.x,
    y: u ** 3 * p0.y + 3 * u ** 2 * t * c1.y + 3 * u * t ** 2 * c2.y + t ** 3 * p3.y,
  };
}

/** Longitud numérica de la misma curva que se representa en el SVG. */
export function longitudCurvaCatmullRom(puntos: Punto2D[], muestrasPorTramo = 32): number {
  if (puntos.length < 2) return 0;
  let longitud = 0;
  for (let i = 0; i < puntos.length - 1; i += 1) {
    const p1 = puntos[i];
    const p2 = puntos[i + 1];
    const { c1, c2 } = controlesCatmullRom(puntos, i);
    let anterior = p1;
    for (let muestra = 1; muestra <= muestrasPorTramo; muestra += 1) {
      const actual = puntoBezier(p1, c1, c2, p2, muestra / muestrasPorTramo);
      longitud += distancia(anterior, actual);
      anterior = actual;
    }
  }
  return longitud;
}
