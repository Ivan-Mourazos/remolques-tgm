import { describe, expect, it } from "vitest";
import { emptyLona } from "@/components/workspace/entradas-vacias";
import { errorPlanteamientoIncompleto, erroresPlanteamiento } from "@/lib/pedidos/validar-planteamiento";

const lonaValida = () => ({
  ...emptyLona(),
  cabecera: { ...emptyLona().cabecera, numeroPedido: "AR2603583" },
  largo: 600,
  ancho: 250,
  altoDelante: 220,
  contorno: 620,
  material: "PVC 580 AZUL",
});

describe("validación previa al guardado y PDF", () => {
  it("rechaza las medidas y datos de producción vacíos", () => {
    const campos = erroresPlanteamiento(emptyLona()).map((error) => error.campo);
    expect(campos).toEqual(expect.arrayContaining([
      "numeroPedido", "largo", "ancho", "altoDelante", "contorno", "material",
    ]));
  });

  it("permite los ollaos repartidos sin posiciones manuales", () => {
    expect(errorPlanteamientoIncompleto(lonaValida())).toBeNull();
  });

  it("exige la geometría propia de los perfiles especiales", () => {
    expect(erroresPlanteamiento({ ...lonaValida(), tipoPerfil: "TIPO 03", aguas: 0 }))
      .toContainEqual(expect.objectContaining({ campo: "aguas" }));
    expect(erroresPlanteamiento({ ...lonaValida(), tipoPerfil: "TIPO 04", chaflan: 0 }))
      .toContainEqual(expect.objectContaining({ campo: "chaflan" }));
    expect(erroresPlanteamiento({ ...lonaValida(), tipoPerfil: "TIPO 05", radioEsquina: 0 }))
      .toContainEqual(expect.objectContaining({ campo: "radioEsquina" }));
  });

  it("exige las dos medidas cuando el remolque lleva ventana", () => {
    const sinMedidas = erroresPlanteamiento({ ...lonaValida(), ventana: true });
    expect(sinMedidas).toContainEqual(expect.objectContaining({ campo: "ventanaAncho" }));
    expect(sinMedidas).toContainEqual(expect.objectContaining({ campo: "ventanaAlto" }));
    expect(errorPlanteamientoIncompleto({
      ...lonaValida(), ventana: true, ventanaAncho: 80, ventanaAlto: 45,
    })).toBeNull();
  });

  it("rechaza a medida si alguna cara está sin cubrir", () => {
    const input = {
      ...lonaValida(),
      modoOllaos: "SEGUN SE INDICA" as const,
      ollaosManuales: { laterales: [2.5, 35], atras: [], delante: [2.5, 35] },
    };
    expect(errorPlanteamientoIncompleto(input)).toMatch(/atrás/);
  });

  it("acepta a medida con las tres caras cubiertas", () => {
    const input = {
      ...lonaValida(),
      modoOllaos: "SEGUN SE INDICA" as const,
      ollaosManuales: { laterales: [2.5], atras: [2.5], delante: [2.5] },
    };
    expect(errorPlanteamientoIncompleto(input)).toBeNull();
  });
});
