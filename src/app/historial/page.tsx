"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { PlanteamientoRecord } from "@/lib/store/types";

export default function HistorialPage() {
  const [texto, setTexto] = useState("");
  const [items, setItems] = useState<PlanteamientoRecord[]>([]);
  const [estado, setEstado] = useState<"cargando" | "ok" | "error">("cargando");

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
    <main>
      <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-gold-2">Archivo técnico</p>
      <h1 className="mb-4 mt-0.5 text-[26px] font-extrabold tracking-[-0.045em] text-ink">Historial de planteamientos</h1>
      <input
        className="mb-3 min-h-10 w-full max-w-md rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-semibold shadow-sm outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/15"
        placeholder="Buscar por pedido o cliente…"
        value={texto} onChange={(e) => setTexto(e.target.value)}
      />
      <table className="w-full overflow-hidden rounded-2xl border border-line bg-surface text-sm shadow-[0_10px_28px_rgb(14_45_49/0.045)]">
        <thead>
          <tr className="border-b border-line bg-surface-3 text-left text-xs uppercase text-muted">
            <th className="p-2">Pedido</th><th className="p-2">Tipo</th>
            <th className="p-2">Cliente</th><th className="p-2">Modificado</th><th className="p-2" />
          </tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <tr key={r.id} className="border-b border-line transition-colors hover:bg-surface-2">
              <td className="p-2 font-medium">{r.numeroPedido || "—"}</td>
              <td className="p-2">{r.tipo === "lona" ? "Lona remolque" : "Baquetón"}</td>
              <td className="p-2">{r.cliente || "—"}</td>
              <td className="p-2 tabular-nums">{new Date(r.updatedAt).toLocaleString("es-ES")}</td>
              <td className="p-2">
                <Link className="rounded-lg border border-line-2 bg-white px-3 py-1.5 text-xs font-bold text-ink-2 shadow-sm transition hover:border-line-2"
                  href={`/planteamiento?desde=${r.id}`}>
                  Reutilizar
                </Link>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
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
    </main>
  );
}
