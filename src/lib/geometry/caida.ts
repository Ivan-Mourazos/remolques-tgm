/**
 * Lo que distingue una lona de una chapa: los bordes que no van sujetos ceden
 * un poco. Y lo que pidieron los operarios: los elementos que se identifican
 * —cierres, recogidas, ollaos— tienen que verse, aunque el remolque sea
 * pequeño. Nada de esto se aplica a lo que lleva cota.
 */

export interface Punto { x: number; y: number }

/** Proporción del vano que cede un borde libre. */
const FACTOR_DESCUELGUE = 0.014;
/** Tope, en unidades del dibujo. Una lona va tensada. */
const MAXIMO_DESCUELGUE = 12;

/** Cuánto ha caído el centro de un borde libre de longitud `vano`. */
export function flechaDescuelgue(vano: number): number {
  if (vano <= 0) return 0;
  return Math.min(vano * FACTOR_DESCUELGUE, MAXIMO_DESCUELGUE);
}

/**
 * Punto de control de una curva cuadrática que hace ceder el tramo `a`–`b`.
 * Se desplaza sobre la normal del tramo, así que funciona igual en tramos
 * horizontales que inclinados. El control va al doble de la flecha porque una
 * cuadrática pasa por la mitad de la distancia a su control.
 */
export function controlDescuelgue(a: Punto, b: Punto): Punto {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const largo = Math.hypot(dx, dy);
  const medio = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  if (largo === 0) return medio;
  const flecha = flechaDescuelgue(largo) * 2;
  // Normal (dy, -dx) normalizada, orientada hacia abajo en pantalla.
  const nx = dy / largo;
  const ny = -dx / largo;
  const sentido = ny < 0 ? -1 : 1;
  return { x: medio.x + nx * flecha * sentido, y: medio.y + ny * flecha * sentido };
}

/** Aumento de los símbolos que se identifican. */
const FACTOR_SIMBOLO = 1.7;
/** Por debajo de esto un símbolo deja de reconocerse impreso. */
export const MINIMO_SIMBOLO = 7;

/**
 * Exageración esquemática: la de los manuales de despiece. Un cierre a escala
 * real en un remolque de seis metros es una mota. Solo para elementos que se
 * reconocen; jamás para nada que lleve cota.
 */
export function tamanoSimbolo(tamanoBase: number): number {
  return Math.max(tamanoBase * FACTOR_SIMBOLO, MINIMO_SIMBOLO);
}
