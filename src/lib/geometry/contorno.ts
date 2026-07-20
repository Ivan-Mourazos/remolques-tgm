import type { TipoPerfil } from "@/lib/calc/params";

export interface MedidasContorno {
  ancho: number;
  alto: number;
  /** Caída desde la cumbrera hasta los hombros (TIPO 02 y 03). */
  aguas?: number;
  /** Radio del arco de cumbrera (TIPO 03); 0 = pico vivo. */
  radioCumbrera?: number;
  /** Radio de los hombros (TIPO 03); 0 = esquina viva. */
  radioHombro?: number;
  /** Radio real de las esquinas superiores (TIPO 05). */
  radioEsquina?: number;
  /** Chaflán real de las esquinas superiores (TIPO 04). */
  chaflan?: number;
}

/**
 * Longitud exacta del contorno terminado (lateral + cubierta + lateral, sin la
 * base). Devuelve null si falta el dato que ese perfil necesita: el chaflán en
 * el TIPO 04 y el radio de esquina en el TIPO 05. El TIPO 03 se mide sobre el
 * perfil teórico de líneas (laterales, vertientes y vértice) y cada radio
 * tangente recorta exactamente su esquina: 2·r·tan(φ/2) − r·φ.
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
      const a = w / 2;
      const theta = Math.atan2(caida, a);
      const L = Math.hypot(a, caida);
      const lateral = h - caida;
      const anguloHombro = Math.PI / 2 - theta;
      const tanHombro = Math.tan(anguloHombro / 2);
      const tanCumbrera = Math.tan(theta);
      // acotar para que las tangentes quepan en el lateral y la vertiente
      let rh = Math.max(m.radioHombro ?? 0, 0);
      if (tanHombro > 0) rh = Math.min(rh, lateral / tanHombro, L / 2 / tanHombro);
      let rc = Math.max(m.radioCumbrera ?? 0, 0);
      if (tanCumbrera > 0) rc = Math.min(rc, (L - rh * tanHombro) / tanCumbrera);
      const recorteCumbrera = 2 * rc * tanCumbrera - rc * 2 * theta;
      const recorteHombro = 2 * rh * tanHombro - rh * anguloHombro;
      return 2 * lateral + 2 * L - recorteCumbrera - 2 * recorteHombro;
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
