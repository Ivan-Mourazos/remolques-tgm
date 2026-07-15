import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS } from "@/lib/calc/params";
import { calcLona, type LonaInput } from "@/lib/calc/lona";

const base: LonaInput = {
  cabecera: {
    numeroPedido: "AR2602796", version: "10", cliente: "REMOLQUES YAGÜE",
    revision: "JAIME", realizadoPor: "ADRIAN", fecha: "2026-06-11", fechaSalida: "",
  },
  cantidad: 1, largo: 250, ancho: 151,
  altoDelante: 62, altoAtras: 62, aguas: 0,
  llevaCurva: false,
  tipoPerfil: "TIPO 02",
  recogeDelante: "NO", recogeAtras: "CREMALLERA",
  bastillaEnfundar: false, ventana: false,
  rotulacion: true, textoRotulacion: "YAGUE",
  modoOllaos: "REPARTIDOS", pasoOllaos: 35,
  ollaosManuales: { laterales: [], atras: [], delante: [] },
  material: "LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN",
  observaciones: "",
};

describe("calcLona — caso real AR2602796", () => {
  const res = calcLona(base, DEFAULT_PARAMS);

  it("lona hecha 251 x 152", () => {
    expect(res.lonaHecha).toEqual({ largo: 251, ancho: 152 });
  });
  it("paños delantero/trasero 154 x 66,5", () => {
    expect(res.panoDelantero).toMatchObject({ ancho: 154, alto: 66.5 });
    expect(res.panoTrasero).toMatchObject({ ancho: 154, alto: 66.5 });
  });
  it("calcula el paño contorno 253 x 275 desde el perfil terminado", () => {
    expect(res.panoContorno).toMatchObject({ ancho: 253, alto: 275 });
  });
  it("textos de recogida", () => {
    expect(res.recogeDelanteTexto).toBe("NO RECOGE");
    expect(res.recogeAtrasTexto).toBe("RECOGE ATRÁS CON CREMALLERA");
  });
  it("metros de tela = (154+154+253)/100", () => {
    expect(res.metrosTela).toBe(5.61);
  });
});

describe("calcLona — variantes", () => {
  it("bastilla de enfundar suma 13 al paño contorno", () => {
    const res = calcLona({ ...base, bastillaEnfundar: true }, DEFAULT_PARAMS);
    expect(res.panoContorno?.ancho).toBe(263);
    expect(res.notas.join(" ")).toContain("enfundar");
  });
  it("curva suma 1,5 al contorno y redondea hacia arriba al mm", () => {
    const res = calcLona({ ...base, llevaCurva: true }, DEFAULT_PARAMS);
    expect(res.contornoAjustado).toBe(276.5);
    expect(res.panoContorno?.alto).toBe(276.5);
  });
  it("TIPO 05 usa el radio indicado y suma 1,5 automáticamente", () => {
    const input = {
      ...base, tipoPerfil: "TIPO 05" as const, llevaCurva: false,
      ancho: 141, altoDelante: 88.4, altoAtras: 88.4, radioCurva: 10,
    };
    const baseCurva = 2 * (88.4 - 10) + (141 - 20) + Math.PI * 10;
    const res = calcLona(input, DEFAULT_PARAMS);
    expect(res.contornoAjustado).toBe(Math.ceil((baseCurva + 1.5) * 10) / 10);
  });
  it("la longitud de ZWCAD sustituye al cálculo y recibe el ajuste de curva", () => {
    const res = calcLona({
      ...base, tipoPerfil: "TIPO 05", llevaCurva: true,
      radioCurva: 20, longitudContornoZwcad: 320.05,
    }, DEFAULT_PARAMS);
    expect(res.contornoAjustado).toBe(321.6);
    expect(res.notas.join(" ")).toContain("ZWCAD");
  });
  it("TIPO 05 sin radio ni longitud manual queda pendiente", () => {
    const res = calcLona({
      ...base, tipoPerfil: "TIPO 05", llevaCurva: true,
      radioCurva: 0, longitudContornoZwcad: 0,
    }, DEFAULT_PARAMS);
    expect(res.contornoAjustado).toBe(0);
    expect(res.panoContorno).toBeNull();
    expect(res.notas.join(" ")).toContain("introduce el radio");
  });
  it("PUENTES LATERALES: paño trasero usa columna DELANTE (paridad Excel, P1)", () => {
    const res = calcLona({ ...base, recogeAtras: "PUENTES LATERALES" }, DEFAULT_PARAMS);
    expect(res.panoTrasero.ancho).toBe(151 + 41); // no 151 + 21
    expect(res.panoContorno?.ancho).toBe(253 + 9); // lateralSoloAtras
  });
  it("GOMA delante: demasía 27 y nota de orejas", () => {
    const res = calcLona({ ...base, recogeDelante: "GOMA" }, DEFAULT_PARAMS);
    expect(res.panoDelantero.ancho).toBe(178);
    expect(res.notas.join(" ")).toContain("GOMA");
  });
  it("sin alturas: paño contorno null y metros tela 0", () => {
    const res = calcLona({ ...base, altoDelante: 0, altoAtras: 0 }, DEFAULT_PARAMS);
    expect(res.panoContorno).toBeNull();
    expect(res.metrosTela).toBe(0);
  });
  it("si los contornos delantero y trasero difieren usa el mayor", () => {
    const res = calcLona({ ...base, altoAtras: 64 }, DEFAULT_PARAMS);
    expect(res.contornoAjustado).toBe(279);
    expect(res.panoContorno?.alto).toBe(279);
  });
  it("modo SEGUN SE INDICA usa las posiciones manuales", () => {
    const manuales = { laterales: [2.5, 37.6], atras: [2.5], delante: [2.5] };
    const res = calcLona({ ...base, modoOllaos: "SEGUN SE INDICA", ollaosManuales: manuales }, DEFAULT_PARAMS);
    expect(res.reparto).toEqual(manuales);
  });
  it("cantidad 2 duplica metros de tela", () => {
    const res = calcLona({ ...base, cantidad: 2 }, DEFAULT_PARAMS);
    expect(res.metrosTela).toBe(11.22);
  });
  it("recogida desconocida: usa fallback NO en medidas y en texto", () => {
    const res = calcLona({ ...base, recogeDelante: "INVENTADA" }, DEFAULT_PARAMS);
    expect(res.panoDelantero.ancho).toBe(154); // demasía de NO = 3
    expect(res.recogeDelanteTexto).toBe("NO RECOGE");
  });
});
