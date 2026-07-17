import type { TipoPerfil } from "@/lib/calc/params";
import { cumbreraRedondeada } from "@/lib/geometry/cumbrera";

export interface MedidasContorno {
  ancho: number;
  alto: number;
  /** Caída desde la cumbrera hasta los hombros (TIPO 02 y 03). */
  aguas?: number;
  /** Radio real del arco de cumbrera (TIPO 03). */
  radioCumbrera?: number;
  /** Radio real de las esquinas superiores (TIPO 05). */
  radioEsquina?: number;
  /** Chaflán real de las esquinas superiores (TIPO 04). */
  chaflan?: number;
}

/**
 * Longitud exacta del contorno terminado (lateral + cubierta + lateral, sin la
 * base). Devuelve null si falta el dato que ese perfil necesita: el radio de
 * cumbrera en el TIPO 03, el chaflán en el TIPO 04 y el radio de esquina en el
 * TIPO 05. El TIPO 03 son dos vertientes rectas rematadas por un arco tangente
 * del radio indicado (acotado al arco completo entre hombros).
 */
export function contornoCalculado(tipo: TipoPerfil, m: MedidasContorno): number | null {
  const w = m.ancho;
  const h = m.alto;
  if (!(w > 0) || !(h > 0)) return null;
  const caida = Math.min(Math.max(m.aguas ?? 0, 0), h);

  switch (tipo) {
    case "TIPO 01":
      return 2 * h + w;
    case "TIPO 02": {
      if (caida === 0) return 2 * h + w;
      return 2 * (h - caida) + 2 * Math.hypot(w / 2, caida);
    }
    case "TIPO 03": {
      if (caida === 0) return 2 * h + w;
      const cumbrera = cumbreraRedondeada(w, h, caida, m.radioCumbrera ?? 0);
      if (!cumbrera) return null;
      return 2 * (h - caida) + 2 * cumbrera.vertiente + cumbrera.arco;
    }
    case "TIPO 04": {
      const chaflan = Math.min(m.chaflan ?? 0, w / 2, h);
      if (!(chaflan > 0)) return null;
      return 2 * (h - chaflan) + 2 * Math.hypot(chaflan, chaflan) + (w - 2 * chaflan);
    }
    case "TIPO 05": {
      const radio = Math.min(m.radioEsquina ?? 0, w / 2, h);
      if (!(radio > 0)) return null;
      return 2 * (h - radio) + (w - 2 * radio) + Math.PI * radio;
    }
  }
}
