import { describe, expect, it } from "vitest";
import { emptyBaqueton, emptyLona } from "@/components/workspace/entradas-vacias";
import type { LonaInput } from "@/lib/calc/lona";
import type { PlanteamientoRecord } from "@/lib/store/types";
import type { OrigenRps, PedidoRps } from "@/lib/rps/types";
import {
  estadoInicial,
  reducirWorkspace,
  type EstadoWorkspace,
} from "@/lib/workspace/estado";

const vacios = () => ({ lona: emptyLona(), baqueton: emptyBaqueton() });

const registro = (id: string, version: string, cliente = "CLIENTE"): PlanteamientoRecord => ({
  id, tipo: "lona", numeroPedido: "AR2603583", version, cliente,
  input: { ...emptyLona(), cabecera: { ...emptyLona().cabecera, numeroPedido: "AR2603583", version, cliente } },
  result: {}, paramsSnapshot: {}, snapshotSvg: null,
  createdAt: "2026-07-20T10:00:00Z", updatedAt: "2026-07-20T10:00:00Z",
} as unknown as PlanteamientoRecord);

const conPedidoAbierto = (): EstadoWorkspace => {
  const base = estadoInicial(undefined, vacios());
  const conNumero = reducirWorkspace(base, { tipo: "PEDIDO_CAMBIADO", valor: "AR2603583" });
  return reducirWorkspace(conNumero, {
    tipo: "REGISTROS_CARGADOS", registros: [registro("a", "10")],
  });
};

/**
 * Un pedido abierto pero con todo lo que las transiciones de cascada deben
 * limpiar ya "sucio": validación intentada, id, origen de RPS, base guardada
 * y selector cerrado. Sirve para que los tests de cada rama comprueben que de
 * verdad limpia esos campos, no solo que no añade otros: partiendo de
 * `conPedidoAbierto()` (todo ya limpio) un `toEqual` no detecta que una rama
 * haya dejado de resetear alguno de ellos.
 */
const conBorradorSucio = (): EstadoWorkspace => {
  const abierto = conPedidoAbierto();
  const origenSucio: OrigenRps = {
    numeroPedido: "AR2603583", numeroLinea: 9, idLinea: "L9",
    ordenFabricacion: null, importadoEn: "2026-07-29T09:00:00Z",
  };
  const conRps = reducirWorkspace(abierto, {
    tipo: "RPS_APLICADO",
    tipoElemento: "lona",
    input: { ...emptyLona(), cabecera: { ...emptyLona().cabecera, numeroPedido: "AR2603583", version: "9" } },
    origen: origenSucio,
    id: "sucio",
  });
  // GUARDADO_OK no toca `rps`, así que fija una `baseGuardada` no nula sin
  // deshacer el origen ni el selector cerrado que dejó RPS_APLICADO.
  const conBase = reducirWorkspace(conRps, {
    tipo: "GUARDADO_OK", registro: registro("sucio", "9"),
  });
  return reducirWorkspace(conBase, { tipo: "VALIDACION_INTENTADA" });
};

describe("estadoInicial", () => {
  it("arranca vacío y con el selector de RPS abierto", () => {
    const estado = estadoInicial(undefined, vacios());
    expect(estado.editorActivo).toBe(false);
    expect(estado.cargandoPedido).toBe(false);
    expect(estado.baseGuardada).toBeNull();
    expect(estado.rps.selectorAbierto).toBe(true);
  });

  it("al reutilizar un registro abre el editor con la base ya guardada", () => {
    const input = registro("a", "11").input as LonaInput;
    const estado = estadoInicial({ id: "a", tipo: "lona", input }, vacios());
    expect(estado.editorActivo).toBe(true);
    expect(estado.id).toBe("a");
    expect(estado.numeroPedido).toBe("AR2603583");
    expect(estado.cargandoPedido).toBe(true);
    expect(estado.baseGuardada).toBe(JSON.stringify(input));
  });
});

describe("PEDIDO_CAMBIADO", () => {
  it("propaga el número a las cabeceras de lona y baquetón", () => {
    const estado = reducirWorkspace(estadoInicial(undefined, vacios()), {
      tipo: "PEDIDO_CAMBIADO", valor: "AR2603583",
    });
    expect(estado.numeroPedido).toBe("AR2603583");
    expect(estado.lona.cabecera.numeroPedido).toBe("AR2603583");
    expect(estado.baqueton.cabecera.numeroPedido).toBe("AR2603583");
  });

  it("cambiar a otro pedido limpia editor, cliente, registros, id y origen", () => {
    const sucio = conBorradorSucio();
    const nuevo = reducirWorkspace(sucio, { tipo: "PEDIDO_CAMBIADO", valor: "AR2604000" });
    expect(nuevo).toEqual({
      ...sucio,
      numeroPedido: "AR2604000",
      lona: {
        ...sucio.lona,
        cabecera: { ...sucio.lona.cabecera, numeroPedido: "AR2604000", cliente: "" },
      },
      baqueton: {
        ...sucio.baqueton,
        cabecera: { ...sucio.baqueton.cabecera, numeroPedido: "AR2604000", cliente: "" },
      },
      cliente: "",
      registros: [],
      cargandoPedido: true,
      editorActivo: false,
      id: undefined,
      baseGuardada: null,
      validacionIntentada: false,
      rps: { ...sucio.rps, origen: null, selectorAbierto: true },
    });
  });

  it("reescribir el mismo pedido en otro formato no descarta el trabajo en curso", () => {
    const abierto = reducirWorkspace(conPedidoAbierto(), {
      tipo: "REGISTRO_SELECCIONADO", registro: registro("a", "10"),
    });
    const igual = reducirWorkspace(abierto, { tipo: "PEDIDO_CAMBIADO", valor: "AR.26.03583" });
    expect(igual.editorActivo).toBe(true);
    expect(igual.id).toBe("a");
    expect(igual.registros).toHaveLength(1);
  });

  it("vaciar el número deja de cargar el pedido", () => {
    const estado = reducirWorkspace(conPedidoAbierto(), { tipo: "PEDIDO_CAMBIADO", valor: "" });
    expect(estado.cargandoPedido).toBe(false);
  });
});

describe("REGISTROS_CARGADOS", () => {
  it("deduplica, deja de cargar y rellena el cliente solo si está vacío", () => {
    const estado = reducirWorkspace(
      reducirWorkspace(estadoInicial(undefined, vacios()), {
        tipo: "PEDIDO_CAMBIADO", valor: "AR2603583",
      }),
      { tipo: "REGISTROS_CARGADOS", registros: [registro("a", "10"), registro("a2", "10")] },
    );
    expect(estado.cargandoPedido).toBe(false);
    expect(estado.registros).toHaveLength(1);
    expect(estado.cliente).toBe("CLIENTE");
    expect(estado.lona.cabecera.cliente).toBe("CLIENTE");
  });

  it("no pisa un cliente ya escrito a mano", () => {
    const conCliente = reducirWorkspace(conPedidoAbierto(), {
      tipo: "CLIENTE_CAMBIADO", valor: "OTRO CLIENTE",
    });
    const estado = reducirWorkspace(conCliente, {
      tipo: "REGISTROS_CARGADOS", registros: [registro("a", "10", "CLIENTE DE RPS")],
    });
    expect(estado.cliente).toBe("OTRO CLIENTE");
    expect(estado.lona.cabecera.cliente).toBe("OTRO CLIENTE");
  });
});

describe("REGISTRO_SELECCIONADO", () => {
  it("abre el elegido, fija la base guardada y cierra el selector de RPS", () => {
    const previo = conBorradorSucio();
    const seleccionado = registro("a", "10");
    const estado = reducirWorkspace(previo, {
      tipo: "REGISTRO_SELECCIONADO", registro: seleccionado,
    });
    expect(estado).toEqual({
      ...previo,
      tipo: "lona",
      lona: seleccionado.input,
      numeroPedido: seleccionado.numeroPedido,
      cliente: seleccionado.cliente,
      id: "a",
      editorActivo: true,
      baseGuardada: JSON.stringify(seleccionado.input),
      validacionIntentada: false,
      rps: { ...previo.rps, origen: null, selectorAbierto: false },
    });
  });
});

describe("ELEMENTO_ANADIDO", () => {
  it("abre un borrador sin id, sin base guardada y con el selector de RPS abierto", () => {
    const previo = conBorradorSucio();
    const base = { ...emptyBaqueton(), cabecera: { ...emptyBaqueton().cabecera, numeroPedido: "AR2603583", version: "11" } };
    const estado = reducirWorkspace(previo, {
      tipo: "ELEMENTO_ANADIDO", tipoElemento: "baqueton", base,
    });
    expect(estado).toEqual({
      ...previo,
      tipo: "baqueton",
      baqueton: base,
      id: undefined,
      editorActivo: true,
      baseGuardada: null,
      validacionIntentada: false,
      rps: { ...previo.rps, origen: null, selectorAbierto: true },
    });
    // La lona anterior se conserva intacta (misma referencia) al cambiar de tipo.
    expect(estado.lona).toBe(previo.lona);
  });
});

describe("RPS_APLICADO", () => {
  it("aplica el id resuelto por el llamador cuando la versión coincide con un registro guardado", () => {
    const previo = conBorradorSucio();
    const origen: OrigenRps = {
      numeroPedido: "AR2603583", numeroLinea: 1, idLinea: "L1",
      ordenFabricacion: null, importadoEn: "2026-07-29T10:00:00Z",
    };
    const input = registro("a", "10").input as LonaInput;
    const estado = reducirWorkspace(previo, {
      tipo: "RPS_APLICADO", tipoElemento: "lona", input, origen, id: "a",
    });
    expect(estado).toEqual({
      ...previo,
      tipo: "lona",
      lona: input,
      numeroPedido: input.cabecera.numeroPedido,
      cliente: input.cabecera.cliente,
      editorActivo: true,
      id: "a",
      baseGuardada: null,
      validacionIntentada: false,
      rps: { ...previo.rps, origen, selectorAbierto: false },
    });
  });

  it("deja el id sin definir cuando el llamador no resolvió ninguna versión guardada", () => {
    const previo = conPedidoAbierto();
    const input = { ...emptyLona(), cabecera: { ...emptyLona().cabecera, numeroPedido: "AR2603583", version: "12" } };
    const origen: OrigenRps = {
      numeroPedido: "AR2603583", numeroLinea: 3, idLinea: "L3", ordenFabricacion: null, importadoEn: "x",
    };
    const estado = reducirWorkspace(previo, {
      tipo: "RPS_APLICADO", tipoElemento: "lona", input, origen,
      // `id: undefined` explícito: así llega desde Workspace.tsx cuando ninguna
      // versión guardada coincide.
      id: undefined,
    });
    expect(estado.id).toBeUndefined();
  });
});

describe("GUARDADO_OK", () => {
  it("fija la base guardada y sustituye el registro previo de la misma versión", () => {
    const previo = conPedidoAbierto();
    const guardado = { ...registro("a-nuevo", "10"), updatedAt: "2026-07-29T12:00:00Z" };
    const estado = reducirWorkspace(previo, {
      tipo: "GUARDADO_OK", registro: guardado,
    });
    expect(estado).toEqual({
      ...previo,
      id: "a-nuevo",
      baseGuardada: JSON.stringify(guardado.input),
      validacionIntentada: false,
      registros: [guardado],
    });
  });
});

describe("INPUT_CAMBIADO", () => {
  it("con tipo lona actualiza lona y deja baquetón intacto por identidad", () => {
    const previo = conPedidoAbierto();
    const nuevoInput = { ...previo.lona, cabecera: { ...previo.lona.cabecera, cliente: "OTRO" } };
    const estado = reducirWorkspace(previo, { tipo: "INPUT_CAMBIADO", input: nuevoInput });
    expect(estado).toEqual({ ...previo, lona: nuevoInput });
    expect(estado.baqueton).toBe(previo.baqueton);
  });

  it("con tipo baquetón actualiza baquetón y deja lona intacta por identidad", () => {
    const previo = estadoInicial({ id: "b", tipo: "baqueton", input: emptyBaqueton() }, vacios());
    const nuevoInput = { ...previo.baqueton, cabecera: { ...previo.baqueton.cabecera, cliente: "OTRO" } };
    const estado = reducirWorkspace(previo, { tipo: "INPUT_CAMBIADO", input: nuevoInput });
    expect(estado).toEqual({ ...previo, baqueton: nuevoInput });
    expect(estado.lona).toBe(previo.lona);
  });
});

describe("acciones de RPS y de proceso", () => {
  it("recorre el ciclo de consulta de RPS", () => {
    const buscando = reducirWorkspace(conPedidoAbierto(), {
      tipo: "RPS_CONSULTA_INICIADA", numero: "AR2603583",
    });
    expect(buscando.rps).toMatchObject({ estado: "buscando", numeroConsultado: "AR2603583", error: null });

    const error = reducirWorkspace(buscando, { tipo: "RPS_ERROR", mensaje: "RPS no responde." });
    expect(error.rps).toMatchObject({ estado: "error", pedido: null, error: "RPS no responde." });

    const reintento = reducirWorkspace(error, { tipo: "RPS_REINTENTADO" });
    expect(reintento.rps.reintento).toBe(1);
  });

  it("RPS_ENCONTRADO fija el pedido y el estado de la consulta", () => {
    const previo = conPedidoAbierto();
    const pedido: PedidoRps = {
      numero: "AR2603583", fecha: null, fechaSalida: null,
      cliente: { codigo: "1", nombre: "CLIENTE", alias: null },
      lineas: [],
    };
    const estado = reducirWorkspace(previo, { tipo: "RPS_ENCONTRADO", pedido });
    expect(estado).toEqual({ ...previo, rps: { ...previo.rps, pedido, estado: "encontrado" } });
  });

  it("RPS_NO_ENCONTRADO limpia el pedido y marca el estado", () => {
    const previo = conPedidoAbierto();
    const estado = reducirWorkspace(previo, { tipo: "RPS_NO_ENCONTRADO" });
    expect(estado).toEqual({ ...previo, rps: { ...previo.rps, pedido: null, estado: "no-encontrado" } });
  });

  it("RPS_SELECTOR_ABIERTO reabre el selector sin tocar el resto del estado de RPS", () => {
    const cerrado = reducirWorkspace(conPedidoAbierto(), {
      tipo: "REGISTRO_SELECCIONADO", registro: registro("a", "10"),
    });
    expect(cerrado.rps.selectorAbierto).toBe(false);
    const estado = reducirWorkspace(cerrado, { tipo: "RPS_SELECTOR_ABIERTO" });
    expect(estado).toEqual({ ...cerrado, rps: { ...cerrado.rps, selectorAbierto: true } });
  });

  it("REGISTROS_FALLARON vacía los registros y deja de cargar", () => {
    const previo = conPedidoAbierto();
    const estado = reducirWorkspace(previo, { tipo: "REGISTROS_FALLARON" });
    expect(estado).toEqual({ ...previo, registros: [], cargandoPedido: false });
  });

  it("VALIDACION_INTENTADA solo marca la validación como intentada", () => {
    const previo = conPedidoAbierto();
    const estado = reducirWorkspace(previo, { tipo: "VALIDACION_INTENTADA" });
    expect(estado).toEqual({ ...previo, validacionIntentada: true });
  });

  it("abre y cierra la acción en curso", () => {
    const guardando = reducirWorkspace(conPedidoAbierto(), { tipo: "ACCION_INICIADA", accion: "guardar" });
    expect(guardando.accion).toBe("guardar");
    expect(reducirWorkspace(guardando, { tipo: "ACCION_TERMINADA" }).accion).toBeNull();
  });
});

describe("CAMPO_TOCADO", () => {
  it("acumula campos sin repetirlos", () => {
    const uno = reducirWorkspace(conPedidoAbierto(), { tipo: "CAMPO_TOCADO", campo: "largo" });
    const dos = reducirWorkspace(uno, { tipo: "CAMPO_TOCADO", campo: "ancho" });
    const repetido = reducirWorkspace(dos, { tipo: "CAMPO_TOCADO", campo: "largo" });
    expect(repetido.camposTocados).toEqual(["largo", "ancho"]);
  });

  it("devuelve el mismo estado si el campo ya estaba", () => {
    const uno = reducirWorkspace(conPedidoAbierto(), { tipo: "CAMPO_TOCADO", campo: "largo" });
    expect(reducirWorkspace(uno, { tipo: "CAMPO_TOCADO", campo: "largo" })).toBe(uno);
  });

  it("se limpia al cambiar de pedido, al seleccionar otro registro y al guardar", () => {
    const tocado = reducirWorkspace(conPedidoAbierto(), { tipo: "CAMPO_TOCADO", campo: "largo" });
    expect(reducirWorkspace(tocado, {
      tipo: "PEDIDO_CAMBIADO", valor: "AR2604000",
    }).camposTocados).toEqual([]);
    expect(reducirWorkspace(tocado, {
      tipo: "REGISTRO_SELECCIONADO", registro: registro("a", "10"),
    }).camposTocados).toEqual([]);
    expect(reducirWorkspace(tocado, {
      tipo: "GUARDADO_OK", registro: registro("a", "10"),
    }).camposTocados).toEqual([]);
  });
});
