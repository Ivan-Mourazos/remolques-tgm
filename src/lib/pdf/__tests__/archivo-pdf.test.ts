import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { rename } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { anioDelPlanteamiento, guardarPdfDuplicado, rutasPdf } from "@/lib/pdf/archivo-pdf";
import { nombrePdf } from "@/lib/pdf/ruta-pdf";

vi.mock("node:fs/promises", async importOriginal => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, rename: vi.fn(actual.rename) };
});
const temporales: string[] = [];
const preparar = () => {
  const raiz = mkdtempSync(path.join(tmpdir(), "tgm-pdf-"));
  temporales.push(raiz);
  const env = { RUTA_PLANTEAMIENTOS: path.join(raiz, "planteamientos"), RUTA_OFICINA_TECNICA: path.join(raiz, "oficina-tecnica") };
  Object.values(env).forEach(d => mkdirSync(d));
  return env;
};
afterEach(() => {
  vi.mocked(rename).mockReset();
  for (const d of temporales.splice(0)) rmSync(d, { recursive: true, force: true });
});
const contenido = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55]);

describe("archivo PDF en dos carpetas", () => {
  it("obtiene el año del pedido antes que la fecha del formulario", () => {
    expect(anioDelPlanteamiento("ar.26.03632", "2025-12-20")).toBe(2026);
    expect(anioDelPlanteamiento("OTRO", "2025-12-20")).toBe(2025);
    expect(anioDelPlanteamiento("OTRO", "", new Date("2027-02-01"))).toBe(2027);
  });
  it("exige ambas rutas incluso cuando no hay ninguna", () => {
    expect(() => rutasPdf("AR-10.pdf", 2026, {})).toThrow(/Deben configurarse/);
    expect(() => rutasPdf("AR-10.pdf", 2026, { RUTA_PLANTEAMIENTOS: "/mnt/general" })).toThrow(/Deben configurarse/);
    expect(() => rutasPdf("AR-10.pdf", 2026, { RUTA_PLANTEAMIENTOS: "relativa/a", RUTA_OFICINA_TECNICA: "relativa/b" })).toThrow(/rutas absolutas/);
  });
  it("guarda bytes idénticos con -10 solo en PLANTEAMIENTOS y pedido en mayúsculas", async () => {
    const env = preparar();
    const destinos = await guardarPdfDuplicado(contenido, nombrePdf("ar.26.03632"), 2026, env);
    expect(destinos).toEqual([
      path.join(env.RUTA_PLANTEAMIENTOS, "AR2603632-10.pdf"),
      path.join(env.RUTA_OFICINA_TECNICA, "2026", "AR2603632.pdf"),
    ]);
    for (const d of destinos) expect(readFileSync(d)).toEqual(Buffer.from(contenido));
  });
  it("no crea una raíz inexistente ni escribe en la otra carpeta", async () => {
    const env = preparar();
    rmSync(env.RUTA_OFICINA_TECNICA, { recursive: true });
    await expect(guardarPdfDuplicado(contenido, "AR2603632-10.pdf", 2026, env)).rejects.toThrow(/no está disponible/);
    expect(existsSync(env.RUTA_OFICINA_TECNICA)).toBe(false);
    expect(readdirSync(env.RUTA_PLANTEAMIENTOS)).toEqual([]);
  });
  it("detecta PDF existentes aunque no haya un registro en la base", async () => {
    const env = preparar();
    const destinos = rutasPdf("AR2603632-10.pdf", 2026, env);
    writeFileSync(destinos[0], "anterior");
    await expect(guardarPdfDuplicado(contenido, "AR2603632-10.pdf", 2026, env)).rejects.toThrow(/Ya existe/);
    expect(readFileSync(destinos[0], "utf8")).toBe("anterior");
    await guardarPdfDuplicado(contenido, "AR2603632-10.pdf", 2026, env, { sustituir: true });
    for (const d of destinos) expect(readFileSync(d)).toEqual(Buffer.from(contenido));
  });
  it("restaura la primera copia si falla la sustitución de la segunda", async () => {
    const env = preparar();
    const destinos = await guardarPdfDuplicado(contenido, "AR2603632-10.pdf", 2026, env);
    const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
    vi.mocked(rename)
      .mockImplementationOnce(actual.rename)
      .mockRejectedValueOnce(new Error("segunda carpeta sin red"));
    await expect(guardarPdfDuplicado(new Uint8Array([1, 2]), "AR2603632-10.pdf", 2026, env, { sustituir: true }))
      .rejects.toThrow("segunda carpeta sin red");
    for (const d of destinos) expect(readFileSync(d)).toEqual(Buffer.from(contenido));
    expect(readdirSync(env.RUTA_PLANTEAMIENTOS)).toEqual(["AR2603632-10.pdf"]);
  });
});
