import type { LonaInput } from "@/lib/calc/lona";
import type { BaquetonInput } from "@/lib/calc/baqueton";
import type { PlanteamientoRecord, TipoPlanteamiento } from "@/lib/store/types";
import type { OrigenRps, PedidoRps } from "@/lib/rps/types";
import type { EstadoConsultaRps } from "@/lib/workspace/selectores";
import { remolquesUnicos } from "@/lib/pedidos/agrupar-pedido";
import { normalizarNumeroPedidoRps } from "@/lib/rps/numero-pedido";

export interface EstadoRpsWorkspace {
  estado: EstadoConsultaRps;
  /** Número por el que se lanzó la última consulta, ya normalizado. */
  numeroConsultado: string;
  pedido: PedidoRps | null;
  error: string | null;
  origen: OrigenRps | null;
  reintento: number;
  selectorAbierto: boolean;
}

export interface EstadoWorkspace {
  // Documento en edición
  tipo: TipoPlanteamiento;
  lona: LonaInput;
  baqueton: BaquetonInput;
  id?: string;
  editorActivo: boolean;
  /** JSON del input tal como quedó guardado; null si nunca se guardó. */
  baseGuardada: string | null;
  validacionIntentada: boolean;

  // Pedido abierto
  numeroPedido: string;
  cliente: string;
  registros: PlanteamientoRecord[];
  cargandoPedido: boolean;

  // Importación RPS
  rps: EstadoRpsWorkspace;

  // Transversal
  aviso: string | null;
  accion: "guardar" | "preview" | "pdf" | null;
}

export interface EntradaInicial {
  id?: string;
  tipo: TipoPlanteamiento;
  input: LonaInput | BaquetonInput;
}

export type AccionWorkspace =
  | { tipo: "PEDIDO_CAMBIADO"; valor: string }
  | { tipo: "CLIENTE_CAMBIADO"; valor: string }
  | { tipo: "INPUT_CAMBIADO"; input: LonaInput | BaquetonInput }
  | { tipo: "ELEMENTO_ANADIDO"; tipoElemento: TipoPlanteamiento; base: LonaInput | BaquetonInput; aviso: string }
  | { tipo: "REGISTRO_SELECCIONADO"; registro: PlanteamientoRecord }
  | { tipo: "RPS_APLICADO"; tipoElemento: TipoPlanteamiento; input: LonaInput | BaquetonInput; origen: OrigenRps; aviso: string }
  | { tipo: "RPS_SELECTOR_ABIERTO" }
  | { tipo: "RPS_REINTENTADO" }
  | { tipo: "REGISTROS_CARGADOS"; registros: PlanteamientoRecord[] }
  | { tipo: "REGISTROS_FALLARON" }
  | { tipo: "RPS_CONSULTA_INICIADA"; numero: string }
  | { tipo: "RPS_ENCONTRADO"; pedido: PedidoRps }
  | { tipo: "RPS_NO_ENCONTRADO" }
  | { tipo: "RPS_ERROR"; mensaje: string }
  | { tipo: "GUARDADO_OK"; registro: PlanteamientoRecord; aviso: string }
  | { tipo: "ACCION_INICIADA"; accion: "guardar" | "preview" | "pdf" }
  | { tipo: "ACCION_TERMINADA" }
  | { tipo: "VALIDACION_INTENTADA"; aviso: string | null }
  | { tipo: "AVISO_MOSTRADO"; texto: string | null };

type Cabecera = LonaInput["cabecera"];

const conCabecera = <T extends LonaInput | BaquetonInput>(
  input: T,
  cambios: Partial<Cabecera>,
): T => ({ ...input, cabecera: { ...input.cabecera, ...cambios } });

/**
 * `vacios` llega desde fuera porque `emptyLona()` lee la fecha del día: el
 * reducer y su estado inicial se mantienen puros y deterministas.
 */
export function estadoInicial(
  inicial: EntradaInicial | undefined,
  vacios: { lona: LonaInput; baqueton: BaquetonInput },
): EstadoWorkspace {
  return {
    tipo: inicial?.tipo ?? "lona",
    lona: inicial?.tipo === "lona" ? (inicial.input as LonaInput) : vacios.lona,
    baqueton: inicial?.tipo === "baqueton" ? (inicial.input as BaquetonInput) : vacios.baqueton,
    id: inicial?.id,
    editorActivo: Boolean(inicial),
    baseGuardada: inicial ? JSON.stringify(inicial.input) : null,
    validacionIntentada: false,
    numeroPedido: inicial?.input.cabecera.numeroPedido ?? "",
    cliente: inicial?.input.cabecera.cliente ?? "",
    registros: [],
    cargandoPedido: Boolean(inicial?.input.cabecera.numeroPedido),
    rps: {
      estado: "idle", numeroConsultado: "", pedido: null, error: null,
      origen: null, reintento: 0, selectorAbierto: true,
    },
    aviso: null,
    accion: null,
  };
}

export function reducirWorkspace(
  estado: EstadoWorkspace,
  accion: AccionWorkspace,
): EstadoWorkspace {
  switch (accion.tipo) {
    case "PEDIDO_CAMBIADO": {
      const cambiaPedido = normalizarNumeroPedidoRps(accion.valor)
        !== normalizarNumeroPedidoRps(estado.numeroPedido);
      const conNumero: EstadoWorkspace = {
        ...estado,
        numeroPedido: accion.valor,
        lona: conCabecera(estado.lona, { numeroPedido: accion.valor }),
        baqueton: conCabecera(estado.baqueton, { numeroPedido: accion.valor }),
      };
      if (!cambiaPedido) return conNumero;
      return {
        ...conNumero,
        cliente: "",
        lona: conCabecera(conNumero.lona, { cliente: "" }),
        baqueton: conCabecera(conNumero.baqueton, { cliente: "" }),
        registros: [],
        cargandoPedido: Boolean(normalizarNumeroPedidoRps(accion.valor)),
        editorActivo: false,
        id: undefined,
        baseGuardada: null,
        validacionIntentada: false,
        aviso: null,
        rps: { ...estado.rps, origen: null, selectorAbierto: true },
      };
    }

    case "CLIENTE_CAMBIADO":
      return {
        ...estado,
        cliente: accion.valor,
        lona: conCabecera(estado.lona, { cliente: accion.valor }),
        baqueton: conCabecera(estado.baqueton, { cliente: accion.valor }),
      };

    case "INPUT_CAMBIADO":
      return estado.tipo === "lona"
        ? { ...estado, lona: accion.input as LonaInput }
        : { ...estado, baqueton: accion.input as BaquetonInput };

    case "ELEMENTO_ANADIDO":
      return {
        ...estado,
        tipo: accion.tipoElemento,
        lona: accion.tipoElemento === "lona" ? accion.base as LonaInput : estado.lona,
        baqueton: accion.tipoElemento === "baqueton" ? accion.base as BaquetonInput : estado.baqueton,
        id: undefined,
        editorActivo: true,
        baseGuardada: null,
        validacionIntentada: false,
        aviso: accion.aviso,
        rps: { ...estado.rps, origen: null, selectorAbierto: true },
      };

    case "REGISTRO_SELECCIONADO": {
      const { registro } = accion;
      return {
        ...estado,
        tipo: registro.tipo,
        lona: registro.tipo === "lona" ? registro.input as LonaInput : estado.lona,
        baqueton: registro.tipo === "baqueton" ? registro.input as BaquetonInput : estado.baqueton,
        numeroPedido: registro.numeroPedido,
        cliente: registro.cliente,
        id: registro.id,
        editorActivo: true,
        baseGuardada: JSON.stringify(registro.input),
        validacionIntentada: false,
        aviso: null,
        rps: { ...estado.rps, origen: null, selectorAbierto: false },
      };
    }

    case "RPS_APLICADO": {
      const { input } = accion;
      return {
        ...estado,
        tipo: accion.tipoElemento,
        lona: accion.tipoElemento === "lona" ? input as LonaInput : estado.lona,
        baqueton: accion.tipoElemento === "baqueton" ? input as BaquetonInput : estado.baqueton,
        numeroPedido: input.cabecera.numeroPedido,
        cliente: input.cabecera.cliente,
        editorActivo: true,
        id: estado.registros.find((r) => r.version === input.cabecera.version)?.id,
        baseGuardada: null,
        validacionIntentada: false,
        aviso: accion.aviso,
        rps: { ...estado.rps, origen: accion.origen, selectorAbierto: false },
      };
    }

    case "RPS_SELECTOR_ABIERTO":
      return { ...estado, rps: { ...estado.rps, selectorAbierto: true } };

    case "RPS_REINTENTADO":
      return { ...estado, rps: { ...estado.rps, reintento: estado.rps.reintento + 1 } };

    case "REGISTROS_CARGADOS": {
      const registros = remolquesUnicos(accion.registros);
      const base: EstadoWorkspace = { ...estado, registros, cargandoPedido: false };
      const guardado = registros.find((r) => r.cliente.trim())?.cliente;
      if (!guardado) return base;
      return {
        ...base,
        cliente: base.cliente.trim() ? base.cliente : guardado,
        lona: base.lona.cabecera.cliente.trim() ? base.lona : conCabecera(base.lona, { cliente: guardado }),
        baqueton: base.baqueton.cabecera.cliente.trim()
          ? base.baqueton
          : conCabecera(base.baqueton, { cliente: guardado }),
      };
    }

    case "REGISTROS_FALLARON":
      return { ...estado, registros: [], cargandoPedido: false };

    case "RPS_CONSULTA_INICIADA":
      return {
        ...estado,
        rps: { ...estado.rps, numeroConsultado: accion.numero, estado: "buscando", error: null },
      };

    case "RPS_ENCONTRADO":
      return { ...estado, rps: { ...estado.rps, pedido: accion.pedido, estado: "encontrado" } };

    case "RPS_NO_ENCONTRADO":
      return { ...estado, rps: { ...estado.rps, pedido: null, estado: "no-encontrado" } };

    case "RPS_ERROR":
      return {
        ...estado,
        rps: { ...estado.rps, pedido: null, error: accion.mensaje, estado: "error" },
      };

    case "GUARDADO_OK":
      return {
        ...estado,
        id: accion.registro.id,
        baseGuardada: JSON.stringify(accion.registro.input),
        validacionIntentada: false,
        registros: remolquesUnicos([...estado.registros, accion.registro]),
        aviso: accion.aviso,
      };

    case "ACCION_INICIADA":
      return { ...estado, accion: accion.accion };

    case "ACCION_TERMINADA":
      return { ...estado, accion: null };

    case "VALIDACION_INTENTADA":
      return { ...estado, validacionIntentada: true, aviso: accion.aviso ?? estado.aviso };

    case "AVISO_MOSTRADO":
      return { ...estado, aviso: accion.texto };
  }
}
