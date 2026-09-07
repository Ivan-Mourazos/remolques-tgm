import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PedidosFileStore } from "@/lib/store/pedidos-file-store";
import { guardadoParaRevision } from "@/lib/pedidos/estado-pedido";

const dirs: string[] = [];
function almacen() {
  const dir = mkdtempSync(path.join(tmpdir(), "tgm-pedidos-"));
  dirs.push(dir);
  return new PedidosFileStore(dir);
}
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });

const estado = (numeroPedido: string, en = "2026-09-01T08:00:00.000Z") =>
  guardadoParaRevision(null, { numeroPedido, por: "IVAN", en });

describe("almacén de pedidos en fichero", () => {
  it("no encuentra nada en un directorio vacío", async () => {
    const store = almacen();
    expect(await store.get("AR260123")).toBeNull();
    expect(await store.list()).toEqual([]);
  });

  it("guarda y lee por la clave normalizada", async () => {
    const store = almacen();
    await store.save(estado("AR.26.0123"));
    // Se escribió con puntos y se busca sin ellos: es el mismo pedido.
    expect((await store.get("AR260123"))?.numeroPedido).toBe("AR.26.0123");
    expect((await store.get("ar.26.0123"))?.numeroPedido).toBe("AR.26.0123");
  });

  it("sustituye el estado del mismo pedido en vez de acumular filas", async () => {
    const store = almacen();
    await store.save(estado("AR.26.0123"));
    await store.save(estado("AR260123", "2026-09-02T08:00:00.000Z"));
    const todos = await store.list();
    expect(todos).toHaveLength(1);
    expect(todos[0].updatedAt).toBe("2026-09-02T08:00:00.000Z");
  });

  it("lista lo más reciente primero", async () => {
    const store = almacen();
    await store.save(estado("AR.26.0001", "2026-09-01T08:00:00.000Z"));
    await store.save(estado("AR.26.0002", "2026-09-03T08:00:00.000Z"));
    await store.save(estado("AR.26.0003", "2026-09-02T08:00:00.000Z"));
    expect((await store.list()).map((e) => e.pedido))
      .toEqual(["AR260002", "AR260003", "AR260001"]);
  });
});
