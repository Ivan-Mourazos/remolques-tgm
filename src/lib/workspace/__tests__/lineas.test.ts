import { describe, expect, it } from "vitest";
import { emptyBaqueton, emptyLona } from "@/components/workspace/entradas-vacias";
import type { PlanteamientoRecord } from "@/lib/store/types";
import type { LonaInput } from "@/lib/calc/lona";
import {
  estadoLinea, fusionarLineas, lineasDesdeRegistros, nombreLinea, siguienteVersion,
  type LineaPedido,
} from "@/lib/workspace/lineas";

/** Una lona con todo decidido: la referencia de «lista». */
const lonaCompleta = (version: string): LonaInput => ({
  ...emptyLona(),
  cabecera: { ...emptyLona().cabecera, numeroPedido: "AR2603583", version, cliente: "CLIENTE" },
  largo: 600, ancho: 250, altoDelante: 220, contorno: 620, material: "PVC 580 AZUL",
  tipoPerfil: "TIPO 01", recogeDelante: "NO", recogeAtras: "NO",
  ventana: false, rotulacion: false, bastillaEnfundar: false, modoOllaos: "REPARTIDOS",
});

const linea = (version: string, cambios: Partial<LineaPedido> = {}): LineaPedido => ({
  version, tipo: "lona", input: lonaCompleta(version), ...cambios,
});

const registro = (id: string, version: string, createdAt: string): PlanteamientoRecord => ({
  id, tipo: "lona", numeroPedido: "AR2603583", version, cliente: "CLIENTE",
  input: lonaCompleta(version),
  result: {}, paramsSnapshot: {}, snapshotSvg: `<svg id="${id}"/>`,
  createdAt, updatedAt: createdAt,
} as unknown as PlanteamientoRecord);

describe("nombreLinea", () => {
  it("numera desde 1 aunque la versión empiece en 10", () => {
    expect(nombreLinea(linea("10"))).toBe("Remolque 1");
    expect(nombreLinea(linea("12"))).toBe("Remolque 3");
  });

  it("distingue el baquetón del remolque", () => {
    expect(nombreLinea({ version: "11", tipo: "baqueton", input: emptyBaqueton() })).toBe("Baquetón 2");
  });
});

describe("estadoLinea", () => {
  it("da por lista la que no tiene ningún error", () => {
    expect(estadoLinea(linea("10"))).toEqual({ lista: true, falta: null });
  });

  it("no da por lista una línea guardada solo porque tenga id", () => {
    // La base de datos contiene registros incompletos: se comprueban igual.
    const guardadaIncompleta = linea("10", {
      id: "abc",
      input: { ...lonaCompleta("10"), modoOllaos: "" },
    });
    expect(estadoLinea(guardadaIncompleta).lista).toBe(false);
  });

  it("dice qué falta, con el primer error", () => {
    const sinPerfil = linea("10", { input: { ...lonaCompleta("10"), tipoPerfil: "" } });
    expect(estadoLinea(sinPerfil).falta).toBe("Elige el tipo de perfil del remolque.");
  });
});

describe("lineasDesdeRegistros", () => {
  it("convierte cada registro en línea con su id y su dibujo, en orden de versión", () => {
    const lineas = lineasDesdeRegistros([
      registro("b", "11", "2026-07-20T11:00:00Z"),
      registro("a", "10", "2026-07-20T10:00:00Z"),
    ]);
    expect(lineas.map((l) => [l.version, l.id])).toEqual([["10", "a"], ["11", "b"]]);
    expect(lineas[0].snapshotSvg).toBe('<svg id="a"/>');
  });

  it("deduplica quedándose con el guardado más reciente de cada versión", () => {
    const viejo = registro("a", "10", "2026-07-20T10:00:00Z");
    const nuevo = { ...registro("c", "10", "2026-07-20T10:00:00Z"), updatedAt: "2026-07-21T10:00:00Z" };
    expect(lineasDesdeRegistros([viejo, nuevo]).map((l) => l.id)).toEqual(["c"]);
  });
});

describe("fusionarLineas", () => {
  it("el borrador manda sobre el registro guardado, pero hereda su id", () => {
    // Si el borrador perdiera el id se guardaría como registro nuevo y
    // aparecerían dos versiones iguales del mismo remolque.
    const guardadas = lineasDesdeRegistros([registro("a", "10", "2026-07-20T10:00:00Z")]);
    const borrador = linea("10", { input: { ...lonaCompleta("10"), largo: 999 } });
    const fusionadas = fusionarLineas(guardadas, [borrador]);
    expect(fusionadas).toHaveLength(1);
    expect((fusionadas[0].input as LonaInput).largo).toBe(999);
    expect(fusionadas[0].id).toBe("a");
  });

  it("conserva el dibujo guardado cuando el borrador no trae uno", () => {
    const guardadas = lineasDesdeRegistros([registro("a", "10", "2026-07-20T10:00:00Z")]);
    const fusionadas = fusionarLineas(guardadas, [linea("10")]);
    expect(fusionadas[0].snapshotSvg).toBe('<svg id="a"/>');
  });

  it("suma las líneas que solo existen en un lado, ordenadas por versión", () => {
    const guardadas = lineasDesdeRegistros([registro("a", "10", "2026-07-20T10:00:00Z")]);
    const fusionadas = fusionarLineas(guardadas, [linea("12"), linea("11")]);
    expect(fusionadas.map((l) => l.version)).toEqual(["10", "11", "12"]);
  });
});

describe("siguienteVersion", () => {
  it("arranca en 10 cuando el pedido está vacío", () => {
    expect(siguienteVersion([])).toBe("10");
  });

  it("sigue a la mayor, no al número de líneas", () => {
    // Tras eliminar la del medio, la siguiente no puede repetir una versión viva.
    expect(siguienteVersion([linea("10"), linea("12")])).toBe("13");
  });
});
