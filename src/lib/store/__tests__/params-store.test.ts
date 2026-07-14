import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { FileStore } from "@/lib/store/file-store";
import { DEFAULT_PARAMS } from "@/lib/calc/params";

const dirs: string[] = [];
const makeStore = () => {
  const dir = mkdtempSync(path.join(tmpdir(), "tgm-params-"));
  dirs.push(dir);
  return new FileStore(dir);
};
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });

describe("parámetros en FileStore", () => {
  it("sin fichero devuelve DEFAULT_PARAMS", async () => {
    expect(await makeStore().getParams()).toEqual(DEFAULT_PARAMS);
  });
  it("saveParams persiste y getParams lo devuelve", async () => {
    const store = makeStore();
    await store.saveParams({ ...DEFAULT_PARAMS, pasoOllaosDefecto: 40 });
    expect((await store.getParams()).pasoOllaosDefecto).toBe(40);
  });
});
