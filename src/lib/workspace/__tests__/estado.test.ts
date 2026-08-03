import { describe, expect, it } from "vitest";
import { emptyLona } from "@/components/workspace/entradas-vacias";
import type { LonaInput } from "@/lib/calc/lona";
import type { PlanteamientoRecord } from "@/lib/store/types";
import type { PedidoRps } from "@/lib/rps/types";
import type { LineaPedido } from "@/lib/workspace/lineas";
import { estadoInicial, reducirWorkspace, type EstadoWorkspace } from "@/lib/workspace/estado";

const inputCon = (version: string, cambios: Partial<LonaInput> = {}): LonaInput => ({
  ...emptyLona(),
  cabecera: { ...emptyLona().cabecera, numeroPedido: "AR2603583", version, cliente: "CLIENTE" },
  ...cambios,
});

const linea = (version: string, cambios: Partial<LineaPedido> = {}): LineaPedido => ({
  version, tipo: "lona", input: inputCon(version), ...cambios,
});

const registro = (id: string, version: string, cliente = "CLIENTE"): PlanteamientoRecord => ({
  id, tipo: "lona", numeroPedido: "AR2603583", version, cliente,
  input: inputCon(version), result: {}, paramsSnapshot: {}, snapshotSvg: null,
  createdAt: "2026-07-20T10:00:00Z", updatedAt: "2026-07-20T10:00:00Z",
} as unknown as PlanteamientoRecord);

const conPedido = (): EstadoWorkspace =>
  reducirWorkspace(estadoInicial(), {
    tipo: "PEDIDO_CAMBIADO", valor: "AR2603583",
  });

const conDosLineas = (): EstadoWorkspace => {
  const una = reducirWorkspace(conPedido(), { tipo: "LINEA_ANADIDA", linea: linea("10") });
  return reducirWorkspace(una, { tipo: "LINEA_ANADIDA", linea: linea("11") });
};

describe("estadoInicial", () => {
  it("arranca sin líneas, sin línea activa y con el selector de RPS abierto", () => {
    const estado = estadoInicial();
    expect(estado.lineas).toEqual([]);
    expect(estado.versionActiva).toBeNull();
    expect(estado.numeroPedido).toBe("");
    expect(estado.rps.selectorAbierto).toBe(true);
  });

  it("al reutilizar un registro lo abre como línea con su id", () => {
    const estado = estadoInicial({ id: "a", tipo: "lona", input: inputCon("10") });
    expect(estado.lineas).toEqual([{ version: "10", tipo: "lona", input: inputCon("10"), id: "a", snapshotSvg: null }]);
    expect(estado.versionActiva).toBe("10");
    expect(estado.numeroPedido).toBe("AR2603583");
    expect(estado.cargandoPedido).toBe(true);
  });
});

describe("PEDIDO_CAMBIADO", () => {
  it("propaga el número a la cabecera de cada línea", () => {
    // Mismo pedido escrito en otro formato: normaliza igual, así que no
    // descarta nada y solo reescribe el número tal como se ha tecleado.
    const cambiado = reducirWorkspace(conDosLineas(), {
      tipo: "PEDIDO_CAMBIADO", valor: "AR.26.03583",
    });
    for (const l of cambiado.lineas) expect(l.input.cabecera.numeroPedido).toBe("AR.26.03583");
    expect(cambiado.lineas).toHaveLength(2);
  });

  it("cambiar a otro pedido vacía las líneas, el cliente y el estado de edición", () => {
    const previo = conDosLineas();
    const cambiado = reducirWorkspace(previo, { tipo: "PEDIDO_CAMBIADO", valor: "AR2600001" });
    expect(cambiado).toEqual({
      ...previo,
      numeroPedido: "AR2600001",
      cliente: "",
      lineas: [],
      versionActiva: null,
      cargandoPedido: true,
      validacionIntentada: false,
      camposTocados: [],
      rps: { ...previo.rps, selectorAbierto: true },
    });
  });

  it("vaciar el número deja de cargar el pedido", () => {
    expect(reducirWorkspace(conPedido(), { tipo: "PEDIDO_CAMBIADO", valor: "" }).cargandoPedido)
      .toBe(false);
  });
});

describe("BORRADORES_RECUPERADOS y REGISTROS_CARGADOS", () => {
  it("los borradores recuperados abren la primera línea", () => {
    const estado = reducirWorkspace(conPedido(), {
      tipo: "BORRADORES_RECUPERADOS", lineas: [linea("10"), linea("11")],
    });
    expect(estado.lineas).toHaveLength(2);
    expect(estado.versionActiva).toBe("10");
  });

  it("los borradores no pisan la línea que ya se está editando", () => {
    const editando = conDosLineas();
    const estado = reducirWorkspace(editando, {
      tipo: "BORRADORES_RECUPERADOS", lineas: [linea("10", { input: inputCon("10", { largo: 999 }) })],
    });
    expect(estado.versionActiva).toBe("11");
    expect((estado.lineas[0].input as LonaInput).largo).toBe(0);
  });

  it("los registros guardados se fusionan sin pisar el borrador y deja de cargar", () => {
    const conBorrador = reducirWorkspace(conPedido(), {
      tipo: "LINEA_ANADIDA", linea: linea("10", { input: inputCon("10", { largo: 999 }) }),
    });
    const estado = reducirWorkspace(conBorrador, {
      tipo: "REGISTROS_CARGADOS", registros: [registro("a", "10"), registro("b", "11")],
    });
    expect(estado.cargandoPedido).toBe(false);
    expect(estado.lineas.map((l) => [l.version, l.id])).toEqual([["10", "a"], ["11", "b"]]);
    // El borrador manda en el contenido, pero hereda el id del registro.
    expect((estado.lineas[0].input as LonaInput).largo).toBe(999);
  });

  it("rellena el cliente del pedido solo si está vacío", () => {
    const estado = reducirWorkspace(conPedido(), {
      tipo: "REGISTROS_CARGADOS", registros: [registro("a", "10", "REMOLQUES YAGÜE")],
    });
    expect(estado.cliente).toBe("REMOLQUES YAGÜE");
    const aMano = reducirWorkspace(
      reducirWorkspace(conPedido(), { tipo: "CLIENTE_CAMBIADO", valor: "OTRO" }),
      { tipo: "REGISTROS_CARGADOS", registros: [registro("a", "10", "REMOLQUES YAGÜE")] },
    );
    expect(aMano.cliente).toBe("OTRO");
  });

  it("REGISTROS_FALLARON deja de cargar sin tocar las líneas", () => {
    const previo = conDosLineas();
    const estado = reducirWorkspace(previo, { tipo: "REGISTROS_FALLARON" });
    expect(estado).toEqual({ ...previo, cargandoPedido: false });
  });
});

describe("LINEA_ANADIDA", () => {
  it("añade al final, la abre y limpia la validación", () => {
    const previo = reducirWorkspace(conDosLineas(), { tipo: "VALIDACION_INTENTADA" });
    const estado = reducirWorkspace(previo, { tipo: "LINEA_ANADIDA", linea: linea("12") });
    expect(estado).toEqual({
      ...previo,
      lineas: [...previo.lineas, linea("12")],
      versionActiva: "12",
      validacionIntentada: false,
      camposTocados: [],
      rps: { ...previo.rps, selectorAbierto: true },
    });
  });

  it("una línea importada de RPS sustituye a la de su misma versión", () => {
    const previo = conDosLineas();
    const importada = linea("11", { origenRps: {
      numeroPedido: "AR2603583", numeroLinea: 20, idLinea: "L20",
      ordenFabricacion: "0230001", importadoEn: "2026-08-02T09:00:00Z",
    } });
    const estado = reducirWorkspace(previo, { tipo: "LINEA_ANADIDA", linea: importada });
    expect(estado.lineas).toHaveLength(2);
    expect(estado.lineas[1]).toEqual(importada);
    expect(estado.versionActiva).toBe("11");
  });
});

describe("LINEA_SELECCIONADA y LINEA_ELIMINADA", () => {
  it("seleccionar abre otra línea y limpia la validación de la anterior", () => {
    const previo = reducirWorkspace(conDosLineas(), { tipo: "CAMPO_TOCADO", campo: "largo" });
    const estado = reducirWorkspace(previo, { tipo: "LINEA_SELECCIONADA", version: "10" });
    expect(estado).toEqual({
      ...previo, versionActiva: "10", validacionIntentada: false, camposTocados: [],
      rps: { ...previo.rps, selectorAbierto: false },
    });
  });

  it("seleccionar una versión que no existe no cambia nada", () => {
    const previo = conDosLineas();
    expect(reducirWorkspace(previo, { tipo: "LINEA_SELECCIONADA", version: "99" })).toBe(previo);
  });

  it("eliminar quita la línea y abre la anterior", () => {
    const estado = reducirWorkspace(conDosLineas(), { tipo: "LINEA_ELIMINADA", version: "11" });
    expect(estado.lineas.map((l) => l.version)).toEqual(["10"]);
    expect(estado.versionActiva).toBe("10");
  });

  it("eliminar la única línea deja el pedido sin línea activa", () => {
    const una = reducirWorkspace(conPedido(), { tipo: "LINEA_ANADIDA", linea: linea("10") });
    const estado = reducirWorkspace(una, { tipo: "LINEA_ELIMINADA", version: "10" });
    expect(estado.lineas).toEqual([]);
    expect(estado.versionActiva).toBeNull();
  });

  it("eliminar una que no está abierta no cambia cuál está abierta", () => {
    const estado = reducirWorkspace(conDosLineas(), { tipo: "LINEA_ELIMINADA", version: "10" });
    expect(estado.versionActiva).toBe("11");
  });
});

describe("INPUT_CAMBIADO y SNAPSHOT_CAPTURADO", () => {
  it("cambia solo la línea activa, y deja las demás por identidad", () => {
    const previo = conDosLineas();
    const estado = reducirWorkspace(previo, { tipo: "INPUT_CAMBIADO", input: inputCon("11", { largo: 700 }) });
    expect((estado.lineas[1].input as LonaInput).largo).toBe(700);
    expect(estado.lineas[0]).toBe(previo.lineas[0]);
  });

  it("sin línea activa no hay nada que cambiar", () => {
    const previo = conPedido();
    expect(reducirWorkspace(previo, { tipo: "INPUT_CAMBIADO", input: inputCon("10") })).toBe(previo);
  });

  it("el dibujo se guarda en su línea, no en la activa", () => {
    const estado = reducirWorkspace(conDosLineas(), {
      tipo: "SNAPSHOT_CAPTURADO", version: "10", svg: "<svg/>",
    });
    expect(estado.lineas[0].snapshotSvg).toBe("<svg/>");
    expect(estado.lineas[1].snapshotSvg).toBeUndefined();
    expect(estado.versionActiva).toBe("11");
  });

  it("capturar sin dibujo conserva el que la línea ya tenía", () => {
    const conDibujo = reducirWorkspace(conDosLineas(), {
      tipo: "SNAPSHOT_CAPTURADO", version: "10", svg: "<svg>viejo</svg>",
    });
    const sinLeer = reducirWorkspace(conDibujo, {
      tipo: "SNAPSHOT_CAPTURADO", version: "10", svg: null,
    });
    expect(sinLeer.lineas[0].snapshotSvg).toBe("<svg>viejo</svg>");
    const nuevo = reducirWorkspace(conDibujo, {
      tipo: "SNAPSHOT_CAPTURADO", version: "10", svg: "<svg>nuevo</svg>",
    });
    expect(nuevo.lineas[0].snapshotSvg).toBe("<svg>nuevo</svg>");
  });
});

describe("PEDIDO_COMPLETADO", () => {
  it("asigna a cada línea el id del registro que se acaba de guardar", () => {
    const previo = reducirWorkspace(conDosLineas(), { tipo: "VALIDACION_INTENTADA" });
    const estado = reducirWorkspace(previo, {
      tipo: "PEDIDO_COMPLETADO",
      numeroPedido: "AR2603583",
      registros: [registro("a", "10"), registro("b", "11")],
    });
    expect(estado).toEqual({
      ...previo,
      lineas: [
        { ...previo.lineas[0], id: "a" },
        { ...previo.lineas[1], id: "b" },
      ],
      validacionIntentada: false,
      camposTocados: [],
    });
  });

  it("si ya se cambió de pedido no estampa los ids del anterior", () => {
    // El guardado tarda: para cuando llegan los ids, en pantalla puede haber
    // otro pedido, y sus líneas no son las que se acaban de guardar.
    const previo = reducirWorkspace(conDosLineas(), {
      tipo: "PEDIDO_CAMBIADO", valor: "AR2600001",
    });
    const conOtrasLineas = reducirWorkspace(previo, {
      tipo: "LINEA_ANADIDA", linea: linea("10"),
    });
    const estado = reducirWorkspace(conOtrasLineas, {
      tipo: "PEDIDO_COMPLETADO",
      numeroPedido: "AR2603583",
      registros: [registro("a", "10"), registro("b", "11")],
    });
    expect(estado).toEqual(conOtrasLineas);
    expect(estado.lineas.map((l) => l.id)).toEqual([undefined]);
  });
});

describe("acciones de RPS y de proceso", () => {
  it("recorre el ciclo de consulta de RPS", () => {
    const pedidoRps = { numero: "AR2603583", lineas: [] } as unknown as PedidoRps;
    const buscando = reducirWorkspace(conPedido(), {
      tipo: "RPS_CONSULTA_INICIADA", numero: "AR2603583",
    });
    expect(buscando.rps.estado).toBe("buscando");
    expect(reducirWorkspace(buscando, { tipo: "RPS_ENCONTRADO", pedido: pedidoRps }).rps.estado)
      .toBe("encontrado");
    expect(reducirWorkspace(buscando, { tipo: "RPS_NO_ENCONTRADO" }).rps.pedido).toBeNull();
    expect(reducirWorkspace(buscando, { tipo: "RPS_ERROR", mensaje: "boom" }).rps.error).toBe("boom");
  });

  it("RPS_SELECTOR_ABIERTO y RPS_REINTENTADO solo tocan lo suyo", () => {
    const previo = conDosLineas();
    expect(reducirWorkspace(previo, { tipo: "RPS_SELECTOR_ABIERTO" }))
      .toEqual({ ...previo, rps: { ...previo.rps, selectorAbierto: true } });
    expect(reducirWorkspace(previo, { tipo: "RPS_REINTENTADO" }))
      .toEqual({ ...previo, rps: { ...previo.rps, reintento: previo.rps.reintento + 1 } });
  });

  it("abre y cierra la acción en curso", () => {
    const ocupado = reducirWorkspace(conPedido(), { tipo: "ACCION_INICIADA", accion: "completar" });
    expect(ocupado.accion).toBe("completar");
    expect(reducirWorkspace(ocupado, { tipo: "ACCION_TERMINADA" }).accion).toBeNull();
  });
});

describe("CAMPO_TOCADO", () => {
  it("acumula campos sin repetirlos", () => {
    const uno = reducirWorkspace(conDosLineas(), { tipo: "CAMPO_TOCADO", campo: "largo" });
    const dos = reducirWorkspace(uno, { tipo: "CAMPO_TOCADO", campo: "ancho" });
    expect(dos.camposTocados).toEqual(["largo", "ancho"]);
  });

  it("devuelve el mismo estado si el campo ya estaba", () => {
    const uno = reducirWorkspace(conDosLineas(), { tipo: "CAMPO_TOCADO", campo: "largo" });
    expect(reducirWorkspace(uno, { tipo: "CAMPO_TOCADO", campo: "largo" })).toBe(uno);
  });
});
