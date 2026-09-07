import { describe, expect, it, vi } from "vitest";
import { pasarAProduccion, type DependenciasProduccion } from "@/lib/pedidos/pasar-a-produccion";
import {
  decidido, guardadoParaRevision, producido, type EstadoPedido,
} from "@/lib/pedidos/estado-pedido";

const enRevision = (): EstadoPedido => guardadoParaRevision(null, {
  numeroPedido: "AR.26.0123", por: "IVAN", en: "2026-09-01T08:00:00.000Z",
});

const aprobado = (): EstadoPedido => {
  const decision = decidido(enRevision(), {
    estado: "APROBADO", por: "JAIME", en: "2026-09-02T08:00:00.000Z",
  });
  if (!decision.ok) throw new Error("debería haber aprobado");
  return decision.estado;
};

const yaProducido = (): EstadoPedido => {
  const paso = producido(aprobado(), {
    numeroPedido: "AR.26.0123", por: "ADRIAN", en: "2026-09-03T08:00:00.000Z",
    nombrePdf: "AR.26.0123-10.pdf", rutas: ["/a/x.pdf"],
  });
  if (!paso.ok) throw new Error("debería haber producido");
  return paso.estado;
};

const deps = (
  estado: EstadoPedido | null, extra: Partial<DependenciasProduccion> = {},
): DependenciasProduccion => ({
  leerEstado: async () => estado,
  guardarEstado: async (nuevo) => nuevo,
  generar: async () => ({
    bytes: new Uint8Array([37, 80, 68, 70]),
    nombre: "AR.26.0123-10.pdf",
    rutas: ["/a/x.pdf", "/b/x.pdf"],
  }),
  ahora: "2026-09-04T08:00:00.000Z",
  ...extra,
});

const datos = { numeroPedido: "AR.26.0123", por: "IVAN", sustituir: false };

describe("pasar un pedido a producción", () => {
  it("no genera nada mientras nadie haya mirado el pedido", async () => {
    const generar = vi.fn();
    const resultado = await pasarAProduccion(datos, deps(enRevision(), { generar }));
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.motivo).toContain("primera revisión");
    expect(generar).not.toHaveBeenCalled();
  });

  it("genera, archiva y anota quién lo hizo", async () => {
    const resultado = await pasarAProduccion(datos, deps(aprobado()));
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.estado.produccion).toEqual({
      por: "IVAN", en: "2026-09-04T08:00:00.000Z",
      nombrePdf: "AR.26.0123-10.pdf", rutas: ["/a/x.pdf", "/b/x.pdf"],
    });
    expect(resultado.nombre).toBe("AR.26.0123-10.pdf");
  });

  it("avisa antes de pisar un PDF ya archivado, y no genera nada", async () => {
    const generar = vi.fn();
    const resultado = await pasarAProduccion(datos, deps(yaProducido(), { generar }));
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.requiereConfirmacion).toBe(true);
      expect(resultado.motivo).toContain("ADRIAN");
      expect(resultado.motivo).toContain("3/9/2026");
    }
    expect(generar).not.toHaveBeenCalled();
  });

  it("con la confirmación sí lo sustituye", async () => {
    const resultado = await pasarAProduccion(
      { ...datos, sustituir: true }, deps(yaProducido()),
    );
    expect(resultado.ok).toBe(true);
    if (resultado.ok) expect(resultado.estado.produccion?.por).toBe("IVAN");
  });

  it("si el archivado falla, el pedido no queda marcado como producido", async () => {
    const guardarEstado = vi.fn(async (estado: EstadoPedido) => estado);
    await expect(pasarAProduccion(datos, deps(aprobado(), {
      guardarEstado,
      generar: async () => { throw new Error("la unidad de red no contesta"); },
    }))).rejects.toThrow("no contesta");
    expect(guardarEstado).not.toHaveBeenCalled();
  });

  it("un pedido histórico se puede producir sin haber pasado por aquí nunca", async () => {
    const resultado = await pasarAProduccion(datos, deps(null));
    expect(resultado.ok).toBe(true);
  });
});
