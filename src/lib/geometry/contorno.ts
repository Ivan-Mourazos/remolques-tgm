import type { TipoPerfil } from "@/lib/calc/params";
import { longitudCurvaCatmullRom, type Punto2D } from "@/lib/geometry/curva";
import { perfilPuntos } from "@/lib/geometry/perfil";

const distancia = (a: Punto2D, b: Punto2D) => Math.hypot(b.x - a.x, b.y - a.y);

/**
 * Longitud abierta del perfil terminado: lateral izquierdo, cubierta y lateral derecho.
 * La base inferior no forma parte del contorno de la lona.
 */
export function longitudContornoTerminado(
  tipoPerfil: TipoPerfil,
  ancho: number,
  alto: number,
  aguas = 0,
  radioCurva = 0,
): number {
  if (ancho <= 0 || alto <= 0) return 0;
  const caida = Math.min(Math.max(aguas, 0), alto);
  const radio = Math.min(Math.max(radioCurva, 0), ancho / 2, alto);
  const chaflan = Math.min(15, ancho / 2, alto);

  if (tipoPerfil === "TIPO 01") return 2 * alto + ancho;
  if (tipoPerfil === "TIPO 02") {
    return 2 * (alto - caida) + 2 * Math.hypot(ancho / 2, caida);
  }
  if (tipoPerfil === "TIPO 04") {
    return 2 * (alto - chaflan) + 2 * Math.hypot(chaflan, chaflan) + ancho - 2 * chaflan;
  }
  if (tipoPerfil === "TIPO 05") {
    if (radio <= 0) return 0;
    return 2 * (alto - radio) + ancho - 2 * radio + Math.PI * radio;
  }
  if (caida === 0) return 2 * alto + ancho;

  // TIPO 03 es el perfil libre suavizado; se mide sobre la misma curva que se dibuja.
  const perfil = perfilPuntos(tipoPerfil, {
    ancho,
    altoDelante: alto,
    alturaPico: caida,
  }).map(([x, y]) => ({ x, y }));
  const inicioCubierta = perfil[1];
  const finCubierta = perfil.at(-2)!;
  const cubierta = perfil.slice(1, -1);
  return distancia(perfil[0], inicioCubierta)
    + longitudCurvaCatmullRom(cubierta)
    + distancia(finCubierta, perfil.at(-1)!);
}
