import { describe, expect, it } from "vitest";
import { rowToRecord } from "@/lib/store/mssql-store";

describe("rowToRecord", () => {
  it("mapea una fila SQL a PlanteamientoRecord", () => {
    const rec = rowToRecord({
      Id: "ABC", Tipo: "lona", NumeroPedido: "AR1", Version: "1", Cliente: "X",
      InputJson: '{"cantidad":1}', ResultJson: '{"metrosTela":2}', ParamsJson: "{}",
      PdfPath: null,
      CreatedAt: new Date("2026-07-13T10:00:00Z"), UpdatedAt: new Date("2026-07-13T11:00:00Z"),
    });
    expect(rec).toMatchObject({
      id: "ABC", tipo: "lona", numeroPedido: "AR1",
      createdAt: "2026-07-13T10:00:00.000Z", updatedAt: "2026-07-13T11:00:00.000Z",
    });
    expect((rec.input as { cantidad: number }).cantidad).toBe(1);
  });
});
