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
  contorno: 275,
  tipoPerfil: "TIPO 02",
  recogeDelante: "NO", recogeAtras: "CREMALLERA",
  bastillaEnfundar: false, ventana: false,
  rotulacion: true,
  modoOllaos: "REPARTIDOS", pasoOllaos: 35,
  ollaosManuales: { laterales: [], atras: [], delante: [] },
  material: "LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN",
  observaciones: "",
};

describe("calcLona — caso real AR2602796", () => {
  const res = calcLona(base, DEFAULT_PARAMS);

  it("lona hecha 251 x 152", () => {
    expect(res.lonaHecha).toEqual({ largo: 251, ancho: 152, anchoAtras: 152 });
  });
  it("paños delantero/trasero 154 x 66,5", () => {
    expect(res.panoDelantero).toMatchObject({ ancho: 154, alto: 66.5 });
    expect(res.panoTrasero).toMatchObject({ ancho: 154, alto: 66.5 });
  });
  it("calcula el paño contorno 253 x 282 sumando 7 de bastillas", () => {
    expect(res.panoContorno).toMatchObject({ ancho: 253, alto: 282 });
  });
  it("textos de recogida", () => {
    expect(res.recogeDelanteTexto).toBe("NO");
    expect(res.recogeAtrasTexto).toBe("CREMALLERA");
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
  it("suma 7 de bastillas en los perfiles sin curva", () => {
    for (const tipoPerfil of ["TIPO 01", "TIPO 02", "TIPO 04"] as const) {
      const res = calcLona({ ...base, tipoPerfil, contorno: 275 }, DEFAULT_PARAMS);
      expect(res.ajusteContorno).toBe(7);
      expect(res.contornoAjustado).toBe(282);
    }
  });
  it("suma 7 de bastillas y 1,5 adicional en los perfiles con curva", () => {
    for (const tipoPerfil of ["TIPO 03", "TIPO 05"] as const) {
      const res = calcLona({ ...base, tipoPerfil, contorno: 321.6 }, DEFAULT_PARAMS);
      expect(res.ajusteContorno).toBe(8.5);
      expect(res.contornoAjustado).toBe(330.1);
      expect(res.panoContorno?.alto).toBe(330.1);
    }
  });
  it("el ajuste de contorno sale de los parámetros", () => {
    const params = { ...DEFAULT_PARAMS, ajusteContornoBase: 9, ajusteContornoCurva: 2 };
    expect(calcLona({ ...base, tipoPerfil: "TIPO 01" }, params).ajusteContorno).toBe(9);
    expect(calcLona({ ...base, tipoPerfil: "TIPO 05" }, params).ajusteContorno).toBe(11);
  });
  it("mantiene el resultado de registros históricos con contorno SCAD", () => {
    const res = calcLona({
      ...base, contorno: undefined, tipoPerfil: "TIPO 05", contornoScad: 321.6,
    }, DEFAULT_PARAMS);
    expect(res.contornoIntroducido).toBe(313.1);
    expect(res.contornoAjustado).toBe(321.6);
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
  it("sin contorno manual: paño contorno null y metros tela 0", () => {
    const res = calcLona({ ...base, contorno: 0 }, DEFAULT_PARAMS);
    expect(res.panoContorno).toBeNull();
    expect(res.metrosTela).toBe(0);
  });
  it("remolque sesgado: cada cara usa su ancho (paños y ollaos)", () => {
    const res = calcLona({ ...base, recogeAtras: "NO", anchoAtras: 140 }, DEFAULT_PARAMS);
    expect(res.panoDelantero.ancho).toBe(154); // 151 + 3
    expect(res.panoTrasero.ancho).toBe(143);   // 140 + 3
    expect(res.lonaHecha).toEqual({ largo: 251, ancho: 152, anchoAtras: 141 });
    // ollaos de cada cara sobre su propio ancho hecho
    expect(res.reparto.delante.at(-1)).toBe(149.5); // 152 - 2,5
    expect(res.reparto.atras.at(-1)).toBe(138.5);   // 141 - 2,5
  });

  it("sin ancho trasero indicado, ambas caras usan el mismo", () => {
    const res = calcLona({ ...base, anchoAtras: 0 }, DEFAULT_PARAMS);
    expect(res.lonaHecha.anchoAtras).toBe(152);
    expect(res.reparto.delante).toEqual(res.reparto.atras);
  });

  it("cambiar las alturas no altera el contorno calculado", () => {
    const res = calcLona({ ...base, altoAtras: 64 }, DEFAULT_PARAMS);
    expect(res.contornoAjustado).toBe(282);
    expect(res.panoContorno?.alto).toBe(282);
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
    expect(res.recogeDelanteTexto).toBe("NO");
  });
});
