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
 * Ventana estándar centrada en el paño delantero.
 * Sus dos esquinas superiores quedan 5 cm bajo la cubierta, también con aguas.
 */
export function calcularVentanaFrontal(
  perfil: PerfilPunto[],
  anchoRemolque: number,
  anchoVentana = 50,
  altoVentana = 35,
  margenCubierta = 5,
): VentanaFrontal | null {
  if (anchoRemolque <= 0 || anchoVentana <= 0 || altoVentana <= 0 || anchoVentana > anchoRemolque) {
    return null;
  }
  const x = (anchoRemolque - anchoVentana) / 2;
  const alturaIzquierda = alturaPerfilEnX(perfil, x);
  const alturaDerecha = alturaPerfilEnX(perfil, x + anchoVentana);
  if (alturaIzquierda == null || alturaDerecha == null) return null;
  const bordeSuperior = Math.min(alturaIzquierda, alturaDerecha) - margenCubierta;
  const y = bordeSuperior - altoVentana;
  if (y < 0) return null;
  return { x, y, ancho: anchoVentana, alto: altoVentana };
}
