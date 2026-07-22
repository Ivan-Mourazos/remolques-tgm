"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { PlanteamientoRecord } from "@/lib/store/types";
import { agruparPorPedido, nombreRemolque } from "@/lib/pedidos/agrupar-pedido";
import { planteamientoGenerable } from "@/lib/pedidos/validar-planteamiento";

export default function HistorialPage() {
  const [texto, setTexto] = useState("");
  const [items, setItems] = useState<PlanteamientoRecord[]>([]);
  const [estado, setEstado] = useState<"cargando" | "ok" | "error">("cargando");
  const pedidos = useMemo(() => agruparPorPedido(items), [items]);

  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setEstado("cargando");
      fetch(`/api/planteamientos?texto=${encodeURIComponent(texto)}`, { signal: ctrl.signal })
        .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
        .then((datos) => { setItems(datos); setEstado("ok"); })
        .catch((e) => {
          if ((e as Error).name === "AbortError") return;
          setItems([]);
          setEstado("error");
        });
    }, 200);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [texto]);

  return (
    <div>
      <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-gold-2">Archivo técnico</p>
      <h1 className="mb-4 mt-0.5 text-[26px] font-extrabold tracking-[-0.045em] text-ink">Historial de planteamientos</h1>
      <label htmlFor="buscar-historial" className="sr-only">Buscar por pedido o cliente</label>
      <input
        id="buscar-historial"
        name="buscarHistorial"
        autoComplete="off"
        className="mb-3 min-h-10 w-full max-w-md rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-semibold shadow-sm outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/15"
        placeholder="Buscar por pedido o cliente…"
        value={texto} onChange={(e) => setTexto(e.target.value)}
      />
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-[0_10px_28px_rgb(14_45_49/0.045)]">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-line bg-surface-3 text-left text-xs uppercase text-muted">
            <th className="p-2">Pedido / remolque</th><th className="p-2">Tipo</th>
            <th className="p-2">Cliente</th><th className="p-2">Modificado</th><th className="p-2" />
          </tr>
        </thead>
        <tbody>
          {pedidos.map((pedido) => (
            <FragmentoPedido key={pedido.clave} pedido={pedido} />
          ))}
          {pedidos.length === 0 && (
            <tr>
              <td colSpan={5} className="p-6 text-center text-muted-2">
                {estado === "cargando" ? "Cargando…"
                  : estado === "error" ? "No se pudo cargar el historial"
                    : "Sin resultados"}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function FragmentoPedido({ pedido }: { pedido: ReturnType<typeof agruparPorPedido>[number] }) {
  return (
    <>
      <tr className="border-b border-gold/20 bg-[linear-gradient(90deg,rgb(220_166_25/0.12),transparent_72%)]">
        <td className="px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="font-mono text-[13px] font-extrabold text-ink">{pedido.numeroPedido}</strong>
            <span className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-gold-2">
              {pedido.remolques.length} {pedido.remolques.length === 1 ? "remolque" : "remolques"}
            </span>
          </div>
        </td>
        <td className="px-2 py-2 text-[10px] font-extrabold uppercase tracking-wide text-muted">Pedido agrupado</td>
        <td className="px-2 py-2 font-bold text-ink-2">{pedido.cliente || "—"}</td>
        <td className="px-2 py-2 text-[11px] tabular-nums text-muted">{new Date(pedido.updatedAt).toLocaleString("es-ES")}</td>
        <td />
      </tr>
      {pedido.remolques.map((registro) => {
        const generable = planteamientoGenerable(registro.input);
        return (
          <tr key={registro.id} className="border-b border-line bg-surface transition-colors last:border-b-2 hover:bg-surface-2/70">
            <td className="py-2 pl-6 pr-2">
              <div className="flex items-center gap-2">
                <span className="h-5 w-0.5 rounded-full bg-gold/55" />
                <span className="font-bold text-ink-2">{nombreRemolque(registro.version)}</span>
                {!generable && <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-red-700">Incompleto</span>}
              </div>
            </td>
            <td className="px-2 py-2">
              <p className="font-semibold text-ink-2">{registro.tipo === "lona" ? "Lona remolque" : "Baquetón"}</p>
              <p className="text-[10px] font-semibold text-muted">Ollaos: {registro.input.modoOllaos === "REPARTIDOS" ? "repartidos" : "a medida"}</p>
            </td>
            <td className="px-2 py-2 text-[11px] text-muted">OF {registro.input.cabecera.ordenFabricacion || "—"}</td>
            <td className="px-2 py-2 text-[11px] tabular-nums text-muted">{new Date(registro.updatedAt).toLocaleString("es-ES")}</td>
            <td className="px-2 py-2 text-right">
              <Link className="inline-flex rounded-lg border border-line-2 bg-white px-3 py-1.5 text-xs font-bold text-ink-2 shadow-sm transition hover:-translate-y-px hover:border-gold/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/20"
                href={`/planteamiento?desde=${registro.id}`}>
                Abrir
              </Link>
            </td>
          </tr>
        );
      })}
    </>
  );
}
