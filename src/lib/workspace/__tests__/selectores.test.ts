import { describe, expect, it } from "vitest";
import { emptyBaqueton, emptyLona } from "@/components/workspace/entradas-vacias";
import type { LonaInput } from "@/lib/calc/lona";
import type { OrigenRps, PedidoRps } from "@/lib/rps/types";
import {
  erroresVisibles,
  estadoRpsVisible,
  hayCambiosSinGuardar,
  inputActivo,
  medidasSuficientes,
  origenRpsActivo,
  pedidoRpsVisible,
} from "@/lib/workspace/selectores";

const lonaConMedidas = (extra: Partial<LonaInput> = {}): LonaInput => ({
  ...emptyLona(), largo: 600, ancho: 250, altoDelante: 220, ...extra,
});

const pedidoRps = (numero: string): PedidoRps => ({
  numero, fecha: null, fechaSalida: null,
  cliente: { codigo: "1", nombre: "CLIENTE", alias: null },
  lineas: [],
});

const origen = (numeroPedido: string): OrigenRps => ({
  numeroPedido, numeroLinea: 1, idLinea: "L1", ordenFabricacion: null,
  importadoEn: "2026-07-29T10:00:00Z",
});

describe("inputActivo", () => {
  it("devuelve la lona o el baquetón según el tipo activo", () => {
    const lona = emptyLona();
    const baqueton = emptyBaqueton();
    expect(inputActivo("lona", lona, baqueton)).toBe(lona);
    expect(inputActivo("baqueton", lona, baqueton)).toBe(baqueton);
  });
});

describe("hayCambiosSinGuardar", () => {
  it("es falso sin editor activo, aunque el input difiera de la base", () => {
    expect(hayCambiosSinGuardar(false, lonaConMedidas(), JSON.stringify(emptyLona()))).toBe(false);
  });

  it("es verdadero con editor activo y base nula", () => {
    expect(hayCambiosSinGuardar(true, emptyLona(), null)).toBe(true);
  });

  it("es falso cuando el input coincide exactamente con la base guardada", () => {
    const lona = lonaConMedidas();
    expect(hayCambiosSinGuardar(true, lona, JSON.stringify(lona))).toBe(false);
  });
});

describe("medidasSuficientes", () => {
  it("exige largo, ancho y alto delantero en el TIPO 01", () => {
    expect(medidasSuficientes(emptyLona())).toBe(false);
    expect(medidasSuficientes(lonaConMedidas())).toBe(true);
  });

  it("exige aguas en los TIPO 02 y TIPO 03", () => {
    expect(medidasSuficientes(lonaConMedidas({ tipoPerfil: "TIPO 02" }))).toBe(false);
    expect(medidasSuficientes(lonaConMedidas({ tipoPerfil: "TIPO 02", aguas: 30 }))).toBe(true);
    expect(medidasSuficientes(lonaConMedidas({ tipoPerfil: "TIPO 03" }))).toBe(false);
    expect(medidasSuficientes(lonaConMedidas({ tipoPerfil: "TIPO 03", aguas: 30 }))).toBe(true);
  });

  it("exige chaflán en el TIPO 04 y radio de esquina en el TIPO 05", () => {
    expect(medidasSuficientes(lonaConMedidas({ tipoPerfil: "TIPO 04" }))).toBe(false);
    expect(medidasSuficientes(lonaConMedidas({ tipoPerfil: "TIPO 04", chaflan: 20 }))).toBe(true);
    expect(medidasSuficientes(lonaConMedidas({ tipoPerfil: "TIPO 05" }))).toBe(false);
    expect(medidasSuficientes(lonaConMedidas({ tipoPerfil: "TIPO 05", radioEsquina: 15 }))).toBe(true);
  });

  it("en el baquetón exige largo, ancho y medida de baquetón", () => {
    expect(medidasSuficientes({ ...emptyBaqueton(), largo: 600, ancho: 250 })).toBe(false);
    expect(medidasSuficientes({ ...emptyBaqueton(), largo: 600, ancho: 250, baqueton: 12 })).toBe(true);
  });
});

describe("erroresVisibles", () => {
  it("no muestra nada hasta que se ha intentado validar", () => {
    expect(erroresVisibles([{ campo: "largo", mensaje: "Introduce el largo." }], false)).toEqual({});
  });

  it("indexa por campo y conserva el último mensaje de un campo repetido", () => {
    const visibles = erroresVisibles([
      { campo: "ventanaAncho", mensaje: "Introduce el ancho de la ventana." },
      { campo: "ventanaAncho", mensaje: "El ancho de la ventana debe ser menor que el ancho del remolque." },
    ], true);
    expect(visibles.ventanaAncho).toBe("El ancho de la ventana debe ser menor que el ancho del remolque.");
  });
});

describe("derivados de RPS", () => {
  it("oculta el pedido y el origen de RPS cuando no corresponden al pedido abierto", () => {
    expect(pedidoRpsVisible("AR2603583", pedidoRps("AR2603583"))?.numero).toBe("AR2603583");
    expect(pedidoRpsVisible("AR2699999", pedidoRps("AR2603583"))).toBeNull();
    expect(origenRpsActivo("AR2603583", origen("AR.26.03583"))?.idLinea).toBe("L1");
    expect(origenRpsActivo("AR2699999", origen("AR2603583"))).toBeNull();
  });

  it("solo muestra el estado de la consulta si el número consultado es el actual", () => {
    expect(estadoRpsVisible("AR2603583", "AR2603583", "buscando")).toBe("buscando");
    expect(estadoRpsVisible("AR2603583", "AR2699999", "buscando")).toBe("idle");
  });

  it("mantiene el estado en reposo mientras el número no tiene forma de pedido", () => {
    expect(estadoRpsVisible("AR26", "AR26", "encontrado")).toBe("idle");
  });
});
