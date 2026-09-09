"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { EntradaBandeja } from "@/lib/revision/bandeja";
import { Aviso } from "@/components/feedback/Aviso";

const fecha = (iso: string) => (iso ? new Date(iso).toLocaleString("es-ES") : "—");

export default function RevisionPage() {
  const [pedidos, setPedidos] = useState<EntradaBandeja[]>([]);
  const [estado, setEstado] = useState<"cargando" | "ok" | "error">("cargando");

  useEffect(() => {
    fetch("/api/pedidos")
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((datos) => { setPedidos(datos.pedidos); setEstado("ok"); })
      .catch(() => setEstado("error"));
  }, []);

  return (
    <div className="max-w-5xl">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-gold-2">Oficina técnica</p>
      <h1 className="mb-1 mt-0.5 text-[26px] font-extrabold tracking-[-0.045em] text-ink">Pedidos por revisar</h1>
      <p className="mb-4 text-sm text-muted-2">
        Comprueba los datos y guarda el planteamiento con el nombre del revisor. Las aprobaciones y devoluciones se gestionan en Coordina.
      </p>

      {estado === "error" && <Aviso severidad="error" texto="No se pudo cargar la bandeja." />}
      {estado === "cargando" && <p className="text-sm text-muted-2">Cargando…</p>}

      {estado === "ok" && pedidos.length === 0 && (
        <p className="rounded-2xl border border-line bg-surface/95 p-6 text-center text-sm text-muted-2">
          No hay nada esperando. Cuando alguien guarde un pedido para revisión, aparecerá aquí.
        </p>
      )}

      {pedidos.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface/95 shadow-[0_10px_28px_rgb(14_45_49/0.045)]">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-3 text-left text-xs uppercase text-muted">
                <th className="px-3 py-2">Pedido</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Líneas</th>
                <th className="px-3 py-2">Guardado por</th>
                <th className="px-3 py-2">Cuándo</th>
                <th className="px-3 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((pedido) => (
                <tr key={pedido.pedido} className="border-b border-line/70 last:border-0 hover:bg-surface-3/60">
                  <td className="px-3 py-2 font-extrabold text-ink">
                    <Link
                      href={`/revision/${encodeURIComponent(pedido.pedido)}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {pedido.numeroPedido}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-ink-2">{pedido.cliente || "—"}</td>
                  <td className="px-3 py-2 text-ink-2">{pedido.lineas}</td>
                  <td className="px-3 py-2 text-ink-2">{pedido.guardadoPor || "—"}</td>
                  <td className="px-3 py-2 text-muted-2">{fecha(pedido.guardadoEn)}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                      pedido.situacion === "EN_REVISION"
                        ? "bg-gold/15 text-gold-2"
                        : "bg-red-500/10 text-red-700"
                    }`}>
                      {pedido.etiqueta}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
