/**
 * El dibujo se imprime en blanco y negro, así que el gris de cada cara se
 * elige a propósito en vez de heredarlo del color del material. El material
 * aporta el tono; la cara aporta el valor. El día que haya impresora en color
 * se apaga el monocromo y el mismo dibujo sale en color con el volumen intacto.
 */

/** Pesos de luma de la matriz que aplica `grayscale(1)`. */
const PESO_ROJO = 0.2126;
const PESO_VERDE = 0.7152;
const PESO_AZUL = 0.0722;

const canal = (hex: string, offset: number) =>
  Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;

/** Claridad percibida del color, de 0 (negro) a 1 (blanco). */
export function luminancia(hex: string): number {
  return canal(hex, 1) * PESO_ROJO + canal(hex, 3) * PESO_VERDE + canal(hex, 5) * PESO_AZUL;
}

export function mezcla(hex: string, destino: string, proporcion: number): string {
  const componentes = [1, 3, 5].map((offset) => Math.round(
    (canal(hex, offset) * (1 - proporcion) + canal(destino, offset) * proporcion) * 255,
  ));
  return `#${componentes.map((valor) => valor.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Devuelve el color con la luminancia pedida, conservando su tono.
 *
 * La mezcla es lineal en RGB y la luminancia es una combinación lineal de RGB,
 * así que mezclar con blanco o con negro mueve la luminancia de forma exacta y
 * la proporción necesaria se despeja sin buscar.
 */
export function aplicarValor(hex: string, valor: number): string {
  const objetivo = Math.min(Math.max(valor, 0), 1);
  const actual = luminancia(hex);
  if (Math.abs(objetivo - actual) < 1e-6) return hex;
  return objetivo > actual
    ? mezcla(hex, "#ffffff", (objetivo - actual) / (1 - actual))
    : mezcla(hex, "#000000", (actual - objetivo) / actual);
}

/**
 * Una sola dirección de luz para todo el dibujo. Los valores están separados
 * al menos 0,12 para que sobrevivan a una fotocopia, y lejos de los extremos
 * para que el negro no se empaste ni el blanco desaparezca.
 *
 * Estos cuatro números son los que se retocan en la calibración impresa.
 */
export const VALOR_CARA = {
  techoClaro: 0.88,
  techo: 0.72,
  lateralClaro: 0.54,
  lateral: 0.36,
} as const;
