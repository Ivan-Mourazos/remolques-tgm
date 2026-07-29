"use client";
import { useEffect, type Dispatch } from "react";
import type { PlanteamientoRecord } from "@/lib/store/types";
import type { AccionWorkspace } from "@/lib/workspace/estado";
import { normalizarNumeroPedidoRps } from "@/lib/rps/numero-pedido";

/** Registros ya guardados del pedido abierto. Debounce de 250 ms. */
export function useRegistrosPedido(
  numeroPedido: string,
  despachar: Dispatch<AccionWorkspace>,
) {
  useEffect(() => {
    const numero = normalizarNumeroPedidoRps(numeroPedido);
    if (!numero) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void fetch(`/api/planteamientos?pedido=${encodeURIComponent(numeroPedido)}`, {
        signal: controller.signal,
        cache: "no-store",
      }).then(async (respuesta) => {
        if (!respuesta.ok) throw new Error(String(respuesta.status));
        despachar({
          tipo: "REGISTROS_CARGADOS",
          registros: await respuesta.json() as PlanteamientoRecord[],
        });
      }).catch((error: unknown) => {
        if ((error as Error).name !== "AbortError") despachar({ tipo: "REGISTROS_FALLARON" });
      });
    }, 250);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [despachar, numeroPedido]);
}
