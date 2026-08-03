import { describe, expect, it, vi } from "vitest";
import { emptyLona } from "@/components/workspace/entradas-vacias";
import type { LonaInput } from "@/lib/calc/lona";
import type { LineaPedido } from "@/lib/workspace/lineas";
import { orquestarPdf } from "@/lib/pdf/orquestar-pdf";

const lonaCompleta = (version: string): LonaInput => ({
  ...emptyLona(),
  cabecera: { ...emptyLona().cabecera, numeroPedido: "AR2603583", version, cliente: "CLIENTE" },
  largo: 600, ancho: 250, altoDelante: 220, contorno: 620, material: "PVC 580 AZUL",
  tipoPerfil: "TIPO 01", recogeDelante: "NO", recogeAtras: "NO",
  ventana: false, rotulacion: false, bastillaEnfundar: false, modoOllaos: "REPARTIDOS",
});

const linea = (version: string, cambios: Partial<LineaPedido> = {}): LineaPedido => ({
  version, tipo: "lona", input: lonaCompleta(version), snapshotSvg: `<svg id="${version}"/>`,
  ...cambios,
});

function deps(respuesta = new Response("%PDF", { status: 200 })) {
  const fetch = vi.fn(async () => respuesta);
  const rasterizar = vi.fn(async (svg: string) => `png:${svg}`);
  const onProgreso = vi.fn();
  return { fetch: fetch as unknown as typeof globalThis.fetch, rasterizar, onProgreso };
}

const cuerpo = (fetch: ReturnType<typeof vi.fn>) =>
  JSON.parse((fetch.mock.calls[0][1] as RequestInit).body as string);

describe("orquestarPdf", () => {
  it("manda una página por línea, con su dibujo, sin bajarse nada del servidor", async () => {
    const d = deps();
    const resultado = await orquestarPdf(
      { numeroPedido: "AR2603583", archivar: true, lineas: [linea("10", { id: "a" }), linea("11")] },
      d,
    );
    expect(resultado.ok).toBe(true);
    // Antes se pedía /api/planteamientos para reconstruir el pedido; ahora las
    // líneas ya vienen dadas y la única llamada es la del PDF.
    expect((d.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
    const enviado = cuerpo(d.fetch as unknown as ReturnType<typeof vi.fn>);
    expect(enviado.paginas.map((p: { clave: string }) => p.clave)).toEqual(["a", "borrador:11"]);
    expect(enviado.snapshots).toEqual({ a: "png:<svg id=\"10\"/>", "borrador:11": "png:<svg id=\"11\"/>" });
    expect(enviado.archivar).toBe(true);
  });

  it("cuenta el avance una vez por dibujo", async () => {
    const d = deps();
    await orquestarPdf(
      { numeroPedido: "AR2603583", archivar: false, lineas: [linea("10"), linea("11")] },
      d,
    );
    expect(d.onProgreso.mock.calls).toEqual([[1, 2], [2, 2]]);
  });

  it("omite las líneas incompletas y dice cuántas", async () => {
    const d = deps();
    const incompleta = linea("11", { input: { ...lonaCompleta("11"), modoOllaos: "" } });
    const resultado = await orquestarPdf(
      { numeroPedido: "AR2603583", archivar: false, lineas: [linea("10"), incompleta] },
      d,
    );
    expect(resultado).toMatchObject({ ok: true, omitidos: 1 });
    expect(cuerpo(d.fetch as unknown as ReturnType<typeof vi.fn>).paginas).toHaveLength(1);
  });

  it("sin ninguna línea completa no llega a pedir el PDF", async () => {
    const d = deps();
    const incompleta = linea("10", { input: { ...lonaCompleta("10"), modoOllaos: "" } });
    const resultado = await orquestarPdf(
      { numeroPedido: "AR2603583", archivar: false, lineas: [incompleta] },
      d,
    );
    expect(resultado).toMatchObject({ ok: false, motivo: "sin-elementos" });
    expect((d.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0);
  });

  it("una línea sin dibujo va sin PNG en vez de romper", async () => {
    const d = deps();
    await orquestarPdf(
      { numeroPedido: "AR2603583", archivar: false, lineas: [linea("10", { snapshotSvg: null })] },
      d,
    );
    expect(cuerpo(d.fetch as unknown as ReturnType<typeof vi.fn>).snapshots).toEqual({ "borrador:10": null });
    expect(d.rasterizar).not.toHaveBeenCalled();
  });

  it("un error HTTP se devuelve con su mensaje", async () => {
    const d = deps(new Response(JSON.stringify({ error: "no se pudo" }), { status: 500 }));
    const resultado = await orquestarPdf(
      { numeroPedido: "AR2603583", archivar: false, lineas: [linea("10")] },
      d,
    );
    expect(resultado).toEqual({ ok: false, motivo: "http", mensaje: "no se pudo" });
  });

  it("no falla si nadie escucha el progreso", async () => {
    // `onProgreso` es opcional: el PDF del servidor se genera sin nadie que lo
    // pinte. Sin este caso, quitar el `?.` de la llamada no rompería ningún test.
    const { onProgreso, ...sinProgreso } = deps();
    void onProgreso;
    const resultado = await orquestarPdf(
      { numeroPedido: "AR2603583", archivar: false, lineas: [linea("10")] },
      sinProgreso,
    );
    expect(resultado.ok).toBe(true);
  });
});
