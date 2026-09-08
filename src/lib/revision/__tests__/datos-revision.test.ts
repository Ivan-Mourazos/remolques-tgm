import { describe, expect, it } from "vitest";
import { seccionesRevision } from "@/lib/revision/datos-revision";
import { emptyLona, emptyBaqueton } from "@/components/workspace/entradas-vacias";
import type { LonaInput } from "@/lib/calc/lona";
import type { BaquetonInput } from "@/lib/calc/baqueton";

const lona = (extra: Partial<LonaInput> = {}) => seccionesRevision({
  tipo: "lona",
  input: {
    ...emptyLona(),
    cantidad: 1, largo: 300, ancho: 157, altoDelante: 120,
    tipoPerfil: "TIPO 05", radioEsquina: 8, contorno: 391,
    recogeDelante: "NO", recogeAtras: "GOMA", bastillaEnfundar: false,
    ventana: true, ventanaAncho: 148, ventanaAlto: 35, rotulacion: true,
    modoOllaos: "REPARTIDOS", material: "LONA ALPHA", observaciones: "NADA",
    ...extra,
  },
});

const baqueton = (extra: Partial<BaquetonInput> = {}) => seccionesRevision({
  tipo: "baqueton",
  input: {
    ...emptyBaqueton(),
    cantidad: 2, largo: 300, ancho: 157, baqueton: 12,
    clienteEspecifico: "GENERAL", rotulacion: false,
    modoOllaos: "REPARTIDOS", material: "LONA ALPHA", observaciones: "",
    ...extra,
  },
});

/** Busca un campo por etiqueta en todas las secciones. */
const valor = (secciones: ReturnType<typeof seccionesRevision>, etiqueta: string) =>
  secciones.flatMap((s) => s.campos).find((c) => c.etiqueta === etiqueta)?.valor;

const etiquetas = (secciones: ReturnType<typeof seccionesRevision>) =>
  secciones.flatMap((s) => s.campos.map((c) => c.etiqueta));

describe("secciones de revisión de una lona", () => {
  it("agrupa como el formulario", () => {
    expect(lona().map((s) => s.titulo))
      .toEqual(["Pedido", "Medidas", "Perfil", "Acabados", "Material y observaciones"]);
  });

  it("saca del perfil solo lo que ese tipo usa", () => {
    const t04 = lona({
      tipoPerfil: "TIPO 04", chaflan: 25, radioChaflanAbajo: 7, radioChaflanArriba: 7.5,
      radioEsquina: 0,
    });
    expect(valor(t04, "Chaflán")).toBe("25");
    expect(etiquetas(t04)).not.toContain("Radio de cumbrera");
    expect(etiquetas(t04)).not.toContain("Radio de esquina");

    const t03 = lona({ tipoPerfil: "TIPO 03", aguas: 35, radioCumbrera: 20, radioHombro: 18 });
    expect(valor(t03, "Radio de cumbrera")).toBe("20");
    expect(etiquetas(t03)).not.toContain("Chaflán");
  });

  it("enseña los opcionales vacíos como raya en vez de esconderlos", () => {
    const vacia = lona({
      anchoAtras: 0, altoAtras: 0, ventana: null, rotulacion: null,
      bastillaEnfundar: null, recogeDelante: "", recogeAtras: "",
      material: "", observaciones: "",
    });
    expect(valor(vacia, "Ancho detrás")).toBe("—");
    expect(valor(vacia, "Alto detrás")).toBe("—");
    expect(valor(vacia, "Ventana")).toBe("—");
    expect(valor(vacia, "Rotulación")).toBe("—");
    expect(valor(vacia, "Bastilla de enfundar")).toBe("—");
    expect(valor(vacia, "Recoge delante")).toBe("—");
    expect(valor(vacia, "Material")).toBe("—");
    expect(valor(vacia, "Observaciones")).toBe("—");
  });

  it("omite el revisor de cada remolque porque se elige en el pedido", () => {
    const cabecera = { ...emptyLona().cabecera, revision: "ADRIAN" };
    expect(etiquetas(lona({ cabecera }))).not.toContain("Revisión");
    expect(etiquetas(baqueton({ cabecera }))).not.toContain("Revisión");
  });

  it("da la ventana con sus medidas cuando las tiene", () => {
    expect(valor(lona(), "Ventana")).toBe("Sí · 148 × 35 cm");
    expect(valor(lona({ ventana: false }), "Ventana")).toBe("No");
    expect(valor(lona({ ventanaAncho: 0, ventanaAlto: 0 }), "Ventana")).toBe("Sí · medidas pendientes");
  });
});

describe("secciones de revisión de un baquetón", () => {
  it("no arrastra ni un campo de lona", () => {
    const secciones = baqueton();
    expect(secciones.map((s) => s.titulo))
      .toEqual(["Pedido", "Medidas", "Material y observaciones"]);
    const todas = etiquetas(secciones);
    expect(todas).toContain("Baquetón");
    expect(todas).toContain("Cliente específico");
    expect(todas).not.toContain("Perfil");
    expect(todas).not.toContain("Ventana");
    expect(todas).not.toContain("Recoge delante");
    expect(todas).not.toContain("Contorno");
  });
});
