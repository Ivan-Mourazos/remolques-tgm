import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { FileStore } from "@/lib/store/file-store";
import { DEFAULT_PARAMS } from "@/lib/calc/params";
import { normalizarParams, validarParams } from "@/lib/calc/validar-params";

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

describe("la lista de técnicos", () => {
  it("completa la lista cuando los parámetros guardados son de antes", () => {
    const { tecnicos } = normalizarParams({ demasiaAlto: 3 });
    expect(tecnicos).toEqual(DEFAULT_PARAMS.tecnicos);
    expect(tecnicos).toContain("IVAN");
  });

  it("conserva la lista guardada cuando la hay", () => {
    expect(normalizarParams({ tecnicos: ["ANA", "LUIS"] }).tecnicos).toEqual(["ANA", "LUIS"]);
  });

  it("no acepta guardar una lista vacía: sin técnicos no se puede aprobar nada", () => {
    const resultado = validarParams({ ...DEFAULT_PARAMS, tecnicos: [] });
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.errores.join(" ")).toContain("técnico");
  });

  it("no acepta nombres en blanco", () => {
    const resultado = validarParams({ ...DEFAULT_PARAMS, tecnicos: ["IVAN", "  "] });
    expect(resultado.ok).toBe(false);
  });
});
