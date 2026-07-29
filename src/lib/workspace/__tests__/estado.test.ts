import { describe, expect, it } from "vitest";
import { emptyBaqueton, emptyLona } from "@/components/workspace/entradas-vacias";
import type { LonaInput } from "@/lib/calc/lona";
import type { PlanteamientoRecord } from "@/lib/store/types";
import type { OrigenRps } from "@/lib/rps/types";
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
    expect(nuevo.editorActivo).toBe(false);
    expect(nuevo.id).toBeUndefined();
    expect(nuevo.cliente).toBe("");
    expect(nuevo.lona.cabecera.cliente).toBe("");
    expect(nuevo.registros).toEqual([]);
    expect(nuevo.cargandoPedido).toBe(true);
    expect(nuevo.baseGuardada).toBeNull();
    expect(nuevo.validacionIntentada).toBe(false);
    expect(nuevo.aviso).toBeNull();
    expect(nuevo.rps.origen).toBeNull();
    expect(nuevo.rps.selectorAbierto).toBe(true);
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
    const estado = reducirWorkspace(conPedidoAbierto(), {
      tipo: "REGISTRO_SELECCIONADO", registro: registro("a", "10"),
    });
    expect(estado.editorActivo).toBe(true);
    expect(estado.id).toBe("a");
    expect(estado.tipo).toBe("lona");
    expect(estado.baseGuardada).toBe(JSON.stringify(registro("a", "10").input));
    expect(estado.validacionIntentada).toBe(false);
    expect(estado.aviso).toBeNull();
    expect(estado.rps.origen).toBeNull();
    expect(estado.rps.selectorAbierto).toBe(false);
  });
});

describe("ELEMENTO_ANADIDO", () => {
  it("abre un borrador sin id, sin base guardada y con el selector de RPS abierto", () => {
    const previo = conPedidoAbierto();
    const base = { ...emptyBaqueton(), cabecera: { ...emptyBaqueton().cabecera, numeroPedido: "AR2603583", version: "11" } };
    const estado = reducirWorkspace(previo, {
      tipo: "ELEMENTO_ANADIDO", tipoElemento: "baqueton", base, aviso: "Baquetón 2 añadido al pedido.",
    });
    expect(estado.tipo).toBe("baqueton");
    expect(estado.baqueton.cabecera.version).toBe("11");
    expect(estado.id).toBeUndefined();
    expect(estado.editorActivo).toBe(true);
    expect(estado.baseGuardada).toBeNull();
    expect(estado.aviso).toBe("Baquetón 2 añadido al pedido.");
    expect(estado.rps.selectorAbierto).toBe(true);
    // La lona anterior se conserva intacta al cambiar de tipo.
    expect(estado.lona).toBe(previo.lona);
  });
});

describe("RPS_APLICADO", () => {
  it("reengancha el id del registro cuya versión coincide con la línea aplicada", () => {
    const origen: OrigenRps = {
      numeroPedido: "AR2603583", numeroLinea: 1, idLinea: "L1",
      ordenFabricacion: null, importadoEn: "2026-07-29T10:00:00Z",
    };
    const input = registro("a", "10").input as LonaInput;
    const estado = reducirWorkspace(conPedidoAbierto(), {
      tipo: "RPS_APLICADO", tipoElemento: "lona", input, origen,
      aviso: "Línea 1 de RPS aplicada. Todos los campos siguen siendo editables.",
    });
    expect(estado.id).toBe("a");
    expect(estado.editorActivo).toBe(true);
    expect(estado.cliente).toBe("CLIENTE");
    expect(estado.baseGuardada).toBeNull();
    expect(estado.rps.origen).toEqual(origen);
    expect(estado.rps.selectorAbierto).toBe(false);
  });

  it("deja el id sin definir si ninguna versión guardada coincide", () => {
    const input = { ...emptyLona(), cabecera: { ...emptyLona().cabecera, numeroPedido: "AR2603583", version: "12" } };
    const estado = reducirWorkspace(conPedidoAbierto(), {
      tipo: "RPS_APLICADO", tipoElemento: "lona", input,
      origen: { numeroPedido: "AR2603583", numeroLinea: 3, idLinea: "L3", ordenFabricacion: null, importadoEn: "x" },
      aviso: "Línea 3 de RPS aplicada. Todos los campos siguen siendo editables.",
    });
    expect(estado.id).toBeUndefined();
  });
});

describe("GUARDADO_OK", () => {
  it("fija la base guardada y sustituye el registro previo de la misma versión", () => {
    const guardado = { ...registro("a-nuevo", "10"), updatedAt: "2026-07-29T12:00:00Z" };
    const estado = reducirWorkspace(conPedidoAbierto(), {
      tipo: "GUARDADO_OK", registro: guardado, aviso: "Remolque 1 guardado dentro del pedido.",
    });
    expect(estado.id).toBe("a-nuevo");
    expect(estado.registros).toHaveLength(1);
    expect(estado.registros[0].id).toBe("a-nuevo");
    expect(estado.baseGuardada).toBe(JSON.stringify(guardado.input));
    expect(estado.validacionIntentada).toBe(false);
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
