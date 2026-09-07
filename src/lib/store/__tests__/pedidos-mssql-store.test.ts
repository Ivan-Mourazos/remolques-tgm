import { describe, expect, it } from "vitest";
import { filaAEstado } from "@/lib/store/pedidos-mssql-store";

describe("mapeo de la fila de PedidosRevision", () => {
  it("desempaqueta el JSON y normaliza las fechas a ISO", () => {
    const estado = filaAEstado({
      Pedido: "AR260123",
      NumeroPedido: "AR.26.0123",
      RevisionEstado: "APROBADO",
      RevisionPor: "JAIME",
      RevisionEn: new Date("2026-09-02T08:00:00.000Z"),
      UltimaDecisionJson: JSON.stringify({
        estado: "APROBADO", por: "JAIME", en: "2026-09-02T08:00:00.000Z",
      }),
      ProduccionJson: JSON.stringify({
        por: "IVAN", en: "2026-09-03T08:00:00.000Z",
        nombrePdf: "AR.26.0123-10.pdf", rutas: ["/a/x.pdf", "/b/x.pdf"],
      }),
      UpdatedAt: new Date("2026-09-03T08:00:00.000Z"),
    });
    expect(estado.pedido).toBe("AR260123");
    expect(estado.revision).toEqual({
      estado: "APROBADO", por: "JAIME", en: "2026-09-02T08:00:00.000Z",
    });
    expect(estado.produccion?.rutas).toHaveLength(2);
    expect(estado.updatedAt).toBe("2026-09-03T08:00:00.000Z");
  });

  it("deja en null lo que la fila no trae, sin reventar", () => {
    const estado = filaAEstado({
      Pedido: "AR260123", NumeroPedido: "AR.26.0123",
      RevisionEstado: "EN_REVISION", RevisionPor: "IVAN",
      RevisionEn: new Date("2026-09-01T08:00:00.000Z"),
      UltimaDecisionJson: null, ProduccionJson: null,
      UpdatedAt: new Date("2026-09-01T08:00:00.000Z"),
    });
    expect(estado.ultimaDecision).toBeNull();
    expect(estado.produccion).toBeNull();
  });
});
