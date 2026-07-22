import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { FileStore } from "@/lib/store/file-store";
import { DEFAULT_PARAMS } from "@/lib/calc/params";
import type { LonaInput, LonaResult } from "@/lib/calc/lona";

const dirs: string[] = [];
function makeStore() {
  const dir = mkdtempSync(path.join(tmpdir(), "tgm-store-"));
  dirs.push(dir);
  return new FileStore(dir);
}
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });

const rec = {
  tipo: "lona" as const,
  numeroPedido: "AR2602796", version: "10", cliente: "REMOLQUES YAGÜE",
  input: { cantidad: 1 } as unknown as LonaInput,
  result: { metrosTela: 5.61 } as unknown as LonaResult,
  paramsSnapshot: DEFAULT_PARAMS,
  snapshotSvg: null,
};

describe("FileStore", () => {
  it("save asigna id y fechas; get lo recupera", async () => {
    const store = makeStore();
    const saved = await store.save(rec);
    expect(saved.id).toBeTruthy();
    expect(saved.createdAt).toBeTruthy();
    expect(await store.get(saved.id)).toMatchObject({ numeroPedido: "AR2602796" });
    expect(await store.get("no-existe")).toBeNull();
  });

  it("save con id existente actualiza (nueva versión de datos)", async () => {
    const store = makeStore();
    const saved = await store.save(rec);
    const updated = await store.save({ ...rec, id: saved.id, version: "11" });
    expect(updated.id).toBe(saved.id);
    expect(updated.version).toBe("11");
    expect((await store.list()).length).toBe(1);
  });

  it("list filtra por texto (pedido o cliente) y ordena por fecha desc", async () => {
    const store = makeStore();
    await store.save(rec);
    await store.save({ ...rec, numeroPedido: "AR2699999", cliente: "OTRO" });
    const todos = await store.list();
    expect(todos[0].numeroPedido).toBe("AR2699999");
    expect(await store.list({ texto: "yagüe" })).toHaveLength(1);
    expect(await store.list({ tipo: "baqueton" })).toHaveLength(0);
    expect(await store.list({ pedido: "AR.26.02796" })).toHaveLength(1);
  });
});
