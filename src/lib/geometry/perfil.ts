import type { TipoPerfil } from "@/lib/calc/params";
import { esquinaChaflan, GIRO_CHAFLAN } from "@/lib/geometry/chaflan";

export interface PerfilOpts {
  ancho: number;
  altoDelante: number;
  alturaPico?: number;
  /** Chaflán (TIPO 04): cara entre los dos vértices virtuales, no la pata. */
  chaflan?: number;
  radio?: number;
  /** Radio del arco de cumbrera (TIPO 03); 0 = pico vivo. */
  radioCumbrera?: number;
  /** Radio de los hombros (TIPO 03); 0 = esquina viva. */
  radioHombro?: number;
  /** Radio de la arista del chaflán contra la pared (TIPO 04); 0 = viva. */
  radioChaflanAbajo?: number;
  /** Radio de la arista del chaflán contra el techo (TIPO 04); 0 = viva. */
  radioChaflanArriba?: number;
}

type Pt = [number, number];

export interface PerfilForma {
  puntos: Pt[];
  /** Índices de los vértices que generan arista longitudinal visible (excluye las bases). */
  aristas: number[];
}

function arco(cx: number, cy: number, r: number, a0: number, a1: number, n: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

export function perfilForma(tipo: TipoPerfil, opts: PerfilOpts): PerfilForma {
  const w = opts.ancho;
  const h = opts.altoDelante;
  // `altoDelante` es la altura total. `alturaPico` (aguas) indica cuánto
  // descienden los hombros respecto a la cumbrera, no una altura adicional.
  const pico = Math.min(Math.max(opts.alturaPico ?? w * 0.12, 0), h);
  const r = Math.min(opts.radio ?? 15, w / 2, h);

  switch (tipo) {
    case "TIPO 01":
      return { puntos: [[0, 0], [0, h], [w, h], [w, 0]], aristas: [1, 2] };
    case "TIPO 02":
      return {
        puntos: [[0, 0], [0, h - pico], [w / 2, h], [w, h - pico], [w, 0]],
        aristas: [1, 2, 3],
      };
    case "TIPO 03": {
      if (pico === 0) return { puntos: [[0, 0], [0, h], [w, h], [w, 0]], aristas: [1, 2] };
      // Perfil teórico (laterales, vertientes y vértice) con radios tangentes
      // en hombros y cumbrera. Las aristas van en las tangencias; los arcos
      // son superficie lisa, sin arista en el vértice.
      const a = w / 2;
      const theta = Math.atan2(pico, a);
      const L = Math.hypot(a, pico);
      const lateral = h - pico;
      const anguloHombro = Math.PI / 2 - theta;
      const tanHombro = Math.tan(anguloHombro / 2);
      const tanCumbrera = Math.tan(theta);
      let rh = Math.max(opts.radioHombro ?? 0, 0);
      if (tanHombro > 0) rh = Math.min(rh, lateral / tanHombro, L / 2 / tanHombro);
      let rc = Math.max(opts.radioCumbrera ?? 0, 0);
      if (tanCumbrera > 0) rc = Math.min(rc, (L - rh * tanHombro) / tanCumbrera);

      const puntos: Pt[] = [[0, 0]];
      const aristas: number[] = [];
      const anadir = (p: Pt) => {
        const previo = puntos.at(-1)!;
        if (Math.hypot(p[0] - previo[0], p[1] - previo[1]) > 1e-9) puntos.push(p);
      };

      // hombro izquierdo
      if (rh > 0) {
        const t = rh * tanHombro;
        anadir([0, lateral - t]);
        aristas.push(puntos.length - 1); // tangencia con el lateral
        const centro = { x: rh, y: lateral - t };
        for (let i = 1; i <= 5; i += 1) {
          const beta = Math.PI - (anguloHombro * i) / 5;
          anadir([centro.x + rh * Math.cos(beta), centro.y + rh * Math.sin(beta)]);
        }
        aristas.push(puntos.length - 1); // tangencia con la vertiente
      } else {
        anadir([0, lateral]);
        aristas.push(puntos.length - 1);
      }

      // cumbrera
      if (rc > 0) {
        const t = rc * tanCumbrera;
        anadir([a - (a / L) * t, h - (pico / L) * t]);
        aristas.push(puntos.length - 1); // tangencia izquierda
        const centro = { x: a, y: h - rc / Math.cos(theta) };
        for (let i = 1; i <= 8; i += 1) {
          const beta = Math.PI / 2 + theta - (2 * theta * i) / 8;
          anadir([centro.x + rc * Math.cos(beta), centro.y + rc * Math.sin(beta)]);
        }
        aristas.push(puntos.length - 1); // tangencia derecha
      } else {
        anadir([a, h]);
        aristas.push(puntos.length - 1); // pico vivo
      }

      // hombro derecho (espejo)
      if (rh > 0) {
        const t = rh * tanHombro;
        const centro = { x: w - rh, y: lateral - t };
        for (let i = 5; i >= 0; i -= 1) {
          const beta = (anguloHombro * i) / 5;
          anadir([centro.x + rh * Math.cos(beta), centro.y + rh * Math.sin(beta)]);
          if (i === 5) aristas.push(puntos.length - 1); // tangencia con la vertiente
        }
        aristas.push(puntos.length - 1); // tangencia con el lateral
      } else {
        anadir([w, lateral]);
        aristas.push(puntos.length - 1);
      }
      puntos.push([w, 0]);
      return { puntos, aristas };
    }
    case "TIPO 04": {
      // `chaflan` es la cara entre vértices virtuales, no la pata.
      const e = esquinaChaflan({
        ancho: w, alto: h, chaflan: opts.chaflan ?? 0,
        radioAbajo: opts.radioChaflanAbajo, radioArriba: opts.radioChaflanArriba,
      });
      if (!e) return { puntos: [[0, 0], [0, h], [w, h], [w, 0]], aristas: [1, 2] };
      if (e.radioAbajo === 0 && e.radioArriba === 0) {
        return {
          puntos: [[0, 0], [0, h - e.pata], [e.pata, h], [w - e.pata, h], [w, h - e.pata], [w, 0]],
          aristas: [1, 2, 3, 4],
        };
      }
      // Centros: el de abajo a `radioAbajo` de la pared, el de arriba a
      // `radioArriba` del techo. Las aristas van en las tangencias, no en los
      // vértices virtuales: los arcos son superficie lisa, igual que el TIPO 03.
      const yTangenteAbajo = h - e.pata - e.tangenteAbajo;
      const xTangenteArriba = e.pata + e.tangenteArriba;

      // Se construye solo el lado izquierdo, de la tangencia con la pared a la
      // tangencia con el techo, y el derecho sale de reflejarlo.
      const izquierda: Pt[] = [[0, yTangenteAbajo]];
      const aristasIzquierda: number[] = [0];
      // Arco de abajo: de 180° a 135°, girando 45°. Su primer punto ya está.
      izquierda.push(
        ...arco(e.radioAbajo, yTangenteAbajo, e.radioAbajo, Math.PI, Math.PI - GIRO_CHAFLAN, 5).slice(1),
      );
      aristasIzquierda.push(izquierda.length - 1);
      // Arco de arriba: de 135° a 90°. Su primer punto cierra el tramo recto.
      const inicioArcoArriba = izquierda.length;
      izquierda.push(
        ...arco(xTangenteArriba, h - e.radioArriba, e.radioArriba, Math.PI - GIRO_CHAFLAN, Math.PI / 2, 5),
      );
      aristasIzquierda.push(inicioArcoArriba, izquierda.length - 1);

      const derecha = [...izquierda].reverse().map(([x, y]) => [w - x, y] as Pt);
      const puntos: Pt[] = [[0, 0], ...izquierda, ...derecha, [w, 0]];
      // El punto i de la izquierda queda reflejado en 1 + L + (L − 1 − i).
      const L = izquierda.length;
      const aristas = [
        ...aristasIzquierda.map((i) => 1 + i),
        ...aristasIzquierda.map((i) => 1 + L + (L - 1 - i)).reverse(),
      ];
      return { puntos, aristas };
    }
    case "TIPO 05": {
      const subida: Pt[] = [[0, 0], [0, h - r]];
      const arcoIzq = arco(r, h - r, r, Math.PI, Math.PI / 2, 8).slice(1);
      const arcoDer = arco(w - r, h - r, r, Math.PI / 2, 0, 8);
      const puntos: Pt[] = [...subida, ...arcoIzq, ...arcoDer, [w, 0]];
      const finArcoIzq = subida.length + arcoIzq.length - 1;
      return { puntos, aristas: [1, finArcoIzq, finArcoIzq + 1, puntos.length - 2] };
    }
  }
}

export function perfilPuntos(tipo: TipoPerfil, opts: PerfilOpts): Pt[] {
  return perfilForma(tipo, opts).puntos;
}
