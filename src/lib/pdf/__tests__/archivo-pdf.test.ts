import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { anioDelPlanteamiento, guardarPdfDuplicado, rutasPdf } from "@/lib/pdf/archivo-pdf";

const temporales: string[] = [];
afterEach(() => {
  for (const temporal of temporales.splice(0)) rmSync(temporal, { recursive: true, force: true });
});

describe("archivo PDF en servidor", () => {
  it("obtiene primero el año marcado después de AR", () => {
    expect(anioDelPlanteamiento("AR2603632", "2025-12-20")).toBe(2026);
    expect(anioDelPlanteamiento("AR.26.03632", "")).toBe(2026);
    expect(anioDelPlanteamiento("OTRO", "2025-12-20")).toBe(2025);
    expect(anioDelPlanteamiento("SIN-PEDIDO", "", new Date("2027-02-01"))).toBe(2027);
  });

  it("exige las dos variables cuando se activa el guardado", () => {
    expect(rutasPdf("AR-10.pdf", 2026, {})).toEqual([]);
    expect(() => rutasPdf("AR-10.pdf", 2026, { RUTA_PLANTEAMIENTOS: "/mnt/general" }))
      .toThrow(/Deben configurarse/);
    expect(() => rutasPdf("AR-10.pdf", 2026, {
      RUTA_PLANTEAMIENTOS: "relativa/planteamientos",
      RUTA_OFICINA_TECNICA: "relativa/oficina",
    })).toThrow(/rutas absolutas/);
  });

  it("guarda exactamente el mismo PDF en la general y en la del año", async () => {
    const raiz = mkdtempSync(path.join(tmpdir(), "tgm-pdf-"));
    temporales.push(raiz);
    const contenido = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55]);
    const destinos = await guardarPdfDuplicado(contenido, "AR2603632-10.pdf", 2026, {
      RUTA_PLANTEAMIENTOS: path.join(raiz, "planteamientos"),
      RUTA_OFICINA_TECNICA: path.join(raiz, "oficina-tecnica"),
    });

    expect(destinos).toEqual([
      path.join(raiz, "planteamientos", "AR2603632-10.pdf"),
      path.join(raiz, "oficina-tecnica", "2026", "AR2603632-10.pdf"),
    ]);
    expect(readFileSync(destinos[0])).toEqual(Buffer.from(contenido));
    expect(readFileSync(destinos[1])).toEqual(Buffer.from(contenido));
  });
});
