import { roundValue } from "@/lib/calculations/round";
import type { AppSettings, LonaFormInput } from "@/lib/types";

export interface TrailerContourResult {
  value: number | null;
  source: "calculado" | "manual" | "pendiente";
  warning?: string;
}

function hasPositive(...values: number[]) {
  return values.every((value) => Number.isFinite(value) && value > 0);
}

function roundContour(value: number, settings: AppSettings) {
  const { decimales, redondeo } = settings.lonaParams;
  return roundValue(value, decimales, redondeo);
}

export function calculateTrailerContour(
  input: LonaFormInput,
  settings: AppSettings,
): TrailerContourResult {
  if (input.contornoManualEnabled) {
    if (!hasPositive(input.contornoManual)) {
      return {
        value: null,
        source: "manual",
        warning: "No se pudo calcular el contorno con los datos actuales.",
      };
    }
    return {
      value: roundContour(input.contornoManual, settings),
      source: "manual",
    };
  }

  if (hasPositive(input.contornoCad)) {
    return {
      value: roundContour(input.contornoCad, settings),
      source: "calculado",
    };
  }

  const anchoTerminado =
    input.anchoPedido + settings.lonaParams.demasiaLargoAnchoLonaHecha;
  const alto = input.altoDelantero;

  if (!hasPositive(anchoTerminado, alto)) {
    return {
      value: null,
      source: "calculado",
      warning: "No se pudo calcular el contorno con los datos actuales.",
    };
  }

  switch (input.tipoPerfil ?? "tipo-01") {
    case "tipo-01":
      return {
        value: roundContour(alto + anchoTerminado + alto, settings),
        source: "calculado",
      };

    case "tipo-04": {
      const chaflan = input.chaflanCm;
      if (!hasPositive(chaflan) || chaflan * 2 >= anchoTerminado || chaflan >= alto) {
        return {
          value: null,
          source: "calculado",
          warning: "No se pudo calcular el contorno con los datos actuales.",
        };
      }
      const verticales = 2 * (alto - chaflan);
      const techo = anchoTerminado - chaflan * 2;
      const diagonales = 2 * Math.hypot(chaflan, chaflan);
      return {
        value: roundContour(verticales + techo + diagonales, settings),
        source: "calculado",
      };
    }

    case "tipo-05": {
      const radio = input.radioCurva;
      if (!hasPositive(radio) || radio * 2 >= anchoTerminado || radio >= alto) {
        return {
          value: null,
          source: "calculado",
          warning: "No se pudo calcular el contorno con los datos actuales.",
        };
      }
      const verticales = 2 * (alto - radio);
      const techo = anchoTerminado - radio * 2;
      const arcos = Math.PI * radio;
      return {
        value: roundContour(
          verticales + techo + arcos + settings.lonaParams.aumentoCurvaContorno,
          settings,
        ),
        source: "calculado",
      };
    }

    case "tipo-02":
    case "tipo-03":
      return {
        value: null,
        source: "pendiente",
        warning: "Pendiente de validar fórmula de contorno para este perfil.",
      };

    default:
      return {
        value: null,
        source: "calculado",
        warning: "No se pudo calcular el contorno con los datos actuales.",
      };
  }
}
