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
