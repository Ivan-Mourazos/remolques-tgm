import type { TipoPerfil } from "@/lib/calc/params";
import { cumbreraRedondeada } from "@/lib/geometry/cumbrera";

export interface PerfilOpts {
  ancho: number;
  altoDelante: number;
  alturaPico?: number;
  chaflan?: number;
  radio?: number;
  /** Radio real del arco de cumbrera (TIPO 03); sin él se usa la curva estética. */
  radioCumbrera?: number;
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
      const cumbrera = cumbreraRedondeada(w, h, pico, opts.radioCumbrera ?? 0);
      if (cumbrera) {
        // Geometría real: hombro, vertiente recta y arco tangente de cumbrera.
        const hombro = h - pico;
        const { centro, semiangulo, radio: rc, tangenteIzquierda } = cumbrera;
        const pasos = 8;
        const arcoPuntos: Pt[] = Array.from({ length: pasos + 1 }, (_, i) => {
          const beta = Math.PI / 2 + semiangulo - (2 * semiangulo * i) / pasos;
          return [centro.x + rc * Math.cos(beta), centro.y + rc * Math.sin(beta)];
        });
        const puntos: Pt[] = [[0, 0], [0, hombro]];
        if (cumbrera.vertiente > 1e-9) puntos.push([tangenteIzquierda.x, tangenteIzquierda.y]);
        for (const p of arcoPuntos) {
          const previo = puntos.at(-1)!;
          if (Math.hypot(p[0] - previo[0], p[1] - previo[1]) > 1e-9) puntos.push(p);
        }
        if (cumbrera.vertiente > 1e-9) {
          puntos.push([w - tangenteIzquierda.x, tangenteIzquierda.y]);
        }
        puntos.push([w, hombro], [w, 0]);
        const apice = puntos.findIndex(([, y]) => Math.abs(y - h) < 1e-9);
        return { puntos, aristas: [1, apice, puntos.length - 2] };
      }
      // Sin radio conocido: curva estética suavizada dentro de la altura total.
      const sub = Math.min(r, pico, w / 4);
      const hombro = h - pico;
      const puntos: Pt[] = [
        [0, 0], [0, Math.max(0, hombro - sub)],
        [sub * 0.3, hombro - sub * 0.3], [sub, hombro],
        [w / 2 - sub, h - sub * 0.3], [w / 2, h],
        [w / 2 + sub, h - sub * 0.3], [w - sub, hombro],
        [w - sub * 0.3, hombro - sub * 0.3], [w, Math.max(0, hombro - sub)],
        [w, 0],
      ];
      return { puntos, aristas: [1, 5, puntos.length - 2] };
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
