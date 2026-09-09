import { afterEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { NextRequest } from "next/server";
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import { POST as PREVIEW } from "@/app/api/pedidos/[pedido]/vista-previa/route";
import { guardarPdfDuplicado } from "@/lib/pdf/archivo-pdf";
import { POST } from "@/app/api/pedidos/[pedido]/guardar/route";
import { emptyLona } from "@/components/workspace/entradas-vacias";
import { DEFAULT_PARAMS } from "@/lib/calc/params";
import type { EstadoPedido } from "@/lib/pedidos/estado-pedido";

const mocks = vi.hoisted(() => ({
  list: vi.fn(), getParams: vi.fn(), guardarEstado: vi.fn(async (e: EstadoPedido) => e),
}));
vi.mock("@/lib/store", () => ({ getStore: () => ({ list: mocks.list, getParams: mocks.getParams, get: async () => null }) }));
vi.mock("@/lib/store/pedidos", () => ({ getPedidosStore: () => ({ get: async () => null, save: mocks.guardarEstado }) }));
vi.mock("@react-pdf/renderer", async importOriginal => {
  const actual = await importOriginal<typeof import("@react-pdf/renderer")>();
  return { ...actual, renderToBuffer: vi.fn(actual.renderToBuffer) };
});

vi.mock("@/lib/pdf/archivo-pdf", async importOriginal => {
  const actual = await importOriginal<typeof import("@/lib/pdf/archivo-pdf")>();
  return { ...actual, guardarPdfDuplicado: vi.fn(actual.guardarPdfDuplicado) };
});
const carpetas: string[] = [];
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  carpetas.splice(0).forEach(d => rmSync(d, { recursive: true, force: true }));
});

function preparar() {
  vi.stubGlobal("React", React);
  const input = {
    ...emptyLona(),
    cabecera: { ...emptyLona().cabecera, numeroPedido: "ar.26.03632", cliente: "PRUEBA", realizadoPor: "IVAN", fecha: "2026-09-09" },
    cantidad: 1, largo: 300, ancho: 157, altoDelante: 120, tipoPerfil: "TIPO 05",
    radioEsquina: 8, contorno: 391, material: "LONA ALPHA",
    recogeDelante: "NO", recogeAtras: "GOMA", bastillaEnfundar: false,
    ventana: false, rotulacion: false, modoOllaos: "REPARTIDOS",
  };
  mocks.list.mockResolvedValue([{ id: "qa", tipo: "lona", numeroPedido: "ar.26.03632", version: "10", input }]);
  mocks.getParams.mockResolvedValue({ ...DEFAULT_PARAMS, tecnicos: ["JAIME"] });
}
const request = (por = "JAIME") => new NextRequest("http://localhost/api/pedidos/ar.26.03632/guardar", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ por, snapshots: {} }),
});
const ctx = () => ({ params: Promise.resolve({ pedido: "ar.26.03632" }) });

describe("guardar desde Revisión", () => {
  it("imprime al revisor y guarda dos PDF idénticos con los nombres correctos", async () => {
    preparar();
    const raiz = mkdtempSync(path.join(tmpdir(), "tgm-guardar-api-"));
    carpetas.push(raiz);
    const general = path.join(raiz, "general"), oficina = path.join(raiz, "oficina");
    mkdirSync(general); mkdirSync(oficina);
    vi.stubEnv("RUTA_PLANTEAMIENTOS", general);
    vi.stubEnv("RUTA_OFICINA_TECNICA", oficina);
    const respuesta = await POST(request(), ctx());
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("X-Nombre-Pdf")).toBe("AR2603632-10.pdf");
    expect(respuesta.headers.get("X-Pdf-Destinos")).toBe("2");
    expect(vi.mocked(renderToBuffer).mock.calls[0][0].props).toMatchObject({ revisor: "JAIME" });
    const bytes = Buffer.from(await respuesta.arrayBuffer());
    expect(readFileSync(path.join(general, "AR2603632-10.pdf"))).toEqual(bytes);
    expect(readFileSync(path.join(oficina, "2026", "AR2603632.pdf"))).toEqual(bytes);
    expect(mocks.guardarEstado.mock.calls[0][0]).toMatchObject({ ultimaDecision: null, produccion: { por: "JAIME" } });
  });
  it("sin rutas devuelve error y no registra el planteamiento como guardado", async () => {
    preparar();
    vi.stubEnv("RUTA_PLANTEAMIENTOS", "");
    vi.stubEnv("RUTA_OFICINA_TECNICA", "");
    const respuesta = await POST(request(), ctx());
    expect(respuesta.status).toBe(500);
    expect((await respuesta.json()).error).toContain("Deben configurarse");
    expect(mocks.guardarEstado).not.toHaveBeenCalled();
  });
  it("sin revisor no genera ni archiva el PDF", async () => {
    preparar();
    const respuesta = await POST(request(""), ctx());
    expect(respuesta.status).toBe(400);
    expect(renderToBuffer).not.toHaveBeenCalled();
    expect(mocks.guardarEstado).not.toHaveBeenCalled();
  });
});

describe("vista previa desde Revisión", () => {
  it.each(["", "JAIME"])("genera el PDF con revisor %j sin archivar ni cambiar el estado", async por => {
    preparar();
    vi.stubEnv("RUTA_PLANTEAMIENTOS", "");
    vi.stubEnv("RUTA_OFICINA_TECNICA", "");
    const respuesta = await PREVIEW(request(por), ctx());
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("Content-Type")).toBe("application/pdf");
    expect(respuesta.headers.get("Content-Disposition")).toBe('inline; filename="AR2603632-10.pdf"');
    expect(respuesta.headers.get("X-Pdf-Destinos")).toBe("0");
    expect(vi.mocked(renderToBuffer).mock.calls[0][0].props).toMatchObject({ revisor: por });
    expect(guardarPdfDuplicado).not.toHaveBeenCalled();
    expect(mocks.guardarEstado).not.toHaveBeenCalled();
  });
  it("rechaza un pedido sin líneas sin generar PDF", async () => {
    preparar();
    mocks.list.mockResolvedValue([]);
    const respuesta = await PREVIEW(request(), ctx());
    expect(respuesta.status).toBe(404);
    expect(renderToBuffer).not.toHaveBeenCalled();
    expect(mocks.guardarEstado).not.toHaveBeenCalled();
  });
});
