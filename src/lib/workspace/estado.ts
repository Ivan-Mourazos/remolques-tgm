import type { LonaInput } from "@/lib/calc/lona";
import type { BaquetonInput } from "@/lib/calc/baqueton";
import type { PlanteamientoRecord, TipoPlanteamiento } from "@/lib/store/types";
import type { PedidoRps } from "@/lib/rps/types";
import type { EstadoConsultaRps } from "@/lib/workspace/selectores";
import {
  fusionarLineas, lineasDesdeRegistros, type LineaPedido,
} from "@/lib/workspace/lineas";
import { normalizarNumeroPedidoRps } from "@/lib/rps/numero-pedido";

export interface EstadoRpsWorkspace {
  estado: EstadoConsultaRps;
  /** Número por el que se lanzó la última consulta, ya normalizado. */
  numeroConsultado: string;
  pedido: PedidoRps | null;
  error: string | null;
  reintento: number;
  selectorAbierto: boolean;
}

export interface EstadoWorkspace {
  // El pedido y sus líneas
  numeroPedido: string;
  cliente: string;
  lineas: LineaPedido[];
  /** Versión de la línea abierta; null si no hay ninguna. */
  versionActiva: string | null;
  cargandoPedido: boolean;

  // Edición de la línea abierta
  validacionIntentada: boolean;
  /** Campos que el usuario ya visitó y abandonó: enseñan su error. */
  camposTocados: string[];

  // Importación RPS
  rps: EstadoRpsWorkspace;

  // Transversal
  accion: "preview" | "completar" | null;
}

export interface EntradaInicial {
  id?: string;
  tipo: TipoPlanteamiento;
  input: LonaInput | BaquetonInput;
}

export type AccionWorkspace =
  | { tipo: "PEDIDO_CAMBIADO"; valor: string }
  | { tipo: "CLIENTE_CAMBIADO"; valor: string }
  | { tipo: "BORRADORES_RECUPERADOS"; lineas: LineaPedido[] }
  | { tipo: "REGISTROS_CARGADOS"; registros: PlanteamientoRecord[] }
  | { tipo: "REGISTROS_FALLARON" }
  | { tipo: "LINEA_ANADIDA"; linea: LineaPedido }
  | { tipo: "LINEA_SELECCIONADA"; version: string }
  | { tipo: "LINEA_ELIMINADA"; version: string }
  | { tipo: "INPUT_CAMBIADO"; input: LonaInput | BaquetonInput }
  | { tipo: "SNAPSHOT_CAPTURADO"; version: string; svg: string | null }
  | { tipo: "PEDIDO_COMPLETADO"; registros: PlanteamientoRecord[] }
  | { tipo: "RPS_SELECTOR_ABIERTO" }
  | { tipo: "RPS_REINTENTADO" }
  | { tipo: "RPS_CONSULTA_INICIADA"; numero: string }
  | { tipo: "RPS_ENCONTRADO"; pedido: PedidoRps }
  | { tipo: "RPS_NO_ENCONTRADO" }
  | { tipo: "RPS_ERROR"; mensaje: string }
  | { tipo: "ACCION_INICIADA"; accion: "preview" | "completar" }
  | { tipo: "ACCION_TERMINADA" }
  | { tipo: "VALIDACION_INTENTADA" }
  | { tipo: "CAMPO_TOCADO"; campo: string };

/** Al abrir otra línea, lo que se enseñaba en rojo de la anterior no vale. */
const SIN_VALIDAR = { validacionIntentada: false, camposTocados: [] as string[] };

const conNumeroPedido = (linea: LineaPedido, numeroPedido: string): LineaPedido => ({
  ...linea,
  input: { ...linea.input, cabecera: { ...linea.input.cabecera, numeroPedido } },
});

const conCliente = (linea: LineaPedido, cliente: string): LineaPedido => ({
  ...linea,
  input: { ...linea.input, cabecera: { ...linea.input.cabecera, cliente } },
});

/**
 * Ya no recibe las entradas vacías: el estado arranca sin ninguna línea, y las
 * plantillas solo hacen falta al añadir una. Así el reducer y su estado inicial
 * siguen siendo puros y deterministas sin arrastrar la fecha del día que lee
 * `emptyLona()`. Quien llamaba con el segundo argumento (`useWorkspace`) deja de
 * pasarlo.
 */
export function estadoInicial(inicial?: EntradaInicial): EstadoWorkspace {
  const lineas: LineaPedido[] = inicial
    ? [{
        version: inicial.input.cabecera.version,
        tipo: inicial.tipo,
        input: inicial.input,
        id: inicial.id,
        snapshotSvg: null,
      }]
    : [];
  return {
    numeroPedido: inicial?.input.cabecera.numeroPedido ?? "",
    cliente: inicial?.input.cabecera.cliente ?? "",
    lineas,
    versionActiva: lineas[0]?.version ?? null,
    cargandoPedido: Boolean(inicial?.input.cabecera.numeroPedido),
    validacionIntentada: false,
    camposTocados: [],
    rps: {
      estado: "idle", numeroConsultado: "", pedido: null, error: null,
      reintento: 0, selectorAbierto: true,
    },
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
      if (!cambiaPedido) {
        return {
          ...estado,
          numeroPedido: accion.valor,
          lineas: estado.lineas.map((linea) => conNumeroPedido(linea, accion.valor)),
        };
      }
      // Otro pedido es otro trabajo: sus líneas llegan de sus borradores y de
      // sus registros, no se arrastran las del anterior.
      return {
        ...estado,
        numeroPedido: accion.valor,
        cliente: "",
        lineas: [],
        versionActiva: null,
        cargandoPedido: Boolean(normalizarNumeroPedidoRps(accion.valor)),
        ...SIN_VALIDAR,
        rps: { ...estado.rps, selectorAbierto: true },
      };
    }

    case "CLIENTE_CAMBIADO":
      return {
        ...estado,
        cliente: accion.valor,
        lineas: estado.lineas.map((linea) => conCliente(linea, accion.valor)),
      };

    case "BORRADORES_RECUPERADOS": {
      // Lo que ya se esté editando manda: los borradores llegan de un efecto y
      // pueden aterrizar después de que el usuario haya empezado a trabajar.
      const lineas = fusionarLineas(accion.lineas, estado.lineas);
      return {
        ...estado,
        lineas,
        versionActiva: estado.versionActiva ?? lineas[0]?.version ?? null,
      };
    }

    case "REGISTROS_CARGADOS": {
      const lineas = fusionarLineas(lineasDesdeRegistros(accion.registros), estado.lineas);
      const guardado = accion.registros.find((registro) => registro.cliente.trim())?.cliente;
      const cliente = estado.cliente.trim() ? estado.cliente : (guardado ?? "");
      return {
        ...estado,
        lineas: cliente === estado.cliente
          ? lineas
          : lineas.map((linea) => (linea.input.cabecera.cliente.trim()
            ? linea
            : conCliente(linea, cliente))),
        cliente,
        versionActiva: estado.versionActiva ?? lineas[0]?.version ?? null,
        cargandoPedido: false,
      };
    }

    case "REGISTROS_FALLARON":
      return { ...estado, cargandoPedido: false };

    case "LINEA_ANADIDA": {
      const existe = estado.lineas.some((linea) => linea.version === accion.linea.version);
      return {
        ...estado,
        lineas: existe
          ? estado.lineas.map((linea) => (linea.version === accion.linea.version ? accion.linea : linea))
          : [...estado.lineas, accion.linea],
        versionActiva: accion.linea.version,
        ...SIN_VALIDAR,
        rps: { ...estado.rps, selectorAbierto: !accion.linea.origenRps },
      };
    }

    case "LINEA_SELECCIONADA": {
      if (accion.version === estado.versionActiva) return estado;
      if (!estado.lineas.some((linea) => linea.version === accion.version)) return estado;
      return {
        ...estado,
        versionActiva: accion.version,
        ...SIN_VALIDAR,
        rps: { ...estado.rps, selectorAbierto: false },
      };
    }

    case "LINEA_ELIMINADA": {
      const indice = estado.lineas.findIndex((linea) => linea.version === accion.version);
      if (indice < 0) return estado;
      const lineas = estado.lineas.filter((linea) => linea.version !== accion.version);
      const siguienteActiva = estado.versionActiva === accion.version
        ? (lineas[Math.max(indice - 1, 0)]?.version ?? null)
        : estado.versionActiva;
      return { ...estado, lineas, versionActiva: siguienteActiva, ...SIN_VALIDAR };
    }

    case "INPUT_CAMBIADO": {
      if (!estado.versionActiva) return estado;
      return {
        ...estado,
        lineas: estado.lineas.map((linea) => (linea.version === estado.versionActiva
          ? { ...linea, input: accion.input }
          : linea)),
      };
    }

    case "SNAPSHOT_CAPTURADO":
      return {
        ...estado,
        lineas: estado.lineas.map((linea) => (linea.version === accion.version
          ? { ...linea, snapshotSvg: accion.svg }
          : linea)),
      };

    case "PEDIDO_COMPLETADO": {
      const idPorVersion = new Map(accion.registros.map((r) => [r.version, r.id]));
      return {
        ...estado,
        lineas: estado.lineas.map((linea) => ({
          ...linea,
          id: idPorVersion.get(linea.version) ?? linea.id,
        })),
        ...SIN_VALIDAR,
      };
    }

    case "RPS_SELECTOR_ABIERTO":
      return { ...estado, rps: { ...estado.rps, selectorAbierto: true } };

    case "RPS_REINTENTADO":
      return { ...estado, rps: { ...estado.rps, reintento: estado.rps.reintento + 1 } };

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

    case "ACCION_INICIADA":
      return { ...estado, accion: accion.accion };

    case "ACCION_TERMINADA":
      return { ...estado, accion: null };

    case "VALIDACION_INTENTADA":
      return { ...estado, validacionIntentada: true };

    case "CAMPO_TOCADO":
      // Devolver el mismo estado cuando el campo ya estaba evita un render por
      // cada salida de un campo que el usuario recorre varias veces.
      return estado.camposTocados.includes(accion.campo)
        ? estado
        : { ...estado, camposTocados: [...estado.camposTocados, accion.campo] };
  }
}
