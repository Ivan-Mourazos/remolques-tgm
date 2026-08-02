import { describe, expect, it } from "vitest";
import { emptyBaqueton, emptyLona } from "@/components/workspace/entradas-vacias";
import { errorPlanteamientoIncompleto, erroresPlanteamiento } from "@/lib/pedidos/validar-planteamiento";

// Una lona válida ya no es solo una lona medida: es una lona *decidida*. Las
// siete decisiones van explícitas aquí porque `emptyLona()` arranca sin ninguna
// tomada, y una lona a la que nadie ha mirado el perfil no debe pasar por buena.
const lonaValida = () => ({
  ...emptyLona(),
  cabecera: { ...emptyLona().cabecera, numeroPedido: "AR2603583" },
  largo: 600,
  ancho: 250,
  altoDelante: 220,
  contorno: 620,
  material: "PVC 580 AZUL",
  tipoPerfil: "TIPO 01" as const,
  recogeDelante: "NO",
  recogeAtras: "NO",
  ventana: false,
  bastillaEnfundar: false,
  rotulacion: false,
  modoOllaos: "REPARTIDOS" as const,
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

describe("las decisiones sin tomar son errores", () => {
  /** Una lona con todas las medidas puestas pero ninguna decisión tomada. */
  const conMedidas = () => ({
    ...emptyLona(),
    cabecera: { ...emptyLona().cabecera, numeroPedido: "AR2603583" },
    largo: 600, ancho: 250, altoDelante: 220, contorno: 620,
    material: "PVC 580 AZUL",
  });

  const campos = (input: ReturnType<typeof conMedidas>) =>
    erroresPlanteamiento(input).map((error) => error.campo);

  it("no deja completar una lona sin ninguna decisión tomada", () => {
    expect(campos(conMedidas())).toEqual(expect.arrayContaining([
      "tipoPerfil", "modoOllaos", "recogeDelante", "recogeAtras",
      "ventana", "rotulacion", "bastillaEnfundar",
    ]));
  });

  it("cada decisión tomada retira su error", () => {
    const decidida = {
      ...conMedidas(),
      tipoPerfil: "TIPO 01" as const,
      recogeDelante: "NO", recogeAtras: "NO",
      ventana: false, rotulacion: false, bastillaEnfundar: false,
      modoOllaos: "REPARTIDOS" as const,
    };
    expect(erroresPlanteamiento(decidida)).toEqual([]);
  });

  it("decir que no es una decisión, y basta", () => {
    // El valor no importa: importa que se haya dicho algo.
    const conVentana = { ...conMedidas(), ventana: true, ventanaAncho: 50, ventanaAlto: 35 };
    expect(campos(conVentana)).not.toContain("ventana");
  });

  it("el baquetón también exige su modo de ollaos y su rotulación", () => {
    const baqueton = {
      ...emptyBaqueton(),
      cabecera: { ...emptyBaqueton().cabecera, numeroPedido: "AR2603583" },
      largo: 600, ancho: 250, baqueton: 12, material: "PVC 580 AZUL",
    };
    const campos = erroresPlanteamiento(baqueton).map((error) => error.campo);
    expect(campos).toContain("modoOllaos");
    expect(campos).toContain("rotulacion");
  });
});
