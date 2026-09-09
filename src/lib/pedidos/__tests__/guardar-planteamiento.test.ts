import { describe, expect, it, vi } from "vitest";
import { guardarPlanteamiento, type DependenciasGuardado } from "@/lib/pedidos/guardar-planteamiento";
import { guardadoParaRevision, type EstadoPedido } from "@/lib/pedidos/estado-pedido";

const pendiente = () => guardadoParaRevision(null, { numeroPedido: "ar.26.0123", por: "IVAN", en: "2026-09-01T08:00:00Z" });
const datos = { numeroPedido: "ar.26.0123", por: "JAIME", sustituir: false };
const deps = (estado: EstadoPedido | null = pendiente(), extra: Partial<DependenciasGuardado> = {}): DependenciasGuardado => ({
  leerEstado: async () => estado,
  guardarEstado: async e => e,
  generar: async () => ({ bytes: new Uint8Array([37, 80, 68, 70]), nombre: "AR260123-10.pdf", rutas: ["/general/AR260123-10.pdf", "/oficina/2026/AR260123.pdf"] }),
  ahora: "2026-09-02T08:00:00Z",
  ...extra,
});
describe("guardar el planteamiento revisado", () => {
  it("guarda sin aprobación previa, registra al revisor y no inventa una decisión", async () => {
    const r = await guardarPlanteamiento(datos, deps());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.estado.produccion?.por).toBe("JAIME");
    expect(r.estado.produccion?.rutas).toHaveLength(2);
    expect(r.estado.numeroPedido).toBe("AR260123");
    expect(r.estado.ultimaDecision).toBeNull();
    expect(r.estado.revision.estado).toBe("EN_REVISION");
  });
  it("exige revisor antes de generar", async () => {
    const generar = vi.fn();
    expect((await guardarPlanteamiento({ ...datos, por: " " }, deps(null, { generar }))).ok).toBe(false);
    expect(generar).not.toHaveBeenCalled();
  });
  it.each([{ rutas: [] }, { rutas: ["/solo-una.pdf"] }])("no registra un guardado si faltan copias: %j", async ({ rutas }) => {
    const guardarEstado = vi.fn();
    await expect(guardarPlanteamiento(datos, deps(null, {
      guardarEstado, generar: async () => ({ bytes: new Uint8Array(), nombre: "AR260123-10.pdf", rutas }),
    }))).rejects.toThrow("dos carpetas");
    expect(guardarEstado).not.toHaveBeenCalled();
  });
  it("conserva el estado cuando falla la red", async () => {
    const guardarEstado = vi.fn();
    await expect(guardarPlanteamiento(datos, deps(null, {
      guardarEstado, generar: async () => { throw new Error("red no disponible"); },
    }))).rejects.toThrow("red no disponible");
    expect(guardarEstado).not.toHaveBeenCalled();
  });
  it("pide confirmación antes de sustituir y permite reintentar", async () => {
    const primero = await guardarPlanteamiento(datos, deps());
    if (!primero.ok) throw new Error();
    const generar = vi.fn();
    const aviso = await guardarPlanteamiento(datos, deps(primero.estado, { generar }));
    expect(aviso).toMatchObject({ ok: false, requiereConfirmacion: true });
    expect(generar).not.toHaveBeenCalled();
    expect((await guardarPlanteamiento({ ...datos, sustituir: true }, deps(primero.estado))).ok).toBe(true);
  });
  it("un registro antiguo sin rutas no obliga a sustituir un PDF inexistente", async () => {
    const estado = { ...pendiente(), produccion: { por: "IVAN", en: "2026-09-01", nombrePdf: "x.pdf", rutas: [] } };
    expect((await guardarPlanteamiento(datos, deps(estado))).ok).toBe(true);
  });
});
