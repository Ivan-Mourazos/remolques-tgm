"use client";

import type { LineaPedidoRps, OrigenRps, PedidoRps } from "@/lib/rps/types";

type Estado = "idle" | "buscando" | "encontrado" | "no-encontrado" | "error";

const medidas = (linea: LineaPedidoRps) => {
  if (linea.tipoTrabajo === "baqueton") {
    return [linea.largo, linea.ancho, linea.baqueton].map((v) => v ?? "—").join(" × ");
  }
  const alto = linea.alto ?? (
    linea.altoDelante !== null || linea.altoAtras !== null
      ? `${linea.altoDelante ?? "—"}/${linea.altoAtras ?? "—"}`
      : "—"
  );
  return [linea.largo, linea.ancho, alto].map((v) => v ?? "—").join(" × ");
};

export function ImportadorRps({
  estado,
  pedido,
  error,
  origen,
  abierto,
  materialAplicado,
  onAplicar,
  onAbrir,
  onReintentar,
}: {
  estado: Estado;
  pedido: PedidoRps | null;
  error: string | null;
  origen: OrigenRps | null;
  abierto: boolean;
  materialAplicado: boolean;
  onAplicar: (linea: LineaPedidoRps) => void;
  onAbrir: () => void;
  onReintentar: () => void;
}) {
  if (estado === "idle") {
    return (
      <p className="rounded-xl border border-dashed border-line bg-surface-2/55 px-3 py-2 text-[11px] font-semibold text-muted">
        Escribe el pedido completo y RPS cargará cliente, OF, cantidad y medidas.
      </p>
    );
  }

  if (estado === "buscando") {
    return (
      <div role="status" className="flex items-center gap-2 rounded-xl border border-line bg-surface-2/70 px-3 py-2 text-xs font-bold text-muted">
        <span className="h-2 w-2 animate-pulse rounded-full bg-gold" />
        Consultando el pedido en RPS…
      </div>
    );
  }

  if (estado === "error" || estado === "no-encontrado") {
    return (
      <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gold/30 bg-gold/8 px-3 py-2 text-xs text-ink-2">
        <span>{estado === "no-encontrado" ? "RPS no encontró este pedido; puedes seguir manualmente." : error}</span>
        <button type="button" onClick={onReintentar} className="rounded-lg border border-gold/35 bg-surface px-2.5 py-1 font-extrabold text-gold-2 hover:border-gold">
          Reintentar
        </button>
      </div>
    );
  }

  if (!pedido) return null;

  if (origen && !abierto) {
    const linea = pedido.lineas.find((candidata) => candidata.idLinea === origen.idLinea);
    return (
      <section className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gold/35 bg-gold/8 px-3 py-2 shadow-[inset_3px_0_0_var(--color-gold)]">
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-gold-2">RPS · Línea {origen.numeroLinea} aplicada</p>
          <p className="mt-0.5 truncate text-[11px] font-semibold text-ink-2">
            {linea?.ordenFabricacion ? `OF ${linea.ordenFabricacion} · ` : ""}{linea ? `${medidas(linea)} cm · ${linea.cantidad} ud.` : pedido.numero}
          </p>
        </div>
        <button
          type="button"
          onClick={onAbrir}
          className="shrink-0 rounded-lg border border-gold/40 bg-surface px-2.5 py-1.5 text-[11px] font-extrabold text-gold-2 transition hover:border-gold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/20"
        >
          Cambiar línea
        </button>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface-2/70 shadow-[inset_3px_0_0_var(--color-gold)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-gold-2">Pedido encontrado en RPS</p>
          <p className="mt-0.5 text-xs font-semibold text-ink">
            {pedido.cliente.alias || pedido.cliente.nombre}
            <span className="ml-1.5 font-mono text-[10px] text-muted">{pedido.cliente.codigo}</span>
          </p>
        </div>
        <span className="rounded-lg border border-line bg-surface px-2 py-1 font-mono text-[11px] font-extrabold text-ink">{pedido.numero}</span>
      </div>

      <div className="space-y-2 p-2.5">
        {pedido.lineas.length === 0 ? (
          <p className="px-1 py-2 text-xs font-semibold text-muted">El pedido existe, pero no contiene líneas de lona de remolque.</p>
        ) : pedido.lineas.map((linea) => {
          const seleccionada = origen?.idLinea === linea.idLinea;
          return (
            <article key={linea.idLinea} className={`rounded-xl border p-2.5 transition ${seleccionada ? "border-gold/50 bg-gold/8" : "border-line bg-surface/85"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <strong className="text-xs text-ink">Línea {linea.numeroLinea} · {linea.tipoTrabajo === "lona" ? "Lona" : "Baquetón"}</strong>
                    {linea.requiereRevision && <span className="rounded bg-gold/15 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-gold-2">Revisar</span>}
                    {linea.ordenFabricacion && <span className="rounded bg-deep/7 px-1.5 py-0.5 font-mono text-[9px] font-bold text-muted">OF {linea.ordenFabricacion}</span>}
                  </div>
                  <p className="mt-1 font-mono text-[12px] font-extrabold text-deep">{medidas(linea)} cm · {linea.cantidad} ud.</p>
                  <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-muted" title={linea.detalle}>{linea.detalle || linea.descripcion}</p>
                </div>
                <button type="button" onClick={() => onAplicar(linea)}
                  className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-extrabold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/20 ${seleccionada ? "bg-deep text-white" : "border border-line bg-surface text-ink hover:border-gold/50"}`}>
                  {seleccionada ? "Volver a aplicar" : "Usar línea"}
                </button>
              </div>
              {seleccionada && (
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-gold/20 pt-2 text-[10px] font-semibold text-muted">
                  <span className="text-deep">✓ Datos copiados y editables</span>
                  {linea.materialRps.texto && <span>RPS: {linea.materialRps.texto}{materialAplicado ? " · bobina aplicada" : " · elige bobina"}</span>}
                  <span>
                    Rotulación RPS: {linea.tipoRotulacion ?? (linea.rotulacion === null ? "no indicada · revisar" : linea.rotulacion ? "sí" : "no")}
                    {linea.textoRotulacion ? ` · «${linea.textoRotulacion}»` : ""}
                  </span>
                  {(linea.recogidaDelante || linea.recogidaAtras) && <span>Revisar el tipo de recogida</span>}
                  {linea.tipoTrabajo === "lona" && <span>Revisar perfil y contorno</span>}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
