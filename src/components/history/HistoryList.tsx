"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { deleteHistoryItem, loadHistory } from "@/lib/storage/local-storage";
import type { SavedItem } from "@/lib/types";

export function HistoryList() {
  const [items, setItems] = useState<SavedItem[]>([]);

  const refresh = () => setItems(loadHistory());

  useEffect(() => {
    refresh();
  }, []);

  const handleDelete = (id: string) => {
    if (!confirm("¿Eliminar este planteamiento?")) return;
    deleteHistoryItem(id);
    refresh();
  };

  return (
    <section>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Historial</h1>
      {items.length === 0 ? (
        <p className="text-slate-600">No hay planteamientos guardados.</p>
      ) : (
        <table className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white text-sm shadow-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="p-3">Fecha</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Pedido</th>
              <th className="p-3">Cliente</th>
              <th className="p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="p-3">
                  {new Date(item.updatedAt).toLocaleString("es-ES")}
                </td>
                <td className="p-3">
                  {item.type === "lona-remolque" ? "Lona" : "Baquetón"}
                </td>
                <td className="p-3 font-medium">{item.input.numeroPedido || "—"}</td>
                <td className="p-3">{item.input.cliente || "—"}</td>
                <td className="p-3">
                  <Link
                    href={
                      item.type === "lona-remolque"
                        ? `/nuevo/lona?id=${item.id}`
                        : `/nuevo/baqueton?id=${item.id}`
                    }
                    className="mr-3 font-semibold text-slate-800 underline"
                  >
                    Abrir
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="text-red-600 hover:underline"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
