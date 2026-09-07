import { describe, expect, it } from "vitest";
import {
  decidido, guardadoParaRevision, producido, type EstadoPedido,
} from "@/lib/pedidos/estado-pedido";

const enRevision = (): EstadoPedido => guardadoParaRevision(null, {
  numeroPedido: "AR.26.0123", por: "IVAN", en: "2026-09-01T08:00:00.000Z",
});

describe("guardar para revisión", () => {
  it("deja el pedido esperando a un compañero, con la clave normalizada", () => {
    const estado = enRevision();
    expect(estado.pedido).toBe("AR260123");
    expect(estado.numeroPedido).toBe("AR.26.0123");
    expect(estado.revision).toEqual({
      estado: "EN_REVISION", por: "IVAN", en: "2026-09-01T08:00:00.000Z",
    });
    expect(estado.ultimaDecision).toBeNull();
    expect(estado.produccion).toBeNull();
  });

  it("sobre un pedido ya producido lo devuelve a revisión sin borrar lo producido", () => {
    const aprobado = decidido(enRevision(), {
      estado: "APROBADO", por: "JAIME", en: "2026-09-02T08:00:00.000Z",
    });
    if (!aprobado.ok) throw new Error("debería haber aprobado");
    const producidoYa = producido(aprobado.estado, {
      numeroPedido: "AR.26.0123", por: "IVAN", en: "2026-09-03T08:00:00.000Z",
      nombrePdf: "AR.26.0123-10.pdf", rutas: ["/a/AR.26.0123-10.pdf"],
    });
    if (!producidoYa.ok) throw new Error("debería haber producido");

    const reabierto = guardadoParaRevision(producidoYa.estado, {
      numeroPedido: "AR.26.0123", por: "IVAN", en: "2026-09-04T08:00:00.000Z",
    });
    expect(reabierto.revision.estado).toBe("EN_REVISION");
    expect(reabierto.produccion?.nombrePdf).toBe("AR.26.0123-10.pdf");
    expect(reabierto.ultimaDecision?.estado).toBe("APROBADO");
  });
});

describe("aprobar y no aprobar", () => {
  it("aprueba desde EN_REVISION y deja constancia de quién y cuándo", () => {
    const resultado = decidido(enRevision(), {
      estado: "APROBADO", por: "JAIME", en: "2026-09-02T08:00:00.000Z",
    });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.estado.revision.estado).toBe("APROBADO");
    expect(resultado.estado.revision.por).toBe("JAIME");
    expect(resultado.estado.ultimaDecision).toEqual({
      estado: "APROBADO", por: "JAIME", en: "2026-09-02T08:00:00.000Z",
    });
  });

  it("no aprueba dos veces: sobre un pedido ya decidido se rechaza", () => {
    const aprobado = decidido(enRevision(), {
      estado: "APROBADO", por: "JAIME", en: "2026-09-02T08:00:00.000Z",
    });
    if (!aprobado.ok) throw new Error("debería haber aprobado");
    const otraVez = decidido(aprobado.estado, {
      estado: "NO_APROBADO", por: "ADRIAN", en: "2026-09-02T09:00:00.000Z",
    });
    expect(otraVez.ok).toBe(false);
    if (!otraVez.ok) expect(otraVez.motivo).toContain("ya");
  });

  it("no se puede decidir sobre un pedido sin registro", () => {
    const resultado = decidido(null, {
      estado: "APROBADO", por: "JAIME", en: "2026-09-02T08:00:00.000Z",
    });
    expect(resultado.ok).toBe(false);
  });
});

describe("pasar a producción", () => {
  const datos = {
    numeroPedido: "AR.26.0123", por: "IVAN", en: "2026-09-03T08:00:00.000Z",
    nombrePdf: "AR.26.0123-10.pdf", rutas: ["/a/x.pdf", "/b/x.pdf"],
  };

  it("se rechaza mientras nadie haya mirado el pedido nunca", () => {
    const resultado = producido(enRevision(), datos);
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.motivo).toContain("primera revisión");
  });

  it("vale desde aprobado y desde no aprobado", () => {
    for (const decision of ["APROBADO", "NO_APROBADO"] as const) {
      const decidida = decidido(enRevision(), {
        estado: decision, por: "JAIME", en: "2026-09-02T08:00:00.000Z",
      });
      if (!decidida.ok) throw new Error("debería haber decidido");
      const resultado = producido(decidida.estado, datos);
      expect(resultado.ok).toBe(true);
      if (resultado.ok) expect(resultado.estado.produccion?.rutas).toHaveLength(2);
    }
  });

  it("vale en un pedido devuelto a revisión que ya se miró una vez", () => {
    const noAprobado = decidido(enRevision(), {
      estado: "NO_APROBADO", por: "JAIME", en: "2026-09-02T08:00:00.000Z",
    });
    if (!noAprobado.ok) throw new Error("debería haber decidido");
    const devuelto = guardadoParaRevision(noAprobado.estado, {
      numeroPedido: "AR.26.0123", por: "IVAN", en: "2026-09-02T10:00:00.000Z",
    });
    expect(devuelto.revision.estado).toBe("EN_REVISION");
    expect(producido(devuelto, datos).ok).toBe(true);
  });

  it("vale en un pedido histórico, sin registro ninguno", () => {
    expect(producido(null, datos).ok).toBe(true);
  });
});
