import { describe, expect, it } from "vitest";
import { hojaLona, textoPanos, tituloPagina } from "@/lib/pdf/datos-hoja";
import { calcLona, type LonaInput } from "@/lib/calc/lona";
import { DEFAULT_PARAMS } from "@/lib/calc/params";
import { emptyLona } from "@/components/workspace/entradas-vacias";

describe("textos sueltos de la hoja", () => {
  it("concuerda el plural de los paños con la cantidad", () => {
    expect(textoPanos(1, 160, 124.5)).toBe("1 PAÑO DE 160 × 124,5");
    expect(textoPanos(2, 160, 124.5)).toBe("2 PAÑOS DE 160 × 124,5");
  });

  it("numera la página solo cuando el pedido tiene más de una", () => {
    expect(tituloPagina("lona", 0, 1)).toBe("REMOLQUE");
    expect(tituloPagina("lona", 0, 3)).toBe("REMOLQUE · 1 DE 3");
    expect(tituloPagina("baqueton", 1, 3)).toBe("BAQUETÓN · 2 DE 3");
    expect(tituloPagina("baqueton", 0, 1)).toBe("BAQUETÓN");
  });
});

const hojaDeLona = (extra: Partial<LonaInput> = {}) => {
  const input: LonaInput = {
    ...emptyLona(),
    cantidad: 1, largo: 300, ancho: 157, altoDelante: 120, altoAtras: 0,
    tipoPerfil: "TIPO 05", radioEsquina: 8, contorno: 391,
    recogeDelante: "NO", recogeAtras: "GOMA",
    ventana: true, ventanaAncho: 148, ventanaAlto: 35, rotulacion: true,
    modoOllaos: "REPARTIDOS", material: "LONA ALPHA 1L 580", observaciones: "SIN NADA",
    ...extra,
  };
  return hojaLona(input, calcLona(input, DEFAULT_PARAMS));
};

describe("datos de la lona en la hoja", () => {
  it("reparte la banda en paños, lona hecha y contorno", () => {
    const hoja = hojaDeLona();
    expect(hoja.banda.map((celda) => celda.titulo))
      .toEqual(["PAÑOS A CORTAR", "MEDIDA LONA HECHA", "CONTORNO DE CORTE"]);
    expect(hoja.banda[0].lineas).toHaveLength(3);
    expect(hoja.banda[1].lineas[0]).toBe("301 × 158");
  });

  it("solo desdobla alto y ancho cuando delante y detrás difieren", () => {
    expect(hojaDeLona().banda[1].lineas[1]).toBe("ALTO 120");
    expect(hojaDeLona().banda[1].notas).toEqual([]);

    const sesgado = hojaDeLona({ altoAtras: 110, anchoAtras: 150 });
    expect(sesgado.banda[1].lineas[1]).toBe("ALTO 120 DEL. / 110 TRAS.");
    expect(sesgado.banda[1].notas).toEqual(["ANCHO 157 DEL. / 150 TRAS."]);
  });

  it("dice PENDIENTE cuando no hay contorno, y entonces no hay paño de contorno", () => {
    const hoja = hojaDeLona({ contorno: 0 });
    expect(hoja.banda[2].lineas).toEqual(["PENDIENTE"]);
    expect(hoja.banda[0].lineas).toHaveLength(2);
  });

  it("agrupa la forma y los acabados, y deja fuera el modo de ollaos", () => {
    const hoja = hojaDeLona();
    expect(hoja.grupos.map((grupo) => grupo.titulo)).toEqual(["FORMA", "ACABADOS"]);
    expect(hoja.grupos[0].datos[1].valores).toEqual(["RADIO ESQUINA 8 CM"]);
    const etiquetas = hoja.grupos.flatMap((grupo) => grupo.datos.map((dato) => dato.etiqueta));
    expect(etiquetas).not.toContain("OLLAOS");
  });

  it("saca los opcionales sin elegir como raya en vez de esconderlos", () => {
    const hoja = hojaDeLona({
      tipoPerfil: "", ventana: null, rotulacion: null, material: "", observaciones: "",
    });
    const acabados = hoja.grupos[1].datos;
    expect(acabados.find((dato) => dato.etiqueta === "VENTANA")!.valores).toEqual(["—"]);
    expect(acabados.find((dato) => dato.etiqueta === "ROTULACIÓN")!.valores).toEqual(["—"]);
    expect(hoja.grupos[0].datos[0].valores).toEqual(["—"]);
    expect(hoja.material).toBe("—");
    expect(hoja.observaciones).toBe("—");
  });

  it("da las medidas de la ventana cuando las hay y avisa cuando faltan", () => {
    expect(hojaDeLona().grupos[1].datos[2].valores).toEqual(["SÍ · 148 × 35 CM"]);
    expect(hojaDeLona({ ventanaAncho: 0, ventanaAlto: 0 }).grupos[1].datos[2].valores)
      .toEqual(["SÍ · MEDIDAS PENDIENTES"]);
    expect(hojaDeLona({ ventana: false }).grupos[1].datos[2].valores).toEqual(["NO"]);
  });
});
