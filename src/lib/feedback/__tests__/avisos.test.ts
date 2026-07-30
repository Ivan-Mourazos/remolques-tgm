import { describe, expect, it } from "vitest";
import { agregarAviso, avisoDuplicado, descartarAviso } from "@/lib/feedback/avisos";
import { TOPE_AVISOS, type Aviso, type Severidad } from "@/lib/feedback/tipos";

const aviso = (id: string, severidad: Severidad, texto: string): Aviso => ({ id, severidad, texto });

describe("agregarAviso", () => {
  it("apila en orden de llegada", () => {
    const pila = agregarAviso(agregarAviso([], aviso("1", "info", "Uno")), aviso("2", "exito", "Dos"));
    expect(pila.map((a) => a.id)).toEqual(["1", "2"]);
  });

  it("no apila dos veces el mismo texto con la misma severidad", () => {
    const pila = agregarAviso(agregarAviso([], aviso("1", "error", "Falló")), aviso("2", "error", "Falló"));
    expect(pila).toHaveLength(1);
    expect(pila[0].id).toBe("1");
  });

  it("sí apila el mismo texto con severidad distinta", () => {
    const pila = agregarAviso(agregarAviso([], aviso("1", "info", "Listo")), aviso("2", "exito", "Listo"));
    expect(pila).toHaveLength(2);
  });

  it("al desbordar el tope desaloja el más antiguo que no sea error", () => {
    let pila: Aviso[] = [];
    pila = agregarAviso(pila, aviso("e1", "error", "Error viejo"));
    pila = agregarAviso(pila, aviso("i1", "info", "Info vieja"));
    pila = agregarAviso(pila, aviso("i2", "info", "Info nueva"));
    pila = agregarAviso(pila, aviso("x1", "exito", "Éxito"));
    expect(pila).toHaveLength(TOPE_AVISOS);
    pila = agregarAviso(pila, aviso("i3", "info", "La que desborda"));
    expect(pila).toHaveLength(TOPE_AVISOS);
    // El error sobrevive; se va la info más antigua.
    expect(pila.map((a) => a.id)).toEqual(["e1", "i2", "x1", "i3"]);
  });

  it("solo desaloja un error cuando no queda nada más", () => {
    let pila: Aviso[] = [];
    for (const n of [1, 2, 3, 4]) pila = agregarAviso(pila, aviso(`e${n}`, "error", `Error ${n}`));
    pila = agregarAviso(pila, aviso("e5", "error", "Error 5"));
    expect(pila.map((a) => a.id)).toEqual(["e2", "e3", "e4", "e5"]);
  });
});

describe("descartarAviso", () => {
  it("quita solo el id indicado", () => {
    const pila = [aviso("1", "info", "Uno"), aviso("2", "error", "Dos")];
    expect(descartarAviso(pila, "1").map((a) => a.id)).toEqual(["2"]);
  });

  it("no falla con un id que no está", () => {
    expect(descartarAviso([aviso("1", "info", "Uno")], "9")).toHaveLength(1);
  });
});

describe("avisoDuplicado", () => {
  it("encuentra el aviso equivalente para poder reiniciar su temporizador", () => {
    const pila = [aviso("1", "exito", "Guardado")];
    expect(avisoDuplicado(pila, "exito", "Guardado")?.id).toBe("1");
    expect(avisoDuplicado(pila, "info", "Guardado")).toBeUndefined();
  });
});
