import { describe, expect, it } from "vitest";
import { interpretarLineaRps, type FilaLineaRps } from "@/lib/rps/interpretar-linea";

const fila = (comment: string, extra: Partial<FilaLineaRps> = {}): FilaLineaRps => ({
  IDOrderLine: "LINEA-1",
  NumLine: 20,
  CodArticle: "LONAREMOLQUE",
  CodManufacturingOrder: "0230657",
  Quantity: 2,
  Description: "LONA REMOLQUE",
  Comment: comment,
  Rotulado: null,
  TipoRotulacion: null,
  TextoRotulacion: null,
  ...extra,
});

describe("interpretarLineaRps", () => {
  it("extrae una lona alta, cantidad, OF, ventana, recogida y material", () => {
    const linea = interpretarLineaRps(fila(
      "LONA REMOLQUE DE MEDIDAS 261 X 163 X 88 CM, CON SISTEMA DE RECOGIDA TRASERO Y VENTANA DELANTERA, FABRICADA EN PVC 580 G/M², COLOR GRIS 7037.",
    ));
    expect(linea).toMatchObject({
      tipoTrabajo: "lona", largo: 261, ancho: 163, alto: 88,
      cantidad: 2, ordenFabricacion: "0230657", ventana: true, recogidaAtras: true,
      requiereRevision: false,
      materialRps: { gramaje: 580, color: "GRIS 7037" },
    });
  });

  it("clasifica como baquetón cuando la tercera medida es de hasta 25 cm", () => {
    const linea = interpretarLineaRps(fila(
      "POR CONFECCION DE LONA REMOLQUE DE MEDIDAS 210 X 130 X 14 CM, EN PVC 580 GR/M² COLOR AZUL EUROPA.",
    ));
    expect(linea).toMatchObject({
      tipoTrabajo: "baqueton", largo: 210, ancho: 130, baqueton: 14, alto: null,
      materialRps: { gramaje: 580, color: "AZUL EUROPA" },
    });
  });

  it("mantiene alturas distintas y aguas separadas", () => {
    const linea = interpretarLineaRps(fila(
      "LONA REMOLQUE DE MEDIDAS 250 X 150 X 80 CM / 75 CM + 10 CM, COLOR ROJO.",
    ));
    expect(linea).toMatchObject({
      alto: null, altoDelante: 80, altoAtras: 75, aguas: 10, tipoTrabajo: "lona",
    });
  });

  it("devuelve null para una línea que no es de remolque", () => {
    expect(interpretarLineaRps(fila("OTRO ARTICULO", {
      CodArticle: "OTRO", Description: "SERVICIO", Comment: "SIN LONA",
    }))).toBeNull();
  });

  it("marca para revisión una descripción sin medidas interpretables", () => {
    expect(interpretarLineaRps(fila("CONFECCION SEGUN PATRON"))?.requiereRevision).toBe(true);
  });

  it("distingue rotulación positiva, negativa y no indicada", () => {
    expect(interpretarLineaRps(fila("MEDIDAS 200 X 120 X 80 CM. INCLUYE ROTULACION"))?.rotulacion).toBe(true);
    expect(interpretarLineaRps(fila("MEDIDAS 200 X 120 X 80 CM. NO INCLUYE ROTULACION"))?.rotulacion).toBe(false);
    expect(interpretarLineaRps(fila("MEDIDAS 200 X 120 X 80 CM."))?.rotulacion).toBeNull();
  });

  it("prioriza el campo específico de rotulación de RPS sobre el texto comercial", () => {
    const noRotulada = interpretarLineaRps(fila(
      "MEDIDAS 200 X 120 X 80 CM. INCLUYE ROTULACION",
      { Rotulado: false, TipoRotulacion: "SIN ROTULACIÓN" },
    ));
    expect(noRotulada).toMatchObject({ rotulacion: false, tipoRotulacion: "SIN ROTULACIÓN" });

    const digital = interpretarLineaRps(fila(
      "MEDIDAS 200 X 120 X 80 CM.",
      { Rotulado: true, TipoRotulacion: "IMPRESIÓN DIGITAL", TextoRotulacion: "LOGO CLIENTE" },
    ));
    expect(digital).toMatchObject({
      rotulacion: true, tipoRotulacion: "IMPRESIÓN DIGITAL", textoRotulacion: "LOGO CLIENTE",
    });
  });
});
