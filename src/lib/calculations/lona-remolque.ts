import { roundValue } from "@/lib/calculations/round";
import { calculateTrailerContour } from "@/lib/calculations/trailer-contour";
import { profileNeedsCornerRadius } from "@/components/drawings/cross-section-paths";
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
    const inicioOreja = profileNeedsCornerRadius(input.tipoPerfil)
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

  const contorno = calculateTrailerContour(input, settings);
  const contornoAjustado = contorno.value ?? 0;

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
  if (input.ventana) {
    notasAutomaticas.push(
      "Ventana indicada: no afecta al cálculo de medidas; verificar en taller.",
    );
  }
  if (contorno.source === "manual") {
    notasAutomaticas.push(`Contorno manual: ${contornoAjustado} cm.`);
  } else if (contorno.source === "calculado" && contorno.value != null) {
    notasAutomaticas.push(`Contorno calculado: ${contornoAjustado} cm.`);
  }
  if (contorno.warning) {
    notasAutomaticas.push(contorno.warning);
  }
  if (profileNeedsCornerRadius(input.tipoPerfil)) {
    notasAutomaticas.push(
      `Curva en perfil: radio ${input.radioCurva} cm.`,
    );
  }
  if (input.rotulacion) {
    notasAutomaticas.push("Incluye rotulación.");
  }

  return {
    medidaLonaHecha: { largo: largoHecho, ancho: anchoHecho },
    altoDelantero: input.altoDelantero,
    altoTrasero: input.altoTrasero,
    contornoCad: contornoAjustado,
    contornoAjustado,
    contornoOrigen: contorno.source,
    contornoAviso: contorno.warning,
    panos: {
      contorno:
        contorno.value != null
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
