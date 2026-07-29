"use client";
import { useEffect, useRef, type Dispatch, type RefObject } from "react";
import type { PedidoRps } from "@/lib/rps/types";
import type { AccionWorkspace } from "@/lib/workspace/estado";
import { normalizarNumeroPedidoRps } from "@/lib/rps/numero-pedido";

const FORMA_PEDIDO_RPS = /^[A-Z]{2}\d{5,}$/;

export function useConsultaRps({
  numeroPedido, reintento, hayInicial, despachar, onPedidoUnicaLinea,
  reiniciarGuarda: reiniciarGuardaRef,
}: {
  numeroPedido: string;
  reintento: number;
  hayInicial: boolean;
  despachar: Dispatch<AccionWorkspace>;
  onPedidoUnicaLinea: (pedido: PedidoRps) => void;
  reiniciarGuarda: RefObject<(() => void) | null>;
}) {
  const numeroAnterior = useRef(normalizarNumeroPedidoRps(numeroPedido));
  const ultimaConsulta = useRef("");

  useEffect(() => {
    reiniciarGuardaRef.current = () => { ultimaConsulta.current = ""; };
  }, [reiniciarGuardaRef]);

  useEffect(() => {
    const numero = normalizarNumeroPedidoRps(numeroPedido);
    const cambioPedido = numero !== numeroAnterior.current;
    numeroAnterior.current = numero;

    if (!FORMA_PEDIDO_RPS.test(numero)) {
      ultimaConsulta.current = "";
      return;
    }
    // Un registro reutilizado no se sobrescribe al abrirse. La consulta se
    // activa en cuanto el usuario cambie el número o pulse Reintentar.
    if (hayInicial && !cambioPedido && reintento === 0) return;
    const clave = `${numero}:${reintento}`;
    if (ultimaConsulta.current === clave) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      ultimaConsulta.current = clave;
      despachar({ tipo: "RPS_CONSULTA_INICIADA", numero });
      void fetch(`/api/rps/pedido?numero=${encodeURIComponent(numero)}`, {
        signal: controller.signal,
        cache: "no-store",
      }).then(async (response) => {
        const payload = await response.json() as { pedido?: PedidoRps | null; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "No se pudo consultar RPS.");
        if (!payload.pedido) {
          despachar({ tipo: "RPS_NO_ENCONTRADO" });
          return;
        }
        despachar({ tipo: "RPS_ENCONTRADO", pedido: payload.pedido });
        if (payload.pedido.lineas.length === 1) onPedidoUnicaLinea(payload.pedido);
      }).catch((error: unknown) => {
        if (controller.signal.aborted) return;
        despachar({
          tipo: "RPS_ERROR",
          mensaje: error instanceof Error ? error.message : "No se pudo consultar RPS.",
        });
      });
    }, 450);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [despachar, hayInicial, numeroPedido, onPedidoUnicaLinea, reintento]);
}
