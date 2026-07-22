import { describe, expect, it } from "vitest";
import {
  agruparPorPedido,
  nombreElementoPedido,
  nombreRemolque,
  remolquesUnicos,
  siguienteVersionPedido,
} from "@/lib/pedidos/agrupar-pedido";
import { normalizarNumeroPedido } from "@/lib/pedidos/numero-pedido";
import type { PlanteamientoRecord } from "@/lib/store/types";

const registro = (id: string, pedido: string, version: string, updatedAt: string) => ({
  id, numeroPedido: pedido, version, updatedAt, createdAt: updatedAt,
  tipo: "lona", cliente: "CLIENTE", input: {}, result: {}, paramsSnapshot: {},
}) as unknown as PlanteamientoRecord;

describe("agrupación de pedidos", () => {
  it("normaliza formatos equivalentes del mismo pedido", () => {
    expect(normalizarNumeroPedido("AR.26-03583")).toBe("AR2603583");
  });

  it("conserva solo el guardado más reciente por posición de remolque", () => {
    const unicos = remolquesUnicos([
      registro("viejo", "AR2603583", "10", "2026-07-20T10:00:00Z"),
      registro("nuevo", "AR.26.03583", "10", "2026-07-21T10:00:00Z"),
      registro("segundo", "AR2603583", "11", "2026-07-20T11:00:00Z"),
    ]);
    expect(unicos.map((item) => item.id)).toEqual(["nuevo", "segundo"]);
  });

  it("agrupa los remolques bajo un único pedido", () => {
    const grupos = agruparPorPedido([
      registro("a", "AR2603583", "10", "2026-07-20T10:00:00Z"),
      registro("b", "AR.26.03583", "11", "2026-07-21T10:00:00Z"),
    ]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].remolques).toHaveLength(2);
    expect(nombreRemolque("10")).toBe("Remolque 1");
  });

  it("asigna la siguiente posición y un nombre comprensible", () => {
    expect(siguienteVersionPedido([{ version: "10" }, { version: "12" }])).toBe("13");
    expect(siguienteVersionPedido([])).toBe("10");
    expect(nombreElementoPedido("11", "lona")).toBe("Remolque 2");
    expect(nombreElementoPedido("12", "baqueton")).toBe("Baquetón 3");
  });
});
