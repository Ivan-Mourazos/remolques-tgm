import { normalizarNumeroPedido } from "@/lib/pedidos/numero-pedido";

export type EstadoRevision = "EN_REVISION" | "APROBADO" | "NO_APROBADO";

export interface Decision { estado: EstadoRevision; por: string; en: string }
export interface DecisionFirme { estado: "APROBADO" | "NO_APROBADO"; por: string; en: string }
export interface Produccion { por: string; en: string; nombrePdf: string; rutas: string[] }

export interface EstadoPedido {
  /** Clave normalizada: AR.26.0123 y AR260123 son el mismo pedido. */
  pedido: string;
  /** Tal y como se escribió, para enseñarlo. */
  numeroPedido: string;
  revision: Decision;
  /**
   * La última vez que alguien se pronunció. Sobrevive a volver a mandarlo a
   * revisión, y es lo único que no se deduce del estado actual: cuando un
   * pedido vuelve a EN_REVISION, el estado deja de contar que ya se miró una
   * vez, y sin esto la app volvería a cerrarle la puerta de producción.
   */
  ultimaDecision: DecisionFirme | null;
  produccion: Produccion | null;
  updatedAt: string;
}

export type Transicion =
  | { ok: true; estado: EstadoPedido }
  | { ok: false; motivo: string };

/**
 * Guardar deja el pedido esperando a un compañero, venga de donde venga: de
 * cero, de un rechazo o de estar ya producido. Lo producido no se borra —el
 * PDF sigue en la carpeta y hay que saber quién lo puso ahí— y `ultimaDecision`
 * tampoco, que es lo que mantiene abierta la puerta de producción.
 */
export function guardadoParaRevision(
  previo: EstadoPedido | null,
  datos: { numeroPedido: string; por: string; en: string },
): EstadoPedido {
  return {
    pedido: normalizarNumeroPedido(datos.numeroPedido),
    numeroPedido: datos.numeroPedido,
    revision: { estado: "EN_REVISION", por: datos.por, en: datos.en },
    ultimaDecision: previo?.ultimaDecision ?? null,
    produccion: previo?.produccion ?? null,
    updatedAt: datos.en,
  };
}

/** Aprobar o no aprobar. Solo desde EN_REVISION: pisar la decisión de otro no. */
export function decidido(previo: EstadoPedido | null, decision: DecisionFirme): Transicion {
  if (!previo) {
    return { ok: false, motivo: "Este pedido no está en revisión." };
  }
  if (previo.revision.estado !== "EN_REVISION") {
    return {
      ok: false,
      motivo: `Este pedido ya lo revisó ${previo.revision.por}.`,
    };
  }
  return {
    ok: true,
    estado: {
      ...previo,
      revision: decision,
      ultimaDecision: decision,
      updatedAt: decision.en,
    },
  };
}

/**
 * La puerta es la primera revisión, no la aprobación: en cuanto un compañero se
 * pronuncia una vez, producir vuelve a ser decisión de quien lleva el pedido.
 * Los pedidos sin registro son de antes de este bloque: su PDF ya está
 * archivado, así que se dan por revisados.
 */
export function producido(
  previo: EstadoPedido | null,
  datos: { numeroPedido: string; por: string; en: string; nombrePdf: string; rutas: string[] },
): Transicion {
  if (previo && previo.revision.estado === "EN_REVISION" && previo.ultimaDecision === null) {
    return {
      ok: false,
      motivo: "Este pedido todavía está pendiente de su primera revisión.",
    };
  }
  const produccion: Produccion = {
    por: datos.por, en: datos.en, nombrePdf: datos.nombrePdf, rutas: datos.rutas,
  };
  return {
    ok: true,
    estado: previo
      ? { ...previo, produccion, updatedAt: datos.en }
      : {
          pedido: normalizarNumeroPedido(datos.numeroPedido),
          numeroPedido: datos.numeroPedido,
          // Un histórico que se vuelve a producir no inventa quién lo revisó:
          // queda a nombre de quien lo produce, que es lo único que se sabe.
          revision: { estado: "APROBADO", por: datos.por, en: datos.en },
          ultimaDecision: { estado: "APROBADO", por: datos.por, en: datos.en },
          produccion,
          updatedAt: datos.en,
        },
  };
}

export type Situacion =
  | "HISTORICO"
  | "EN_REVISION"
  | "APROBADO"
  | "APROBADO_CON_CAMBIOS"
  | "NO_APROBADO"
  | "EN_PRODUCCION";

export interface EstadoVisible {
  situacion: Situacion;
  /** Lo que se lee en la ficha y en la bandeja. */
  etiqueta: string;
  puedeProducir: boolean;
  /** Por qué no; cadena vacía cuando sí se puede. */
  impedimento: string;
  /** Alguien tocó las líneas después de la última decisión. Lo usa la bandeja
   *  para no seguir enseñando como pendiente un rechazo que ya se está
   *  arreglando. */
  conCambiosPosteriores: boolean;
}

const PENDIENTE_DE_LA_PRIMERA =
  "Este pedido todavía está pendiente de su primera revisión.";

/**
 * El estado que se enseña no es el guardado a secas: mete lo de «aprobado con
 * cambios posteriores» y lo de «histórico» comparando fechas, y devuelve además
 * si se puede producir y por qué no, para que el botón y su explicación salgan
 * del mismo sitio y no puedan contradecirse.
 */
export function estadoVisiblePedido(
  estado: EstadoPedido | null,
  registros: Array<{ updatedAt: string }>,
): EstadoVisible {
  // Sin registro es un pedido anterior a este bloque: su PDF ya está archivado
  // y no se inventa quién lo hizo. Se da por revisado.
  if (!estado) {
    return {
      situacion: "HISTORICO",
      etiqueta: "Histórico · anterior a la revisión",
      puedeProducir: true,
      impedimento: "",
      conCambiosPosteriores: false,
    };
  }

  const ultimoCambio = registros.reduce(
    (maximo, registro) => (registro.updatedAt > maximo ? registro.updatedAt : maximo),
    "",
  );
  const nuncaRevisado =
    estado.revision.estado === "EN_REVISION" && estado.ultimaDecision === null;
  const puedeProducir = !nuncaRevisado;
  const impedimento = nuncaRevisado ? PENDIENTE_DE_LA_PRIMERA : "";
  // Se compara con la última vez que alguien se pronunció, no con la revisión
  // actual: un pedido devuelto a revisión tiene la fecha recién puesta y
  // parecería intacto siempre.
  const conCambiosPosteriores = estado.ultimaDecision !== null
    && ultimoCambio > estado.ultimaDecision.en;

  if (estado.produccion && estado.revision.estado !== "EN_REVISION") {
    return {
      situacion: "EN_PRODUCCION",
      etiqueta: `En producción · ${estado.produccion.por}`,
      puedeProducir,
      impedimento,
      conCambiosPosteriores,
    };
  }
  if (estado.revision.estado === "APROBADO") {
    return {
      situacion: conCambiosPosteriores ? "APROBADO_CON_CAMBIOS" : "APROBADO",
      etiqueta: conCambiosPosteriores
        ? `Aprobado por ${estado.revision.por}, con cambios posteriores`
        : `Aprobado por ${estado.revision.por}`,
      puedeProducir,
      impedimento,
      conCambiosPosteriores,
    };
  }
  if (estado.revision.estado === "NO_APROBADO") {
    return {
      situacion: "NO_APROBADO",
      etiqueta: `No aprobado por ${estado.revision.por}`,
      puedeProducir,
      impedimento,
      conCambiosPosteriores,
    };
  }
  return {
    situacion: "EN_REVISION",
    etiqueta: nuncaRevisado
      ? `En revisión · guardado por ${estado.revision.por}`
      : `En revisión otra vez · guardado por ${estado.revision.por}`,
    puedeProducir,
    impedimento,
    conCambiosPosteriores,
  };
}
