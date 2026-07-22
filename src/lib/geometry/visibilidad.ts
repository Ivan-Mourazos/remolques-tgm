import type { Punto2D } from "@/lib/geometry/curva";

export interface Segmento2D {
  desde: Punto2D;
  hasta: Punto2D;
}

const EPSILON = 1e-7;

function areaFirmada(poligono: Punto2D[]): number {
  return poligono.reduce((area, punto, indice) => {
    const siguiente = poligono[(indice + 1) % poligono.length];
    return area + punto.x * siguiente.y - siguiente.x * punto.y;
  }, 0) / 2;
}

/**
 * En las coordenadas de pantalla (Y crece hacia abajo), las caras de la
 * extrusión orientadas hacia la cámara recorren su contorno en sentido
 * antihorario y tienen área negativa.
 */
function caraExtrudidaVisible(
  frente: Punto2D[],
  fondo: Punto2D[],
  indiceTramo: number,
): boolean {
  if (indiceTramo < 0 || indiceTramo >= Math.min(frente.length, fondo.length) - 1) return false;
  return areaFirmada([
    frente[indiceTramo],
    frente[indiceTramo + 1],
    fondo[indiceTramo + 1],
    fondo[indiceTramo],
  ]) < -EPSILON;
}

/**
 * Una arista longitudinal puede verse si al menos una de las dos caras que
 * confluyen en ella mira hacia la cámara. Así conservamos el límite visible
 * entre chaflán y techo, pero descartamos la arista con ambas caras ocultas.
 */
export function aristaLongitudinalVisible(
  frente: Punto2D[],
  fondo: Punto2D[],
  indiceArista: number,
): boolean {
  return caraExtrudidaVisible(frente, fondo, indiceArista - 1)
    || caraExtrudidaVisible(frente, fondo, indiceArista);
}

function puntoEnPoligono(punto: Punto2D, poligono: Punto2D[]): boolean {
  let dentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i, i += 1) {
    const a = poligono[i];
    const b = poligono[j];
    const cruza = (a.y > punto.y) !== (b.y > punto.y)
      && punto.x < ((b.x - a.x) * (punto.y - a.y)) / (b.y - a.y) + a.x;
    if (cruza) dentro = !dentro;
  }
  return dentro;
}

function parametroInterseccion(
  inicio: Punto2D,
  fin: Punto2D,
  a: Punto2D,
  b: Punto2D,
): number | null {
  const rx = fin.x - inicio.x;
  const ry = fin.y - inicio.y;
  const sx = b.x - a.x;
  const sy = b.y - a.y;
  const denominador = rx * sy - ry * sx;
  if (Math.abs(denominador) < EPSILON) return null;
  const qpx = a.x - inicio.x;
  const qpy = a.y - inicio.y;
  const t = (qpx * sy - qpy * sx) / denominador;
  const u = (qpx * ry - qpy * rx) / denominador;
  return t > EPSILON && t < 1 - EPSILON && u >= -EPSILON && u <= 1 + EPSILON ? t : null;
}

const interpolar = (a: Punto2D, b: Punto2D, t: number): Punto2D => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

/**
 * El paño cercano es opaco. Devuelve únicamente los tramos de una arista
 * longitudinal cuya proyección queda fuera de ese paño.
 */
export function recortarFueraDePoligono(segmento: Segmento2D, poligono: Punto2D[]): Segmento2D[] {
  if (poligono.length < 3) return [segmento];
  const cortes = [0, 1];
  for (let i = 0; i < poligono.length; i += 1) {
    const t = parametroInterseccion(
      segmento.desde,
      segmento.hasta,
      poligono[i],
      poligono[(i + 1) % poligono.length],
    );
    if (t != null && !cortes.some((valor) => Math.abs(valor - t) < EPSILON)) cortes.push(t);
  }
  cortes.sort((a, b) => a - b);

  const visibles: Segmento2D[] = [];
  for (let i = 0; i < cortes.length - 1; i += 1) {
    const desdeT = cortes[i];
    const hastaT = cortes[i + 1];
    const medio = interpolar(segmento.desde, segmento.hasta, (desdeT + hastaT) / 2);
    if (!puntoEnPoligono(medio, poligono)) {
      visibles.push({
        desde: interpolar(segmento.desde, segmento.hasta, desdeT),
        hasta: interpolar(segmento.desde, segmento.hasta, hastaT),
      });
    }
  }
  return visibles;
}
