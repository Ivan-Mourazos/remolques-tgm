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
  // `altoDelante` es la altura total. `alturaPico` (aguas) indica cuánto
  // descienden los hombros respecto a la cumbrera, no una altura adicional.
  const pico = Math.min(Math.max(opts.alturaPico ?? w * 0.12, 0), h);
  const ch = Math.min(opts.chaflan ?? 15, w / 2, h);
  const r = Math.min(opts.radio ?? 15, w / 2, h);

  switch (tipo) {
    case "TIPO 01":
      return [[0, 0], [0, h], [w, h], [w, 0]];
    case "TIPO 02":
      return [[0, 0], [0, h - pico], [w / 2, h], [w, h - pico], [w, 0]];
    case "TIPO 03": {
      if (pico === 0) return [[0, 0], [0, h], [w, h], [w, 0]];
      // Dos aguas suavizado dentro de la altura total.
      const sub = Math.min(r, pico, w / 4);
      const hombro = h - pico;
      return [
        [0, 0], [0, Math.max(0, hombro - sub)],
        [sub * 0.3, hombro - sub * 0.3], [sub, hombro],
        [w / 2 - sub, h - sub * 0.3], [w / 2, h],
        [w / 2 + sub, h - sub * 0.3], [w - sub, hombro],
        [w - sub * 0.3, hombro - sub * 0.3], [w, Math.max(0, hombro - sub)],
        [w, 0],
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
