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

  it("cambiar a otro pedido limpia editor, cliente, registros, id, origen y avisos", () => {
    const abierto = reducirWorkspace(conPedidoAbierto(), {
      tipo: "REGISTRO_SELECCIONADO", registro: registro("a", "10"),
    });
    const nuevo = reducirWorkspace(abierto, { tipo: "PEDIDO_CAMBIADO", valor: "AR2604000" });
    expect(nuevo).toEqual({
      ...abierto,
      numeroPedido: "AR2604000",
      lona: {
        ...abierto.lona,
        cabecera: { ...abierto.lona.cabecera, numeroPedido: "AR2604000", cliente: "" },
      },
      baqueton: {
        ...abierto.baqueton,
        cabecera: { ...abierto.baqueton.cabecera, numeroPedido: "AR2604000", cliente: "" },
      },
      cliente: "",
      registros: [],
      cargandoPedido: true,
      editorActivo: false,
      id: undefined,
      baseGuardada: null,
      validacionIntentada: false,
      aviso: null,
      rps: { ...abierto.rps, origen: null, selectorAbierto: true },
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
    const previo = conPedidoAbierto();
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
      aviso: null,
      rps: { ...previo.rps, origen: null, selectorAbierto: false },
    });
  });
});

describe("ELEMENTO_ANADIDO", () => {
  it("abre un borrador sin id, sin base guardada y con el selector de RPS abierto", () => {
    const previo = conPedidoAbierto();
    const base = { ...emptyBaqueton(), cabecera: { ...emptyBaqueton().cabecera, numeroPedido: "AR2603583", version: "11" } };
    const estado = reducirWorkspace(previo, {
      tipo: "ELEMENTO_ANADIDO", tipoElemento: "baqueton", base, aviso: "Baquetón 2 añadido al pedido.",
    });
    expect(estado).toEqual({
      ...previo,
      tipo: "baqueton",
      baqueton: base,
      id: undefined,
      editorActivo: true,
      baseGuardada: null,
      validacionIntentada: false,
      aviso: "Baquetón 2 añadido al pedido.",
      rps: { ...previo.rps, origen: null, selectorAbierto: true },
    });
    // La lona anterior se conserva intacta (misma referencia) al cambiar de tipo.
    expect(estado.lona).toBe(previo.lona);
  });
});

describe("RPS_APLICADO", () => {
  it("aplica el id resuelto por el llamador cuando la versión coincide con un registro guardado", () => {
    const previo = conPedidoAbierto();
    const origen: OrigenRps = {
      numeroPedido: "AR2603583", numeroLinea: 1, idLinea: "L1",
      ordenFabricacion: null, importadoEn: "2026-07-29T10:00:00Z",
    };
    const input = registro("a", "10").input as LonaInput;
    const estado = reducirWorkspace(previo, {
      tipo: "RPS_APLICADO", tipoElemento: "lona", input, origen, id: "a",
      aviso: "Línea 1 de RPS aplicada. Todos los campos siguen siendo editables.",
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
      aviso: "Línea 1 de RPS aplicada. Todos los campos siguen siendo editables.",
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
      // Sin `id`: así llega desde Workspace.tsx cuando ninguna versión guardada coincide.
      aviso: "Línea 3 de RPS aplicada. Todos los campos siguen siendo editables.",
    });
    expect(estado.id).toBeUndefined();
  });
});

describe("GUARDADO_OK", () => {
  it("fija la base guardada y sustituye el registro previo de la misma versión", () => {
    const previo = conPedidoAbierto();
    const guardado = { ...registro("a-nuevo", "10"), updatedAt: "2026-07-29T12:00:00Z" };
    const estado = reducirWorkspace(previo, {
      tipo: "GUARDADO_OK", registro: guardado, aviso: "Remolque 1 guardado dentro del pedido.",
    });
    expect(estado).toEqual({
      ...previo,
      id: "a-nuevo",
      baseGuardada: JSON.stringify(guardado.input),
      validacionIntentada: false,
      registros: [guardado],
      aviso: "Remolque 1 guardado dentro del pedido.",
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

  it("marca la validación intentada y respeta el aviso previo si no hay mensaje", () => {
    const conAviso = reducirWorkspace(conPedidoAbierto(), { tipo: "AVISO_MOSTRADO", texto: "Anterior" });
    const sinMensaje = reducirWorkspace(conAviso, { tipo: "VALIDACION_INTENTADA", aviso: null });
    expect(sinMensaje.validacionIntentada).toBe(true);
    expect(sinMensaje.aviso).toBe("Anterior");

    const conMensaje = reducirWorkspace(conAviso, {
      tipo: "VALIDACION_INTENTADA", aviso: "Revisa los campos marcados. Introduce el largo del remolque.",
    });
    expect(conMensaje.aviso).toBe("Revisa los campos marcados. Introduce el largo del remolque.");
  });

  it("abre y cierra la acción en curso", () => {
    const guardando = reducirWorkspace(conPedidoAbierto(), { tipo: "ACCION_INICIADA", accion: "guardar" });
    expect(guardando.accion).toBe("guardar");
    expect(reducirWorkspace(guardando, { tipo: "ACCION_TERMINADA" }).accion).toBeNull();
  });
});
