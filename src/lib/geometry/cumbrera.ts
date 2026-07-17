export interface Punto { x: number; y: number }

export interface CumbreraRedondeada {
  /** Radio efectivo tras acotarlo al máximo geométrico. */
  radio: number;
  /** Longitud de cada vertiente recta entre el hombro y el punto de tangencia. */
  vertiente: number;
  /** Longitud del arco de cumbrera. */
  arco: number;
  /** Semiángulo del arco respecto a la vertical (radianes). */
  semiangulo: number;
  /** Centro del arco: x desde el lateral izquierdo, y desde el suelo. */
  centro: Punto;
  /** Punto de tangencia izquierdo (el derecho es su simétrico). */
  tangenteIzquierda: Punto;
}

/**
 * Cumbrera de dos aguas rematada con un arco de radio conocido, tangente a las
 * dos vertientes. `alto` es la altura real del remolque (la parte más alta del
 * arco) y `caida` la distancia vertical de la cumbrera a los hombros. Con radio
 * pequeño tiende al pico puro; el radio se acota al máximo geométrico, en el
 * que las vertientes desaparecen y queda el arco que pasa por los dos hombros.
 */
export function cumbreraRedondeada(
  ancho: number, alto: number, caida: number, radio: number,
): CumbreraRedondeada | null {
  if (!(ancho > 0) || !(alto > 0) || !(caida > 0) || !(radio > 0)) return null;
  const a = ancho / 2;
  const c = Math.min(caida, alto);
  const radioMaximo = (a * a + c * c) / (2 * c);
  const r = Math.min(radio, radioMaximo);
  const centro = { x: a, y: alto - r };
  const hombro = { x: 0, y: alto - c };

  const dx = hombro.x - centro.x;
  const dy = hombro.y - centro.y;
  const d = Math.hypot(dx, dy);
  const vertiente = Math.sqrt(Math.max(d * d - r * r, 0));

  let tangente: Punto;
  if (vertiente === 0) {
    tangente = hombro;
  } else {
    const alfa = Math.atan2(dy, dx);
    const delta = Math.acos(Math.min(Math.max(r / d, -1), 1));
    const candidatos: Punto[] = [alfa + delta, alfa - delta].map((beta) => ({
      x: centro.x + r * Math.cos(beta),
      y: centro.y + r * Math.sin(beta),
    }));
    tangente = candidatos[0].y >= candidatos[1].y ? candidatos[0] : candidatos[1];
  }

  const semiangulo = Math.atan2(Math.abs(tangente.x - centro.x), tangente.y - centro.y);
  return {
    radio: r,
    vertiente,
    arco: 2 * r * semiangulo,
    semiangulo,
    centro,
    tangenteIzquierda: tangente,
  };
}
