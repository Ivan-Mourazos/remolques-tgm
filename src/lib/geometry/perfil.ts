import type { TipoPerfil } from "@/lib/calc/params";

export interface PerfilOpts {
  ancho: number;
  altoDelante: number;
  alturaPico?: number;
  chaflan?: number;
  radio?: number;
  /** Radio del arco de cumbrera (TIPO 03); 0 = pico vivo. */
  radioCumbrera?: number;
  /** Radio de los hombros (TIPO 03); 0 = esquina viva. */
  radioHombro?: number;
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
  const ch = Math.min(opts.chaflan ?? 15, w / 2, h);
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
    case "TIPO 04":
      return {
        puntos: [[0, 0], [0, h - ch], [ch, h], [w - ch, h], [w, h - ch], [w, 0]],
        aristas: [1, 2, 3, 4],
      };
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
