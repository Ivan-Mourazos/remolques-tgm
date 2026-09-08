import { describe, expect, it } from "vitest";
import { construirFicha } from "@/lib/revision/ficha-pedido";
import { guardadoParaRevision } from "@/lib/pedidos/estado-pedido";
import { calcLona, type LonaInput } from "@/lib/calc/lona";
import { calcBaqueton } from "@/lib/calc/baqueton";
import { DEFAULT_PARAMS } from "@/lib/calc/params";
import { emptyLona, emptyBaqueton } from "@/components/workspace/entradas-vacias";
import type { PlanteamientoRecord } from "@/lib/store/types";

const input = (): LonaInput => ({
  ...emptyLona(),
  cabecera: { ...emptyLona().cabecera, numeroPedido: "AR.26.0123", cliente: "TALLERES CAL" },
  cantidad: 1, largo: 300, ancho: 157, altoDelante: 120,
  tipoPerfil: "TIPO 05", radioEsquina: 8, contorno: 391,
  recogeDelante: "NO", recogeAtras: "GOMA", bastillaEnfundar: false,
  ventana: false, rotulacion: false, modoOllaos: "REPARTIDOS", material: "LONA ALPHA",
});

const registro = (version: string, updatedAt: string): PlanteamientoRecord => {
  const i = input();
  return {
    id: `r-${version}`, tipo: "lona", numeroPedido: "AR.26.0123", version,
    cliente: "TALLERES CAL", input: i, result: calcLona(i, DEFAULT_PARAMS),
    paramsSnapshot: DEFAULT_PARAMS, snapshotSvg: "<svg/>",
    createdAt: updatedAt, updatedAt,
  };
};

describe("la ficha de un pedido", () => {
  it("da una línea por remolque, con sus secciones y su dibujo guardado", () => {
    const ficha = construirFicha(
      guardadoParaRevision(null, {
        numeroPedido: "AR.26.0123", por: "IVAN", en: "2026-09-01T08:00:00.000Z",
      }),
      [registro("11", "2026-09-01T08:00:00.000Z"), registro("10", "2026-09-01T08:00:00.000Z")],
    );
    expect(ficha.numeroPedido).toBe("AR.26.0123");
    expect(ficha.cliente).toBe("TALLERES CAL");
    // En orden de remolque, no en el orden en que llegaron.
    expect(ficha.lineas.map((l) => l.version)).toEqual(["10", "11"]);
    expect(ficha.lineas[0].nombre).toBe("Remolque 1");
    expect(ficha.lineas[0].snapshotSvg).toBe("<svg/>");
    expect(ficha.lineas[0].secciones[0].titulo).toBe("Pedido");
  });

  it("lleva las medidas de corte como dato secundario", () => {
    const ficha = construirFicha(null, [registro("10", "2026-09-01T08:00:00.000Z")]);
    expect(ficha.lineas[0].corte.map((celda) => celda.titulo))
      .toEqual(["PAÑOS A CORTAR", "MEDIDA LONA HECHA", "CONTORNO DE CORTE"]);
  });

  it.each(["REPARTIDOS", "SEGUN SE INDICA"] as const)(
    "incluye el reparto guardado de la lona en modo %s sin recalcularlo",
    (modoOllaos) => {
      const rec = registro("10", "2026-09-01T08:00:00.000Z");
      rec.input.modoOllaos = modoOllaos;
      // Incluye el borde cero, lados distintos y más de doce posiciones.
      // El resultado guardado debe prevalecer sobre las entradas y parámetros.
      rec.result.reparto = {
        laterales: Array.from({ length: 14 }, (_, i) => i * 20),
        atras: [0, 42.5, 120], delante: [2.5, 60, 154.5],
      };
      const linea = construirFicha(null, [rec]).lineas[0];
      expect(linea.reparto).toEqual(rec.result.reparto);
      expect(linea.secciones.map((s) => s.titulo)).not.toContain("Ollaos");
    },
  );

  it.each(["REPARTIDOS", "SEGUN SE INDICA"] as const)(
    "incluye las posiciones del baquetón en modo %s",
    (modoOllaos) => {
      const i = {
        ...emptyBaqueton(), cantidad: 1, largo: 300, ancho: 157, baqueton: 12,
        modoOllaos, pasoOllaos: 38,
        ollaosManuales: { laterales: [0, 100, 200], atras: [2.5, 75], delante: [2.5] },
      };
      const rec = {
        ...registro("10", "2026-09-01T08:00:00.000Z"),
        tipo: "baqueton" as const, input: i, result: calcBaqueton(i, DEFAULT_PARAMS),
      };
      const reparto = construirFicha(null, [rec]).lineas[0].reparto;
      expect(reparto).toEqual(rec.result.reparto);
      expect(reparto.laterales.length).toBeGreaterThan(0);
    },
  );

  it("un pedido sin estado es un histórico y lo dice", () => {
    const ficha = construirFicha(null, [registro("10", "2026-09-01T08:00:00.000Z")]);
    expect(ficha.visible.situacion).toBe("HISTORICO");
    expect(ficha.estado).toBeNull();
  });
});
