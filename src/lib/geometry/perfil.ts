import type { TipoPerfil } from "@/lib/calc/params";

export interface PerfilOpts {
  ancho: number;
  altoDelante: number;
  alturaPico?: number;
  chaflan?: number;
  radio?: number;
}

type Pt = [number, number];

function arco(cx: number, cy: number, r: number, a0: number, a1: number, n: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

export function perfilPuntos(tipo: TipoPerfil, opts: PerfilOpts): Pt[] {
  const w = opts.ancho;
  const h = opts.altoDelante;
  const pico = opts.alturaPico ?? w * 0.12;
  const ch = Math.min(opts.chaflan ?? 15, w / 2, h);
  const r = Math.min(opts.radio ?? 15, w / 2, h);

  switch (tipo) {
    case "TIPO 01":
      return [[0, 0], [0, h], [w, h], [w, 0]];
    case "TIPO 02":
      return [[0, 0], [0, h], [w / 2, h + pico], [w, h], [w, 0]];
    case "TIPO 03": {
      // Dos aguas suavizado: hombros y pico con pequeños arcos.
      const sub = Math.min(r, pico);
      return [
        [0, 0], [0, h - sub],
        ...arco(sub, h - sub, sub, Math.PI, Math.PI / 2, 3).slice(1),
        [w / 2 - sub, h + pico - sub / 2],
        ...arco(w / 2, h + pico - sub, sub, (3 * Math.PI) / 4, Math.PI / 4, 3),
        [w / 2 + sub, h + pico - sub / 2],
        ...arco(w - sub, h - sub, sub, Math.PI / 2, 0, 3).slice(0, -1),
        [w, h - sub], [w, 0],
      ];
    }
    case "TIPO 04":
      return [[0, 0], [0, h - ch], [ch, h], [w - ch, h], [w, h - ch], [w, 0]];
    case "TIPO 05":
      return [
        [0, 0], [0, h - r],
        ...arco(r, h - r, r, Math.PI, Math.PI / 2, 8).slice(1),
        ...arco(w - r, h - r, r, Math.PI / 2, 0, 8),
        [w, 0],
      ];
  }
}
