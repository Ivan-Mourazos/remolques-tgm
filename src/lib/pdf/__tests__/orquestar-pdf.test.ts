import { describe, expect, it } from "vitest";
import { emptyLona } from "@/components/workspace/entradas-vacias";
import type { LonaInput } from "@/lib/calc/lona";
import type { PlanteamientoRecord } from "@/lib/store/types";
import { orquestarPdf, type OpcionesOrquestarPdf } from "@/lib/pdf/orquestar-pdf";

// «Válida» incluye las siete decisiones: `emptyLona()` arranca sin ninguna
// tomada, y `orquestarPdf` filtra por `planteamientoGenerable`, así que una lona
// solo medida se contaría como omitida — que es exactamente lo que debe pasar.
const lonaValida = (version: string): LonaInput => ({
  ...emptyLona(),
  cabecera: { ...emptyLona().cabecera, numeroPedido: "AR2603583", version },
  largo: 600, ancho: 250, altoDelante: 220, contorno: 620, material: "PVC 580 AZUL",
  tipoPerfil: "TIPO 01", recogeDelante: "NO", recogeAtras: "NO",
  ventana: false, bastillaEnfundar: false, rotulacion: false,
  modoOllaos: "REPARTIDOS",
});

const registro = (id: string, version: string, input: LonaInput): PlanteamientoRecord => ({
  id, tipo: "lona", numeroPedido: "AR2603583", version, cliente: "CLIENTE",
  input, result: {}, paramsSnapshot: {}, snapshotSvg: `<svg id="${id}"/>`,
  createdAt: `2026-07-2${version.slice(-1)}T10:00:00Z`,
  updatedAt: `2026-07-2${version.slice(-1)}T10:00:00Z`,
} as unknown as PlanteamientoRecord);

const opciones = (extra: Partial<OpcionesOrquestarPdf> = {}): OpcionesOrquestarPdf => ({
  numeroPedido: "AR2603583", archivar: true, editorActivo: false,
  idGuardado: null, idBorrador: "__vista-previa__",
  tipo: "lona", input: lonaValida("10"), svgActual: "<svg id=\"actual\"/>",
  ...extra,
});

/** Doble de fetch: primero el listado del pedido, luego POST /api/pdf. */
function fetchFalso(registros: PlanteamientoRecord[], respuestaPdf?: Response) {
  const llamadas: { url: string; body: unknown }[] = [];
  const doble = (async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const url = String(entrada);
    llamadas.push({ url, body: init?.body ? JSON.parse(String(init.body)) : null });
    if (url.startsWith("/api/planteamientos")) {
      return new Response(JSON.stringify(registros), { status: 200 });
    }
    return respuestaPdf ?? new Response("%PDF", {
      status: 200, headers: { "X-Pdf-Omitidos": "0" },
    });
  }) as unknown as typeof globalThis.fetch;
  return { doble, llamadas };
}

const deps = (fetchDoble: typeof globalThis.fetch) => ({
  fetch: fetchDoble,
  rasterizar: async (svg: string) => (svg ? `png:${svg}` : null),
});

describe("orquestarPdf", () => {
  it("falla sin elementos cuando el pedido no tiene registros y no hay editor abierto", async () => {
    const { doble } = fetchFalso([]);
    const resultado = await orquestarPdf(opciones(), deps(doble));
    expect(resultado).toEqual({
      ok: false,
      motivo: "sin-elementos",
      mensaje: "El pedido todavía no contiene ningún elemento válido para generar el PDF.",
    });
  });

  it("envía una página por registro guardado, ordenadas por fecha de creación", async () => {
    const { doble, llamadas } = fetchFalso([
      registro("b", "11", lonaValida("11")),
      registro("a", "10", lonaValida("10")),
    ]);
    const resultado = await orquestarPdf(opciones(), deps(doble));
    expect(resultado.ok).toBe(true);
    const peticionPdf = llamadas.find((l) => l.url === "/api/pdf")!.body as {
      ids: string[]; snapshots: Record<string, string>; archivar: boolean; borrador: unknown;
    };
    expect(peticionPdf.ids).toEqual(["a", "b"]);
    expect(peticionPdf.snapshots).toEqual({ a: "png:<svg id=\"a\"/>", b: "png:<svg id=\"b\"/>" });
    expect(peticionPdf.borrador).toBeNull();
  });

  it("en vista previa manda el borrador y excluye su versión de los registros", async () => {
    const { doble, llamadas } = fetchFalso([registro("a", "10", lonaValida("10"))]);
    const resultado = await orquestarPdf(
      opciones({ archivar: false, editorActivo: true, idBorrador: "__vista-previa__" }),
      deps(doble),
    );
    expect(resultado.ok).toBe(true);
    const peticionPdf = llamadas.find((l) => l.url === "/api/pdf")!.body as {
      ids: string[]; snapshots: Record<string, string>; borrador: { id: string } | null;
    };
    expect(peticionPdf.ids).toEqual([]);
    expect(peticionPdf.borrador?.id).toBe("__vista-previa__");
    expect(peticionPdf.snapshots["__vista-previa__"]).toBe("png:<svg id=\"actual\"/>");
  });

  it("cuenta como omitidos los registros incompletos", async () => {
    const incompleto = registro("malo", "11", { ...lonaValida("11"), material: "" });
    const { doble } = fetchFalso([registro("a", "10", lonaValida("10")), incompleto]);
    const resultado = await orquestarPdf(opciones(), deps(doble));
    expect(resultado).toMatchObject({ ok: true, omitidos: 1, nombre: "AR2603583-10.pdf" });
  });

  it("devuelve el error del servidor cuando el PDF responde con fallo", async () => {
    const { doble } = fetchFalso(
      [registro("a", "10", lonaValida("10"))],
      new Response(JSON.stringify({ error: "Plantilla no encontrada" }), { status: 500 }),
    );
    const resultado = await orquestarPdf(opciones(), deps(doble));
    expect(resultado).toEqual({
      ok: false, motivo: "http", mensaje: "Plantilla no encontrada",
    });
  });
});

describe("progreso del rasterizado", () => {
  it("informa una vez por dibujo rasterizado", async () => {
    const { doble } = fetchFalso([
      registro("a", "10", lonaValida("10")),
      registro("b", "11", lonaValida("11")),
    ]);
    const pasos: Array<[number, number]> = [];
    const resultado = await orquestarPdf(opciones(), {
      ...deps(doble),
      onProgreso: (hecho, total) => pasos.push([hecho, total]),
    });
    expect(resultado.ok).toBe(true);
    expect(pasos).toEqual([[1, 2], [2, 2]]);
  });

  it("cuenta tambien el dibujo del elemento en edicion", async () => {
    const { doble } = fetchFalso([registro("a", "10", lonaValida("10"))]);
    const pasos: Array<[number, number]> = [];
    await orquestarPdf(
      opciones({ archivar: false, editorActivo: true, input: lonaValida("11") }),
      { ...deps(doble), onProgreso: (hecho, total) => pasos.push([hecho, total]) },
    );
    expect(pasos).toEqual([[1, 2], [2, 2]]);
  });

  it("no falla si nadie escucha el progreso", async () => {
    const { doble } = fetchFalso([registro("a", "10", lonaValida("10"))]);
    await expect(orquestarPdf(opciones(), deps(doble))).resolves.toMatchObject({ ok: true });
  });
});
