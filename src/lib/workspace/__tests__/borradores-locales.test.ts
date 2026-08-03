import { describe, expect, it } from "vitest";
import { emptyLona } from "@/components/workspace/entradas-vacias";
import type { LineaPedido } from "@/lib/workspace/lineas";
import {
  claveBorradores, guardarBorradores, leerBorradores, limpiarBorradores,
} from "@/lib/workspace/borradores-locales";

/**
 * `Storage` de mentira: el módulo recibe el almacén, así que no hace falta
 * navegador. `maxEntradas` imita la cuota: escribir una clave nueva cuando ya
 * no cabe lanza, igual que hace el navegador de verdad. `noSeDejaBorrar` imita
 * la otra cara: una clave cuyo borrado revienta.
 */
function almacenFalso(
  inicial: Record<string, string> = {},
  { fallaAlEscribir = false, maxEntradas = Infinity, noSeDejaBorrar = "" } = {},
): Storage {
  const datos = new Map(Object.entries(inicial));
  return {
    get length() { return datos.size; },
    clear: () => datos.clear(),
    getItem: (clave: string) => datos.get(clave) ?? null,
    key: (indice: number) => [...datos.keys()][indice] ?? null,
    removeItem: (clave: string) => {
      if (noSeDejaBorrar && clave === noSeDejaBorrar) {
        throw new DOMException("SecurityError");
      }
      datos.delete(clave);
    },
    setItem: (clave: string, valor: string) => {
      if (fallaAlEscribir) throw new DOMException("QuotaExceededError");
      if (!datos.has(clave) && datos.size >= maxEntradas) {
        throw new DOMException("QuotaExceededError");
      }
      datos.set(clave, valor);
    },
  };
}

const linea: LineaPedido = { version: "10", tipo: "lona", input: emptyLona() };
const AHORA = "2026-08-03T10:00:00.000Z";

describe("claveBorradores", () => {
  it("normaliza el número, para que AR.26.03583 y AR2603583 sean el mismo pedido", () => {
    expect(claveBorradores("AR.26.03583")).toBe(claveBorradores("AR2603583"));
  });
});

describe("ida y vuelta", () => {
  it("devuelve las líneas que se guardaron", () => {
    const almacen = almacenFalso();
    expect(guardarBorradores(almacen, "AR2603583", [linea], null, AHORA)).toBe(true);
    expect(leerBorradores(almacen, "AR2603583")).toEqual({ lineas: [linea], versionActiva: null });
  });

  it("conserva la línea que se estaba editando, no se vuelve a la primera", () => {
    const almacen = almacenFalso();
    const otra: LineaPedido = { ...linea, version: "13" };
    guardarBorradores(almacen, "AR2603583", [linea, otra], "13", AHORA);
    expect(leerBorradores(almacen, "AR2603583")).toEqual({
      lineas: [linea, otra], versionActiva: "13",
    });
  });

  it("sella el guardado con la fecha que recibe, sin mirar el reloj", () => {
    const almacen = almacenFalso();
    guardarBorradores(almacen, "AR2603583", [linea], null, AHORA);
    const crudo = JSON.parse(almacen.getItem(claveBorradores("AR2603583")) ?? "") as {
      guardadoEn: string;
    };
    expect(crudo.guardadoEn).toBe(AHORA);
  });

  it("cada pedido tiene su propia lista", () => {
    const almacen = almacenFalso();
    guardarBorradores(almacen, "AR2603583", [linea], null, AHORA);
    expect(leerBorradores(almacen, "AR2600001")).toEqual({ lineas: [], versionActiva: null });
  });

  it("guardar una lista vacía retira la entrada en vez de dejar un rastro", () => {
    const almacen = almacenFalso();
    guardarBorradores(almacen, "AR2603583", [linea], null, AHORA);
    guardarBorradores(almacen, "AR2603583", [], null, AHORA);
    expect(almacen.getItem(claveBorradores("AR2603583"))).toBeNull();
  });
});

describe("cuando el almacén no colabora", () => {
  it("sin almacén no revienta y no hay nada que leer", () => {
    expect(leerBorradores(null, "AR2603583")).toEqual({ lineas: [], versionActiva: null });
    expect(guardarBorradores(null, "AR2603583", [linea], null, AHORA)).toBe(false);
  });

  it("avisa de que no pudo guardar en vez de fingir que sí", () => {
    // El aviso importa: si esto falla, el trabajo solo vive en memoria.
    const almacen = almacenFalso({}, { fallaAlEscribir: true });
    expect(guardarBorradores(almacen, "AR2603583", [linea], null, AHORA)).toBe(false);
  });

  it("un contenido corrupto se ignora como si no hubiera nada", () => {
    const almacen = almacenFalso({ [claveBorradores("AR2603583")]: "{ esto no es json" });
    expect(leerBorradores(almacen, "AR2603583")).toEqual({ lineas: [], versionActiva: null });
  });

  it("un contenido que no es una lista de líneas tampoco cuela", () => {
    const almacen = almacenFalso({ [claveBorradores("AR2603583")]: '{"version":"10"}' });
    expect(leerBorradores(almacen, "AR2603583")).toEqual({ lineas: [], versionActiva: null });
  });

  it("lee el formato anterior, el array pelado sin cabecera", () => {
    const almacen = almacenFalso({
      [claveBorradores("AR2603583")]: JSON.stringify([linea]),
    });
    expect(leerBorradores(almacen, "AR2603583")).toEqual({ lineas: [linea], versionActiva: null });
  });

  it("descarta las entradas de la lista que no parecen líneas", () => {
    const almacen = almacenFalso({
      [claveBorradores("AR2603583")]: JSON.stringify({
        guardadoEn: AHORA,
        versionActiva: "10",
        lineas: [linea, { version: "11" }, null],
      }),
    });
    expect(leerBorradores(almacen, "AR2603583")).toEqual({
      lineas: [linea], versionActiva: "10",
    });
  });
});

describe("cuando se agota la cuota", () => {
  const guardado = (guardadoEn: string) =>
    JSON.stringify({ guardadoEn, versionActiva: null, lineas: [linea] });

  it("hace sitio con el borrador más antiguo de otro pedido y reintenta", () => {
    // El más reciente va primero: lo que decide es la fecha, no el orden.
    const almacen = almacenFalso({
      [claveBorradores("AR2600002")]: guardado("2026-08-01T00:00:00.000Z"),
      [claveBorradores("AR2600001")]: guardado("2026-07-01T00:00:00.000Z"),
    }, { maxEntradas: 2 });
    expect(guardarBorradores(almacen, "AR2603583", [linea], "10", AHORA)).toBe(true);
    expect(leerBorradores(almacen, "AR2603583")).toEqual({ lineas: [linea], versionActiva: "10" });
    // Purga solo lo necesario: el más reciente de los ajenos sigue ahí.
    expect(almacen.getItem(claveBorradores("AR2600001"))).toBeNull();
    expect(leerBorradores(almacen, "AR2600002").lineas).toEqual([linea]);
  });

  it("el borrador sin fecha legible cae antes que uno fechado", () => {
    const almacen = almacenFalso({
      // Formato anterior: sin `guardadoEn`, así que cuenta como el más viejo.
      [claveBorradores("AR2600001")]: JSON.stringify([linea]),
      [claveBorradores("AR2600002")]: guardado("2026-01-01T00:00:00.000Z"),
    }, { maxEntradas: 2 });
    expect(guardarBorradores(almacen, "AR2603583", [linea], null, AHORA)).toBe(true);
    expect(almacen.getItem(claveBorradores("AR2600001"))).toBeNull();
    expect(leerBorradores(almacen, "AR2600002").lineas).toEqual([linea]);
  });

  it("solo sacrifica borradores: lo que no lleva el prefijo no se toca", () => {
    // La propiedad que impide que hacer sitio destruya datos de otro.
    const almacen = almacenFalso({
      "tgm:parametros": "no soy un borrador",
      [claveBorradores("AR2600001")]: guardado("2026-07-01T00:00:00.000Z"),
    }, { maxEntradas: 2 });
    expect(guardarBorradores(almacen, "AR2603583", [linea], null, AHORA)).toBe(true);
    expect(almacen.getItem("tgm:parametros")).toBe("no soy un borrador");
    expect(almacen.getItem(claveBorradores("AR2600001"))).toBeNull();
  });

  it("sacrifica más de un borrador si con uno no basta", () => {
    const almacen = almacenFalso({
      [claveBorradores("AR2600001")]: guardado("2026-05-01T00:00:00.000Z"),
      [claveBorradores("AR2600002")]: guardado("2026-06-01T00:00:00.000Z"),
      [claveBorradores("AR2600003")]: guardado("2026-07-01T00:00:00.000Z"),
    }, { maxEntradas: 2 });
    expect(guardarBorradores(almacen, "AR2603583", [linea], null, AHORA)).toBe(true);
    // Caen los dos más antiguos, de uno en uno; el más reciente sobrevive.
    expect(almacen.getItem(claveBorradores("AR2600001"))).toBeNull();
    expect(almacen.getItem(claveBorradores("AR2600002"))).toBeNull();
    expect(leerBorradores(almacen, "AR2600003").lineas).toEqual([linea]);
  });

  it("un borrado que revienta no aborta la purga: sigue con el siguiente", () => {
    const almacen = almacenFalso({
      [claveBorradores("AR2600001")]: guardado("2026-05-01T00:00:00.000Z"),
      [claveBorradores("AR2600002")]: guardado("2026-06-01T00:00:00.000Z"),
    }, { maxEntradas: 2, noSeDejaBorrar: claveBorradores("AR2600001") });
    expect(guardarBorradores(almacen, "AR2603583", [linea], null, AHORA)).toBe(true);
    // El más antiguo no se dejó borrar, así que pagó el siguiente.
    expect(leerBorradores(almacen, "AR2600001").lineas).toEqual([linea]);
    expect(almacen.getItem(claveBorradores("AR2600002"))).toBeNull();
  });

  it("si ni vaciando los demás cabe, lo dice en vez de fingir que guardó", () => {
    const almacen = almacenFalso(
      { [claveBorradores("AR2600001")]: guardado("2026-07-01T00:00:00.000Z") },
      { fallaAlEscribir: true },
    );
    expect(guardarBorradores(almacen, "AR2603583", [linea], null, AHORA)).toBe(false);
  });

  it("nunca sacrifica el borrador del pedido que se está guardando", () => {
    const almacen = almacenFalso(
      { [claveBorradores("AR2603583")]: guardado("2026-07-01T00:00:00.000Z") },
      { fallaAlEscribir: true },
    );
    const otra: LineaPedido = { ...linea, version: "11" };
    expect(guardarBorradores(almacen, "AR2603583", [linea, otra], "11", AHORA)).toBe(false);
    // Lo anterior sigue ahí: se pierde lo nuevo, no lo que ya estaba a salvo.
    expect(leerBorradores(almacen, "AR2603583")).toEqual({ lineas: [linea], versionActiva: null });
  });
});

describe("limpiarBorradores", () => {
  it("borra solo los de ese pedido", () => {
    const almacen = almacenFalso();
    guardarBorradores(almacen, "AR2603583", [linea], null, AHORA);
    guardarBorradores(almacen, "AR2600001", [linea], null, AHORA);
    limpiarBorradores(almacen, "AR2603583");
    expect(leerBorradores(almacen, "AR2603583").lineas).toEqual([]);
    expect(leerBorradores(almacen, "AR2600001").lineas).toEqual([linea]);
  });

  it("sin almacén no revienta", () => {
    expect(() => limpiarBorradores(null, "AR2603583")).not.toThrow();
  });
});
