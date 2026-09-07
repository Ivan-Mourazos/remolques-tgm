import { describe, expect, it } from "vitest";
import { PANEL, calcularVista, type OpcionesVista } from "@/components/workspace/Escena3D";

/**
 * El panel se recortó de 780 a 700 de ancho para que el par de vistas —muy
 * apaisado— saliera más grande en la hoja de taller, donde lo limita el ancho.
 * Ese recorte dejó el margen en unos 35 pt, que a ojo no se ve: si alguien
 * sube los topes de escala o mueve el origen, el dibujo se sale del panel sin
 * que nada avise. Esto avisa.
 */

/** Los textos de cota se colocan en el punto medio y se desplazan como mucho
 *  15 pt; se reservan 25 para ellos y para el grosor de la letra. */
const AIRE = 25;

const base: OpcionesVista = {
  modo: "lona", tipoPerfil: "TIPO 05", largo: 300,
  anchoNear: 157, anchoFar: 157, altoNear: 120, altoFar: 120,
  aguas: 0, radioCumbrera: 0, radioHombro: 0, radioEsquina: 8,
  chaflan: 0, radioChaflanAbajo: 0, radioChaflanArriba: 0,
  conVentana: true, ventanaAncho: 148, ventanaAlto: 35,
  ollaosNear: [], ollaosLaterales: [], lateralesDesdeFar: false, conBastilla: false,
};

/** Todos los puntos que la vista coloca dentro del panel. */
function extremos(o: OpcionesVista) {
  const xs: number[] = [];
  const ys: number[] = [];
  const mete = (v: unknown) => {
    if (v == null) return;
    if (Array.isArray(v)) { v.forEach(mete); return; }
    if (typeof v !== "object") return;
    const campos = v as Record<string, unknown>;
    if (typeof campos.x === "number" && typeof campos.y === "number") {
      xs.push(campos.x); ys.push(campos.y);
    }
    Object.values(campos).forEach(mete);
  };
  mete(calcularVista(o) as unknown);
  return {
    x0: Math.min(...xs), x1: Math.max(...xs),
    y0: Math.min(...ys), y1: Math.max(...ys),
  };
}

const casos: Array<[string, Partial<OpcionesVista>]> = [
  ["el típico", {}],
  ["ancho y bajo", { anchoNear: 250, anchoFar: 250, altoNear: 90, altoFar: 90 }],
  ["estrecho y alto", { anchoNear: 120, anchoFar: 120, altoNear: 200, altoFar: 200 }],
  ["muy largo", { largo: 700 }],
  ["corto", { largo: 150 }],
  ["TIPO 02 con aguas", {
    tipoPerfil: "TIPO 02", aguas: 30,
    anchoNear: 200, anchoFar: 200, altoNear: 140, altoFar: 140, largo: 600,
  }],
  ["TIPO 03 curvo", {
    tipoPerfil: "TIPO 03", aguas: 35, radioCumbrera: 20, radioHombro: 18,
    anchoNear: 180, anchoFar: 180, altoNear: 150, altoFar: 150, largo: 400,
  }],
  ["TIPO 04 con chaflán", {
    tipoPerfil: "TIPO 04", chaflan: 25, radioChaflanAbajo: 7, radioChaflanArriba: 7.5,
    radioEsquina: 0, anchoNear: 170, anchoFar: 170, altoNear: 130, altoFar: 130, largo: 350,
  }],
  ["TIPO 01 recto", { tipoPerfil: "TIPO 01", radioEsquina: 0 }],
  ["sesgado", { anchoFar: 140, altoFar: 110 }],
  ["baquetón", { modo: "baqueton", tipoPerfil: "TIPO 01", conVentana: false, radioEsquina: 0 }],
  ["con los ollaos marcados", {
    ollaosNear: [2.5, 33, 63, 94, 125, 155],
    ollaosLaterales: [2.5, 50, 100, 150, 200, 250, 298],
  }],
  // El que más se estira a la derecha: topa el límite de ancho de la escala y
  // además el de profundidad. Es el que fija el ancho del panel.
  ["el más ancho que la escala admite", {
    anchoNear: 400, anchoFar: 400, altoNear: 80, altoFar: 80, largo: 700,
  }],
  ["enorme", { anchoNear: 500, anchoFar: 500, altoNear: 60, altoFar: 60, largo: 900 }],
];

describe("el dibujo cabe en su panel", () => {
  it.each(casos)("%s", (_nombre, extra) => {
    const e = extremos({ ...base, ...extra });
    expect(e.x0).toBeGreaterThanOrEqual(AIRE);
    expect(e.x1).toBeLessThanOrEqual(PANEL.ancho - AIRE);
    expect(e.y0).toBeGreaterThanOrEqual(10);
    expect(e.y1).toBeLessThanOrEqual(PANEL.alto - AIRE);
  });

  it("no deja el panel más ancho de lo que el dibujo necesita", () => {
    // El par de vistas se imprime limitado por el ancho, así que cada punto de
    // blanco sobrante encoge el remolque en el papel. Si el hueco a la derecha
    // creciera mucho, es que hay ancho que regalar.
    const derecha = Math.min(...casos.map(([, extra]) => (
      PANEL.ancho - extremos({ ...base, ...extra }).x1
    )));
    expect(derecha).toBeLessThan(60);
  });
});
