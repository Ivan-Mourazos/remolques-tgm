import { describe, expect, it, vi } from "vitest";
import { generarPdfPedido, type DependenciasPdfPedido } from "@/lib/pdf/generar-pdf-pedido";
import { emptyLona } from "@/components/workspace/entradas-vacias";
import { DEFAULT_PARAMS } from "@/lib/calc/params";
import type { LonaInput } from "@/lib/calc/lona";
import type { PlanteamientoStore } from "@/lib/store/types";

const completa = (): LonaInput => ({
  ...emptyLona(),
  cabecera: { ...emptyLona().cabecera, numeroPedido: "AR.26.0123", fecha: "2026-09-01" },
  cantidad: 1, largo: 300, ancho: 157, altoDelante: 120,
  tipoPerfil: "TIPO 05", radioEsquina: 8, contorno: 391,
  recogeDelante: "NO", recogeAtras: "GOMA", bastillaEnfundar: false,
  ventana: false, rotulacion: false,
  modoOllaos: "REPARTIDOS", material: "LONA ALPHA",
});

const store = {
  get: async () => null,
  getParams: async () => DEFAULT_PARAMS,
} as unknown as PlanteamientoStore;

const deps = (extra: Partial<DependenciasPdfPedido> = {}): DependenciasPdfPedido => ({
  store,
  render: async () => new Uint8Array([37, 80, 68, 70]),
  archivar: async () => ["/a/x.pdf", "/b/x.pdf"],
  logo: null,
  ahora: "2026-09-03T08:00:00.000Z",
  ...extra,
});

describe("generar el PDF de un pedido", () => {
  it("nombra el fichero y calcula el año como siempre", async () => {
    const resultado = await generarPdfPedido(
      { paginas: [{ clave: "a", tipo: "lona", input: completa() }], snapshots: {}, archivar: true },
      deps(),
    );
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.nombre).toBe("AR.26.0123-10.pdf");
    expect(resultado.anio).toBe(2026);
    expect(resultado.destinos).toHaveLength(2);
  });

  it("no archiva nada cuando no se le pide", async () => {
    const archivar = vi.fn(async () => ["/a/x.pdf"]);
    const resultado = await generarPdfPedido(
      { paginas: [{ clave: "a", tipo: "lona", input: completa() }], snapshots: {}, archivar: false },
      deps({ archivar }),
    );
    expect(archivar).not.toHaveBeenCalled();
    if (resultado.ok) expect(resultado.destinos).toEqual([]);
  });

  it("rechaza una línea incompleta sin llegar a renderizar", async () => {
    const render = vi.fn(async () => new Uint8Array());
    const resultado = await generarPdfPedido(
      {
        paginas: [{ clave: "a", tipo: "lona", input: { ...completa(), tipoPerfil: "" } }],
        snapshots: {}, archivar: true,
      },
      deps({ render }),
    );
    expect(resultado.ok).toBe(false);
    expect(render).not.toHaveBeenCalled();
  });

  it("sin ninguna página no inventa un PDF vacío", async () => {
    const resultado = await generarPdfPedido(
      { paginas: [], snapshots: {}, archivar: true }, deps(),
    );
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.mensaje).toContain("completo");
  });

  it("si el archivado falla, el error sube: no hay PDF dado por bueno", async () => {
    await expect(generarPdfPedido(
      { paginas: [{ clave: "a", tipo: "lona", input: completa() }], snapshots: {}, archivar: true },
      deps({ archivar: async () => { throw new Error("la unidad de red no contesta"); } }),
    )).rejects.toThrow("no contesta");
  });
});
