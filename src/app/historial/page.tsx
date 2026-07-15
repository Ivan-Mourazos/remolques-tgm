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
    <main>
      <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#a7760b]">Archivo técnico</p>
      <h1 className="mb-4 mt-0.5 text-[26px] font-extrabold tracking-[-0.045em] text-[#102a2f]">Historial de planteamientos</h1>
      <input
        className="mb-3 min-h-10 w-full max-w-md rounded-xl border border-[#d0ddd8] bg-[#fbfcfb] px-3.5 py-2 text-sm font-semibold shadow-sm outline-none transition focus:border-[#c59420] focus:ring-4 focus:ring-[#d3a024]/15"
        placeholder="Buscar por pedido o cliente…"
        value={texto} onChange={(e) => setTexto(e.target.value)}
      />
      <table className="w-full overflow-hidden rounded-2xl border border-[#d4dfdb] bg-[#fbfcfb] text-sm shadow-[0_10px_28px_rgb(14_45_49/0.045)]">
        <thead>
          <tr className="border-b border-[#d4dfdb] bg-[#e5ece9] text-left text-xs uppercase text-[#587278]">
            <th className="p-2">Pedido</th><th className="p-2">Tipo</th>
            <th className="p-2">Cliente</th><th className="p-2">Modificado</th><th className="p-2" />
          </tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <tr key={r.id} className="border-b border-[#e1e8e5] transition-colors hover:bg-[#f3f7f5]">
              <td className="p-2 font-medium">{r.numeroPedido || "—"}</td>
              <td className="p-2">{r.tipo === "lona" ? "Lona remolque" : "Baquetón"}</td>
              <td className="p-2">{r.cliente || "—"}</td>
              <td className="p-2 tabular-nums">{new Date(r.updatedAt).toLocaleString("es-ES")}</td>
              <td className="p-2">
                <Link className="rounded-lg border border-[#c7d5d0] bg-white px-3 py-1.5 text-xs font-bold text-[#31545a] shadow-sm transition hover:border-[#9fb8b0]"
                  href={`/planteamiento?desde=${r.id}`}>
                  Reutilizar
                </Link>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr><td colSpan={5} className="p-6 text-center text-[#799094]">Sin resultados</td></tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
