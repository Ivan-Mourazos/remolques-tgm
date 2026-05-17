import { roundValue } from "@/lib/calculations/round";
import type {
  AppSettings,
  LonaCalculationResult,
  LonaFormInput,
  LonaParams,
  RecogidaType,
} from "@/lib/types";

function getRecogidaDemasia(
  nombre: string,
  tipos: RecogidaType[],
  lado: "delante" | "atras",
): number {
  const tipo = tipos.find((t) => t.nombre === nombre);
  if (!tipo) return 0;
  return lado === "delante" ? tipo.delante : tipo.atras;
}

function r(value: number, params: LonaParams): number {
  return roundValue(value, params.decimales, params.redondeo);
}

function buildGomaNotes(
  input: LonaFormInput,
  params: LonaParams,
): string[] {
  const notas: string[] = [];
  const lados: Array<{ lado: string; tipo: string }> = [
    { lado: "delante", tipo: input.recogeDelante },
    { lado: "atrás", tipo: input.recogeAtras },
  ];

  for (const { lado, tipo } of lados) {
    if (tipo !== "GOMA") continue;
    const inicioOreja = input.tieneCurva
      ? input.radioCurva
      : params.inicioOrejaSinCurva;
    notas.push(
      `Recoge con goma (${lado}): orejas de ${params.medidaOrejaGoma} cm por lado. Inicio oreja a ${inicioOreja} cm desde arriba.`,
    );
  }

  return notas;
}

export function calculateLonaRemolque(
  input: LonaFormInput,
  settings: AppSettings,
): LonaCalculationResult {
  const params = settings.lonaParams;
  const { recogidaTypes } = settings;

  const largoHecho = r(
    input.largoPedido + params.demasiaLargoAnchoLonaHecha,
    params,
  );
  const anchoHecho = r(
    input.anchoPedido + params.demasiaLargoAnchoLonaHecha,
    params,
  );

  const contornoAjustado = r(
    input.contornoCad +
      (input.tieneCurva ? params.aumentoCurvaContorno : 0),
    params,
  );

  const demasiaContorno =
    input.bastilla === "enfundar"
      ? params.demasiaLargoContornoEnfundar
      : params.demasiaLargoContornoNormal;

  const anchoPanoContorno = r(input.largoPedido + demasiaContorno, params);
  const largoPanoContorno = contornoAjustado;

  const demasiaDelante = getRecogidaDemasia(
    input.recogeDelante,
    recogidaTypes,
    "delante",
  );
  const demasiaAtras = getRecogidaDemasia(
    input.recogeAtras,
    recogidaTypes,
    "atras",
  );

  const panoDelantero = {
    ancho: r(input.anchoPedido + demasiaDelante, params),
    alto: r(input.altoDelantero + params.demasiaAlto, params),
  };

  const panoTrasero = {
    ancho: r(input.anchoPedido + demasiaAtras, params),
    alto: r(input.altoTrasero + params.demasiaAlto, params),
  };

  const notasAutomaticas = buildGomaNotes(input, params);
  if (input.rotulacion) {
    notasAutomaticas.push("Incluye rotulación.");
  }

  return {
    medidaLonaHecha: { largo: largoHecho, ancho: anchoHecho },
    altoDelantero: input.altoDelantero,
    altoTrasero: input.altoTrasero,
    panos: {
      contorno:
        input.contornoCad > 0
          ? { ancho: anchoPanoContorno, largo: largoPanoContorno }
          : null,
      delantero: panoDelantero,
      trasero: panoTrasero,
    },
    tipoRecogidaDelante: input.recogeDelante,
    tipoRecogidaAtras: input.recogeAtras,
    ventana: input.ventana,
    material: input.material,
    ollaos: {
      laterales: input.ollaosLaterales,
      delante: input.ollaosDelante,
      atras: input.ollaosAtras,
    },
    observaciones: input.observaciones,
    notasAutomaticas,
  };
}
