import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS } from "@/lib/calc/params";
import { calcBaqueton, type BaquetonInput } from "@/lib/calc/baqueton";

const base: BaquetonInput = {
  cabecera: {
    numeroPedido: "AR2602796", version: "10", cliente: "REMOLQUES YAGÜE",
    revision: "JAIME", realizadoPor: "ADRIAN", fecha: "2026-06-11", fechaSalida: "",
  },
  cantidad: 1, largo: 181, ancho: 121, baqueton: 22,
  clienteEspecifico: "GENERAL",
  modoOllaos: "REPARTIDOS", pasoOllaos: 35,
  ollaosManuales: { laterales: [], atras: [], delante: [] },
  rotulacion: true, textoRotulacion: "YAGUE",
  material: "LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN",
  observaciones: "",
};

describe("calcBaqueton — caso real AR2602796", () => {
  const res = calcBaqueton(base, DEFAULT_PARAMS);

  it("paño único 232 x 172", () => {
    expect(res.panoUnico).toEqual({ largo: 232, ancho: 172 });
  });
  it("remolque hecho 182 x 122, baquetón 22 en línea", () => {
    expect(res.remolqueHecho).toEqual({ largo: 182, ancho: 122 });
    expect(res.baquetonTrasero).toBeNull();
  });
  it("baquetón + costura 24 (esquinas del dibujo)", () => {
    expect(res.baquetonCostura).toBe(24);
    expect(res.esquinaDelante).toBe(24);
    expect(res.esquinaDetras).toBe(24);
  });
  it("superficie 3,9904 m2", () => {
    expect(res.superficieM2).toBe(3.9904);
  });
  it("metros de tela 2,32", () => {
    expect(res.metrosTela).toBe(2.32);
  });
  it("ollaos sobre medidas hechas: largo 182 → 5 uds a 36,4", () => {
    expect(res.ollaos.largo.n).toBe(5);
    expect(res.ollaos.largo.dist).toBe(36.4);
  });
});

describe("calcBaqueton — clientes específicos", () => {
  it("HIJOS DE PEDRO LOPEZ: +11/+2 costura, esquinas 25/35, baquetón trasero 32", () => {
    const res = calcBaqueton({ ...base, clienteEspecifico: "HIJOS DE PEDRO LOPEZ" }, DEFAULT_PARAMS);
    expect(res.panoUnico).toEqual({ largo: 243, ancho: 174 });
    expect(res.esquinaDelante).toBe(25);  // 24 + 1
    expect(res.esquinaDetras).toBe(35);   // 24 + 11
    expect(res.baquetonTrasero).toBe(32); // 22 + 10
    expect(res.notas.join(" ")).toContain("REFORZAR");
  });
  it("AYALA: +1 en costuras y +1 en medidas finales", () => {
    const res = calcBaqueton({ ...base, clienteEspecifico: "AYALA" }, DEFAULT_PARAMS);
    expect(res.panoUnico).toEqual({ largo: 233, ancho: 173 });
    expect(res.remolqueHecho).toEqual({ largo: 183, ancho: 123 });
  });
  it("GENERAL WOLDER: −1 en costuras, −0,5 en esquinas y 3 observaciones fijas", () => {
    const res = calcBaqueton({ ...base, clienteEspecifico: "GENERAL WOLDER" }, DEFAULT_PARAMS);
    expect(res.panoUnico).toEqual({ largo: 231, ancho: 171 });
    expect(res.esquinaDelante).toBe(23.5);
    expect(res.notas).toEqual(expect.arrayContaining(["OLLAOS EN ALTA FRECUENCIA", "MANDAR GOMA SUELTA"]));
  });
});
