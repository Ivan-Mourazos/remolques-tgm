"use client";

import type { ReactNode } from "react";
import type { PlanteamientoRecord, TipoPlanteamiento } from "@/lib/store/types";
import { nombreElementoPedido } from "@/lib/pedidos/agrupar-pedido";

function IconoElemento({ tipo }: { tipo: TipoPlanteamiento }) {
  return tipo === "lona" ? (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8">
      <path d="M3.5 16.5V8.8c0-1 .8-1.8 1.8-1.8h11.4c1 0 1.8.8 1.8 1.8v7.7M2 16.5h20M6.5 16.5a2.2 2.2 0 1 0 4.4 0m4.1 0a2.2 2.2 0 1 0 4.4 0M18.5 10H21v6.5" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8">
      <path d="M4 7h16v8.5H4zM7 15.5a2 2 0 1 0 4 0m5 0a2 2 0 1 0 4 0M7 10h10M12 7v8.5" />
    </svg>
  );
}

export function PedidoActivo({
  numeroPedido,
  cliente,
  registros,
  cargando,
  idActivo,
  borrador,
  rpsPanel,
  accion,
  errorPedido,
  onNumeroPedidoChange,
  onClienteChange,
  onSeleccionar,
  onNuevo,
  onPreview,
  onGenerar,
}: {
  numeroPedido: string;
  cliente: string;
  registros: PlanteamientoRecord[];
  cargando: boolean;
  idActivo?: string;
  borrador?: { tipo: TipoPlanteamiento; version: string };
  rpsPanel: ReactNode;
  accion: "guardar" | "preview" | "pdf" | null;
  errorPedido?: string;
  onNumeroPedidoChange: (valor: string) => void;
  onClienteChange: (valor: string) => void;
  onSeleccionar: (registro: PlanteamientoRecord) => void;
  onNuevo: (tipo: TipoPlanteamiento) => void;
  onPreview: () => void;
  onGenerar: () => void;
}) {
  const hayPedido = Boolean(numeroPedido.trim());
  const total = registros.length + (borrador ? 1 : 0);
  const ocupado = accion !== null;

  return (
    <section className="relative overflow-visible rounded-[22px] border border-deep/20 bg-deep text-white shadow-[0_18px_48px_rgb(7_35_40/0.16)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[22px]">
        <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full border-[36px] border-white/[0.025]" />
        <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-gold via-gold/35 to-transparent" />
      </div>

      <div className="relative grid gap-3 p-3 lg:grid-cols-[minmax(240px,0.8fr)_minmax(280px,1.2fr)_auto] lg:items-end">
        <label className="block min-w-0">
          <span className="mb-1 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-gold">
            <span className="inline-block h-2 w-2 rounded-sm bg-gold shadow-[0_0_0_4px_rgb(211_160_36/0.12)]" />
            Pedido activo
          </span>
          <input
            name="numeroPedido"
            data-campo="numeroPedido"
            autoComplete="off"
            aria-invalid={Boolean(errorPedido)}
            aria-describedby={errorPedido ? "error-numero-pedido" : undefined}
            value={numeroPedido}
            onChange={(evento) => onNumeroPedidoChange(evento.target.value)}
            className="h-10 w-full rounded-xl border border-white/15 bg-white/[0.075] px-3 font-mono text-[18px] font-extrabold tracking-[-0.04em] text-white outline-none transition focus:border-gold/70 focus:bg-white/[0.11] focus:ring-4 focus:ring-gold/15"
          />
          {errorPedido && <span id="error-numero-pedido" className="mt-1 block text-[10px] font-bold text-red-200">{errorPedido}</span>}
        </label>

        <label className="block min-w-0">
          <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/50">Cliente del pedido</span>
          <input
            name="clientePedido"
            autoComplete="off"
            value={cliente}
            disabled={!hayPedido || cargando}
            onChange={(evento) => onClienteChange(evento.target.value)}
            className="h-10 w-full rounded-xl border border-white/12 bg-white/[0.065] px-3 text-sm font-bold text-white outline-none transition focus:border-gold/60 focus:bg-white/[0.1] focus:ring-4 focus:ring-gold/15 disabled:cursor-not-allowed disabled:opacity-45"
          />
        </label>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <button
            type="button"
            disabled={!hayPedido || cargando}
            onClick={() => onNuevo("lona")}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-gold px-3.5 text-[12px] font-extrabold text-deep shadow-[0_7px_20px_rgb(0_0_0/0.18)] transition hover:-translate-y-px hover:bg-[#e0ae35] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/30 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <span className="text-lg leading-none">+</span> Remolque
          </button>
          <button
            type="button"
            disabled={!hayPedido}
            onClick={() => onNuevo("baqueton")}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/20 bg-white/[0.08] px-3.5 text-[12px] font-extrabold text-white transition hover:-translate-y-px hover:border-gold/55 hover:bg-white/[0.13] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/20 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <span className="text-lg leading-none">+</span> Baquetón
          </button>
        </div>
      </div>

      <div className="relative border-t border-white/10 px-3 py-2">
        {rpsPanel}
      </div>

      <div className="relative border-t border-white/10 bg-black/10 px-3 py-2.5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/50">Contenido del pedido</p>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-extrabold tabular-nums text-white/75">
              {cargando ? "Cargando…" : `${total} ${total === 1 ? "elemento" : "elementos"}`}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={onPreview}
              disabled={!hayPedido || total === 0 || ocupado}
              className="rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[11px] font-bold text-white/85 transition hover:border-gold/45 hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/15 disabled:cursor-not-allowed disabled:opacity-35"
            >
              {accion === "preview" ? "Preparando…" : "Vista previa del pedido"}
            </button>
            <button
              type="button"
              onClick={onGenerar}
              disabled={!hayPedido || total === 0 || ocupado}
              className="rounded-lg bg-white px-3 py-1.5 text-[11px] font-extrabold text-deep transition hover:-translate-y-px hover:bg-gold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/20 disabled:cursor-not-allowed disabled:opacity-35"
            >
              {accion === "pdf" ? "Archivando…" : "Generar PDF completo"}
            </button>
          </div>
        </div>

        {total > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {registros.map((registro) => {
              const activo = registro.id === idActivo;
              return (
                <button
                  type="button"
                  key={registro.id}
                  aria-pressed={activo}
                  onClick={() => onSeleccionar(registro)}
                  className={`group flex min-w-[190px] items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/20 ${activo ? "border-gold bg-gold text-deep shadow-[0_6px_20px_rgb(0_0_0/0.18)]" : "border-white/12 bg-white/[0.055] text-white hover:border-white/28 hover:bg-white/[0.1]"}`}
                >
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${activo ? "bg-deep/12" : "bg-white/8 text-gold"}`}>
                    <IconoElemento tipo={registro.tipo} />
                  </span>
                  <span className="min-w-0">
                    <strong className="block truncate text-[12px] font-extrabold">{nombreElementoPedido(registro.version, registro.tipo)}</strong>
                    <span className={`mt-0.5 block truncate text-[9px] font-bold uppercase tracking-wide ${activo ? "text-deep/65" : "text-white/45"}`}>
                      {registro.input.cabecera.ordenFabricacion ? `OF ${registro.input.cabecera.ordenFabricacion}` : "Guardado"}
                    </span>
                  </span>
                </button>
              );
            })}
            {borrador && (
              <div className="flex min-w-[190px] items-center gap-2.5 rounded-xl border border-dashed border-gold/70 bg-gold/12 px-3 py-2 text-left text-white">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gold/15 text-gold"><IconoElemento tipo={borrador.tipo} /></span>
                <span className="min-w-0">
                  <strong className="block truncate text-[12px] font-extrabold">{nombreElementoPedido(borrador.version, borrador.tipo)}</strong>
                  <span className="mt-0.5 block text-[9px] font-extrabold uppercase tracking-wide text-gold">Sin guardar</span>
                </span>
              </div>
            )}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-white/15 px-3 py-2.5 text-[11px] font-semibold text-white/48">
            {hayPedido ? "Este pedido todavía no tiene planteamientos. Añade un remolque o un baquetón." : "Introduce el número de pedido para empezar."}
          </p>
        )}
      </div>
    </section>
  );
}
