"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { PlanteamientoRecord } from "@/lib/store/types";

export default function HistorialPage() {
  const [texto, setTexto] = useState("");
  const [items, setItems] = useState<PlanteamientoRecord[]>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetch(`/api/planteamientos?texto=${encodeURIComponent(texto)}`)
        .then((r) => r.json()).then(setItems).catch(() => setItems([]));
    }, 200);
    return () => clearTimeout(t);
  }, [texto]);

  return (
    <main className="p-4">
      <h1 className="mb-4 text-lg font-semibold">Historial de planteamientos</h1>
      <input
        className="mb-3 w-full max-w-md rounded-md border border-neutral-300 px-3 py-2 text-sm"
        placeholder="Buscar por pedido o cliente…"
        value={texto} onChange={(e) => setTexto(e.target.value)}
      />
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-neutral-50 text-left text-xs uppercase text-neutral-500">
            <th className="p-2">Pedido</th><th className="p-2">Ver.</th><th className="p-2">Tipo</th>
            <th className="p-2">Cliente</th><th className="p-2">Modificado</th><th className="p-2" />
          </tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <tr key={r.id} className="border-b border-neutral-100">
              <td className="p-2 font-medium">{r.numeroPedido || "—"}</td>
              <td className="p-2">{r.version || "—"}</td>
              <td className="p-2">{r.tipo === "lona" ? "Lona remolque" : "Baquetón"}</td>
              <td className="p-2">{r.cliente || "—"}</td>
              <td className="p-2 tabular-nums">{new Date(r.updatedAt).toLocaleString("es-ES")}</td>
              <td className="p-2">
                <Link className="rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium"
                  href={`/planteamiento?desde=${r.id}`}>
                  Reutilizar
                </Link>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr><td colSpan={6} className="p-4 text-center text-neutral-400">Sin resultados</td></tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
