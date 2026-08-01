/**
 * La esquina achaflanada del TIPO 04, con las dos aristas curvadas.
 *
 * `chaflan` es la cara entre los dos **vértices virtuales**: donde se
 * cortarían las rectas si no hubiera curvas. Es lo que acota el CAD de oficina
 * técnica y lo único independiente de los radios — la cuerda entre tangencias
 * cambia al cambiar un radio, así que no sirve como parámetro.
 *
 * De aquí beben `perfil.ts` y `contorno.ts`, para no repetir la cuenta en dos
 * sitios como le pasa hoy al TIPO 03.
 */

/** El chaflán es simétrico: las dos esquinas giran 45°. */
export const GIRO_CHAFLAN = Math.PI / 4;

const TANGENTE_MEDIA = Math.tan(GIRO_CHAFLAN / 2);

export interface EsquinaChaflan {
  /** Cuánto baja por la pared, igual a cuánto entra por el techo. */
  pata: number;
  /** Cara entre vértices virtuales, ya efectiva tras acotar la pata. */
  cara: number;
  /**
   * Radio de abajo ya acotado (pared, techo y reparto con el de arriba si
   * entre los dos se comían la cara) — no el valor de entrada. Dibuja el
   * arco con este radio: con el de entrada sin acotar, el arco no sería
   * tangente a las rectas que une.
   */
  radioAbajo: number;
  /** Igual que `radioAbajo`, pero acotado al techo en vez de a la pared. */
  radioArriba: number;
  /** Lo que cada arco consume sobre las rectas que une. */
  tangenteAbajo: number;
  tangenteArriba: number;
  /** Tramo recto que queda del chaflán entre los dos arcos. */
  caraRecta: number;
}

export function esquinaChaflan({
  ancho, alto, chaflan, radioAbajo = 0, radioArriba = 0,
}: {
  ancho: number; alto: number; chaflan: number;
  radioAbajo?: number; radioArriba?: number;
}): EsquinaChaflan | null {
  if (!(chaflan > 0) || !(ancho > 0) || !(alto > 0)) return null;

  // La pata se acota a la pieza y la cara se recalcula desde ella: usar el
  // chaflán crudo daría un contorno más largo que el remolque.
  const pata = Math.min(chaflan / Math.SQRT2, ancho / 2, alto);
  const cara = pata * Math.SQRT2;

  // Cada arco necesita su tangente en la recta que toca. Un radio no finito
  // (NaN o Infinity) se trata como arista viva: se convierte en 0 en vez de
  // propagarse (Math.max(NaN, 0) es NaN, y eso llegaría hasta caraRecta).
  let rAbajo = Number.isFinite(radioAbajo) ? Math.max(radioAbajo, 0) : 0;
  rAbajo = Math.min(rAbajo, (alto - pata) / TANGENTE_MEDIA);
  let rArriba = Number.isFinite(radioArriba) ? Math.max(radioArriba, 0) : 0;
  rArriba = Math.min(rArriba, (ancho / 2 - pata) / TANGENTE_MEDIA);

  // Y entre los dos no pueden comerse la cara del chaflán.
  const ocupado = (rAbajo + rArriba) * TANGENTE_MEDIA;
  if (ocupado > cara) {
    const factor = cara / ocupado;
    rAbajo *= factor;
    rArriba *= factor;
  }

  const tangenteAbajo = rAbajo * TANGENTE_MEDIA;
  const tangenteArriba = rArriba * TANGENTE_MEDIA;
  return {
    pata,
    cara,
    radioAbajo: rAbajo,
    radioArriba: rArriba,
    tangenteAbajo,
    tangenteArriba,
    caraRecta: Math.max(cara - tangenteAbajo - tangenteArriba, 0),
  };
}

/**
 * Lo que una esquina redondeada recorta frente a la misma esquina viva.
 *
 * Solo toma el radio: en este módulo el giro es siempre de 45°, así que la
 * tangente es siempre `radio · tan(22,5°)`. Aceptarla como argumento aparte
 * permitiría pasar una tangente calculada para otro ángulo y obtener un
 * recorte de perímetro silenciosamente incorrecto — y esto alimenta el
 * contorno de corte.
 */
export function recorteEsquina(radio: number): number {
  return 2 * radio * TANGENTE_MEDIA - radio * GIRO_CHAFLAN;
}
