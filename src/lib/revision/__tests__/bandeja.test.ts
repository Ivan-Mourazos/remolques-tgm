import { describe, expect, it } from "vitest";
import { construirBandeja } from "@/lib/revision/bandeja";
import { decidido, guardadoParaRevision, type EstadoPedido } from "@/lib/pedidos/estado-pedido";
import { DEFAULT_PARAMS } from "@/lib/calc/params";
import { emptyLona } from "@/components/workspace/entradas-vacias";
import type { PlanteamientoRecord } from "@/lib/store/types";

const registro = (numeroPedido: string, updatedAt: string, version = "10"): PlanteamientoRecord => ({
  id: `${numeroPedido}-${version}`, tipo: "lona", numeroPedido, version,
  cliente: "TALLERES CAL",
  input: { ...emptyLona(), cabecera: { ...emptyLona().cabecera, numeroPedido } },
  result: {} as PlanteamientoRecord["result"],
  paramsSnapshot: DEFAULT_PARAMS,
  createdAt: updatedAt, updatedAt,
});

const enRevision = (numeroPedido: string, en: string): EstadoPedido =>
  guardadoParaRevision(null, { numeroPedido, por: "IVAN", en });

const noAprobado = (numeroPedido: string, en: string): EstadoPedido => {
  const decision = decidido(enRevision(numeroPedido, en), {
    estado: "NO_APROBADO", por: "JAIME", en,
  });
  if (!decision.ok) throw new Error("debería haber decidido");
  return decision.estado;
};

describe("la bandeja de revisión", () => {
  it("cuenta las líneas de cada pedido y dice quién lo guardó", () => {
    const bandeja = construirBandeja(
      [enRevision("AR.26.0001", "2026-09-01T08:00:00.000Z")],
      [
        registro("AR.26.0001", "2026-09-01T08:00:00.000Z", "10"),
        registro("AR.26.0001", "2026-09-01T08:00:00.000Z", "11"),
      ],
    );
    expect(bandeja).toHaveLength(1);
    expect(bandeja[0].lineas).toBe(2);
    expect(bandeja[0].guardadoPor).toBe("IVAN");
    expect(bandeja[0].cliente).toBe("TALLERES CAL");
  });

  it("ordena los pendientes por fecha, independientemente de decisiones antiguas", () => {
    const bandeja = construirBandeja(
      [
        noAprobado("AR.26.0002", "2026-09-03T08:00:00.000Z"),
        enRevision("AR.26.0001", "2026-09-01T08:00:00.000Z"),
      ],
      [
        registro("AR.26.0001", "2026-09-01T08:00:00.000Z"),
        registro("AR.26.0002", "2026-09-03T08:00:00.000Z"),
      ],
    );
    expect(bandeja.map((e) => e.pedido)).toEqual(["AR260002", "AR260001"]);
  });

  it("mantiene las correcciones pendientes de archivar", () => {
    const bandeja = construirBandeja(
      [noAprobado("AR.26.0002", "2026-09-03T08:00:00.000Z")],
      // La línea se tocó después del rechazo: alguien está con ello.
      [registro("AR.26.0002", "2026-09-04T08:00:00.000Z")],
    );
    expect(bandeja).toHaveLength(1);
  });

  it("incluye los aprobados antiguos cuyo PDF no se archivó", () => {
    const aprobado = decidido(enRevision("AR.26.0003", "2026-09-01T08:00:00.000Z"), {
      estado: "APROBADO", por: "JAIME", en: "2026-09-02T08:00:00.000Z",
    });
    if (!aprobado.ok) throw new Error("debería haber aprobado");
    expect(construirBandeja([aprobado.estado], [registro("AR.26.0003", "2026-09-01T08:00:00.000Z")]))
      .toHaveLength(1);
  });

  it("no se cae con un estado cuyo pedido ya no tiene líneas", () => {
    const bandeja = construirBandeja([enRevision("AR.26.0009", "2026-09-01T08:00:00.000Z")], []);
    expect(bandeja[0].lineas).toBe(0);
    expect(bandeja[0].cliente).toBe("");
  });
});
