import { describe, expect, it } from "vitest";
import { emptyBaqueton, emptyLona } from "@/components/workspace/entradas-vacias";
import type { LonaInput } from "@/lib/calc/lona";
import type { OrigenRps, PedidoRps } from "@/lib/rps/types";
import type { EstadoWorkspace } from "@/lib/workspace/estado";
import type { LineaPedido } from "@/lib/workspace/lineas";
import {
  erroresVisibles,
  estadoRpsVisible,
  lineaActiva,
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

const linea = (origenRps: OrigenRps | null = null): LineaPedido =>
  ({ version: "10", tipo: "lona", input: emptyLona(), origenRps });

describe("lineaActiva", () => {
  const conLineas = (versionActiva: string | null): EstadoWorkspace => ({
    lineas: [
      { version: "10", tipo: "lona", input: emptyLona() },
      { version: "11", tipo: "baqueton", input: emptyBaqueton() },
    ],
    versionActiva,
  } as unknown as EstadoWorkspace);

  it("devuelve la línea cuya versión está abierta", () => {
    expect(lineaActiva(conLineas("11"))?.tipo).toBe("baqueton");
  });

  it("devuelve null cuando no hay ninguna abierta", () => {
    expect(lineaActiva(conLineas(null))).toBeNull();
  });

  it("devuelve null si la versión activa ya no está en la lista", () => {
    // Pasa al eliminar una línea: el estado no puede quedar apuntando a un hueco.
    expect(lineaActiva(conLineas("99"))).toBeNull();
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
  it("no muestra nada hasta que se ha intentado validar ni se ha tocado nada", () => {
    expect(erroresVisibles([{ campo: "largo", mensaje: "Introduce el largo." }], false, [])).toEqual({});
  });

  it("indexa por campo y conserva el último mensaje de un campo repetido", () => {
    const visibles = erroresVisibles([
      { campo: "ventanaAncho", mensaje: "Introduce el ancho de la ventana." },
      { campo: "ventanaAncho", mensaje: "El ancho de la ventana debe ser menor que el ancho del remolque." },
    ], true, []);
    expect(visibles.ventanaAncho).toBe("El ancho de la ventana debe ser menor que el ancho del remolque.");
  });
});

describe("derivados de RPS", () => {
  it("oculta el pedido y el origen de RPS cuando no corresponden al pedido abierto", () => {
    expect(pedidoRpsVisible("AR2603583", pedidoRps("AR2603583"))?.numero).toBe("AR2603583");
    expect(pedidoRpsVisible("AR2699999", pedidoRps("AR2603583"))).toBeNull();
    expect(origenRpsActivo("AR2603583", linea(origen("AR.26.03583")))?.idLinea).toBe("L1");
    expect(origenRpsActivo("AR2699999", linea(origen("AR2603583")))).toBeNull();
    // Una línea que no vino de RPS, y no tener línea abierta, son lo mismo aquí.
    expect(origenRpsActivo("AR2603583", linea())).toBeNull();
    expect(origenRpsActivo("AR2603583", null)).toBeNull();
  });

  it("solo muestra el estado de la consulta si el número consultado es el actual", () => {
    expect(estadoRpsVisible("AR2603583", "AR2603583", "buscando")).toBe("buscando");
    expect(estadoRpsVisible("AR2603583", "AR2699999", "buscando")).toBe("idle");
  });

  it("mantiene el estado en reposo mientras el número no tiene forma de pedido", () => {
    expect(estadoRpsVisible("AR26", "AR26", "encontrado")).toBe("idle");
  });
});

describe("erroresVisibles con campos tocados", () => {
  const errores = [
    { campo: "largo", mensaje: "Introduce el largo del remolque." },
    { campo: "ancho", mensaje: "Introduce el ancho del remolque." },
  ];

  it("no muestra nada sin validar y sin campos tocados", () => {
    expect(erroresVisibles(errores, false, [])).toEqual({});
  });

  it("muestra solo el error de los campos que se han tocado", () => {
    expect(erroresVisibles(errores, false, ["largo"])).toEqual({
      largo: "Introduce el largo del remolque.",
    });
  });

  it("no inventa error para un campo tocado que es válido", () => {
    expect(erroresVisibles(errores, false, ["material"])).toEqual({});
  });

  it("al intentar validar muestra todos, tocados o no", () => {
    expect(Object.keys(erroresVisibles(errores, true, []))).toEqual(["largo", "ancho"]);
  });
});
