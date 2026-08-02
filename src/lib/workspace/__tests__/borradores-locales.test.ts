import { describe, expect, it } from "vitest";
import { emptyLona } from "@/components/workspace/entradas-vacias";
import type { LineaPedido } from "@/lib/workspace/lineas";
import {
  claveBorradores, guardarBorradores, leerBorradores, limpiarBorradores,
} from "@/lib/workspace/borradores-locales";

/** `Storage` de mentira: el módulo recibe el almacén, así que no hace falta navegador. */
function almacenFalso(inicial: Record<string, string> = {}, fallaAlEscribir = false): Storage {
  const datos = new Map(Object.entries(inicial));
  return {
    get length() { return datos.size; },
    clear: () => datos.clear(),
    getItem: (clave: string) => datos.get(clave) ?? null,
    key: (indice: number) => [...datos.keys()][indice] ?? null,
    removeItem: (clave: string) => { datos.delete(clave); },
    setItem: (clave: string, valor: string) => {
      if (fallaAlEscribir) throw new DOMException("QuotaExceededError");
      datos.set(clave, valor);
    },
  };
}

const linea: LineaPedido = { version: "10", tipo: "lona", input: emptyLona() };

describe("claveBorradores", () => {
  it("normaliza el número, para que AR.26.03583 y AR2603583 sean el mismo pedido", () => {
    expect(claveBorradores("AR.26.03583")).toBe(claveBorradores("AR2603583"));
  });
});

describe("ida y vuelta", () => {
  it("devuelve las líneas que se guardaron", () => {
    const almacen = almacenFalso();
    expect(guardarBorradores(almacen, "AR2603583", [linea])).toBe(true);
    expect(leerBorradores(almacen, "AR2603583")).toEqual([linea]);
  });

  it("cada pedido tiene su propia lista", () => {
    const almacen = almacenFalso();
    guardarBorradores(almacen, "AR2603583", [linea]);
    expect(leerBorradores(almacen, "AR2600001")).toEqual([]);
  });

  it("guardar una lista vacía retira la entrada en vez de dejar un rastro", () => {
    const almacen = almacenFalso();
    guardarBorradores(almacen, "AR2603583", [linea]);
    guardarBorradores(almacen, "AR2603583", []);
    expect(almacen.getItem(claveBorradores("AR2603583"))).toBeNull();
  });
});

describe("cuando el almacén no colabora", () => {
  it("sin almacén no revienta y no hay nada que leer", () => {
    expect(leerBorradores(null, "AR2603583")).toEqual([]);
    expect(guardarBorradores(null, "AR2603583", [linea])).toBe(false);
  });

  it("avisa de que no pudo guardar en vez de fingir que sí", () => {
    // El aviso importa: si esto falla, el trabajo solo vive en memoria.
    expect(guardarBorradores(almacenFalso({}, true), "AR2603583", [linea])).toBe(false);
  });

  it("un contenido corrupto se ignora como si no hubiera nada", () => {
    const almacen = almacenFalso({ [claveBorradores("AR2603583")]: "{ esto no es json" });
    expect(leerBorradores(almacen, "AR2603583")).toEqual([]);
  });

  it("un contenido que no es una lista de líneas tampoco cuela", () => {
    const almacen = almacenFalso({ [claveBorradores("AR2603583")]: '{"version":"10"}' });
    expect(leerBorradores(almacen, "AR2603583")).toEqual([]);
  });

  it("descarta las entradas de la lista que no parecen líneas", () => {
    const almacen = almacenFalso({
      [claveBorradores("AR2603583")]: JSON.stringify([linea, { version: "11" }, null]),
    });
    expect(leerBorradores(almacen, "AR2603583")).toEqual([linea]);
  });
});

describe("limpiarBorradores", () => {
  it("borra solo los de ese pedido", () => {
    const almacen = almacenFalso();
    guardarBorradores(almacen, "AR2603583", [linea]);
    guardarBorradores(almacen, "AR2600001", [linea]);
    limpiarBorradores(almacen, "AR2603583");
    expect(leerBorradores(almacen, "AR2603583")).toEqual([]);
    expect(leerBorradores(almacen, "AR2600001")).toEqual([linea]);
  });

  it("sin almacén no revienta", () => {
    expect(() => limpiarBorradores(null, "AR2603583")).not.toThrow();
  });
});
