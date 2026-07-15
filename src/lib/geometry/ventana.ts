export interface VentanaFrontal {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

type PerfilPunto = [number, number];

function alturaPerfilEnX(perfil: PerfilPunto[], x: number): number | null {
  const cubierta = perfil.slice(1, -1);
  for (let i = 0; i < cubierta.length - 1; i += 1) {
    const [x1, y1] = cubierta[i];
    const [x2, y2] = cubierta[i + 1];
    if (x < Math.min(x1, x2) || x > Math.max(x1, x2)) continue;
    if (x1 === x2) return Math.min(y1, y2);
    const t = (x - x1) / (x2 - x1);
    return y1 + (y2 - y1) * t;
  }
  return null;
}

/**
 * Ventana esquemática centrada y proporcionada al paño delantero.
 * No representa una medida de fabricación: esa se define posteriormente en CAD.
 */
export function calcularVentanaFrontal(
  perfil: PerfilPunto[],
  anchoRemolque: number,
  margenCubierta = 5,
): VentanaFrontal | null {
  if (anchoRemolque <= 0) return null;
  const margenLateral = Math.min(20, Math.max(5, anchoRemolque * 0.15));
  const anchoVentana = Math.min(50, anchoRemolque - margenLateral * 2);
  if (anchoVentana < 4) return null;
  const x = (anchoRemolque - anchoVentana) / 2;
  const alturaIzquierda = alturaPerfilEnX(perfil, x);
  const alturaDerecha = alturaPerfilEnX(perfil, x + anchoVentana);
  if (alturaIzquierda == null || alturaDerecha == null) return null;
  const bordeSuperior = Math.min(alturaIzquierda, alturaDerecha) - margenCubierta;
  const margenInferior = Math.min(8, bordeSuperior * 0.18);
  const altoVentana = Math.min(anchoVentana * 0.7, bordeSuperior - margenInferior);
  if (altoVentana < 4) return null;
  const y = bordeSuperior - altoVentana;
  return { x, y, ancho: anchoVentana, alto: altoVentana };
}
