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
  radioAbajo: number;
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

  // Cada arco necesita su tangente en la recta que toca.
  let rAbajo = Math.max(radioAbajo, 0);
  if (TANGENTE_MEDIA > 0) rAbajo = Math.min(rAbajo, (alto - pata) / TANGENTE_MEDIA);
  let rArriba = Math.max(radioArriba, 0);
  if (TANGENTE_MEDIA > 0) rArriba = Math.min(rArriba, (ancho / 2 - pata) / TANGENTE_MEDIA);

  // Y entre los dos no pueden comerse la cara del chaflán.
  const ocupado = (rAbajo + rArriba) * TANGENTE_MEDIA;
  if (ocupado > cara && ocupado > 0) {
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

/** Lo que una esquina redondeada recorta frente a la misma esquina viva. */
export function recorteEsquina(radio: number, tangente: number): number {
  return 2 * tangente - radio * GIRO_CHAFLAN;
}
