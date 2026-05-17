import type { BaquetonFormInput, LonaFormInput } from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/defaults/default-settings";
import { calculateTrailerContour } from "@/lib/calculations/trailer-contour";

export type ValidationLevel = "warning";

export type LonaValidationField =
  | "numeroPedido"
  | "cliente"
  | "material"
  | "largoPedido"
  | "anchoPedido"
  | "altoDelantero"
  | "altoTrasero"
  | "contornoCad"
  | "radioCurva";

export type BaquetonValidationField =
  | "numeroPedido"
  | "cliente"
  | "material"
  | "largoPedido"
  | "anchoPedido"
  | "baqueton";

export interface ValidationIssue {
  level: ValidationLevel;
  message: string;
  field?: LonaValidationField | BaquetonValidationField;
}

export function issuesByField(
  issues: ValidationIssue[],
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const issue of issues) {
    if (issue.field && !map[issue.field]) {
      map[issue.field] = issue.message;
    }
  }
  return map;
}

export function validateLonaInput(input: LonaFormInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!input.numeroPedido.trim()) {
    issues.push({
      level: "warning",
      field: "numeroPedido",
      message: "Falta el número de pedido.",
    });
  }
  if (!input.cliente.trim()) {
    issues.push({
      level: "warning",
      field: "cliente",
      message: "Falta el cliente.",
    });
  }
  if (!input.material.trim()) {
    issues.push({
      level: "warning",
      field: "material",
      message: "Falta el material.",
    });
  }
  if (input.largoPedido <= 0) {
    issues.push({
      level: "warning",
      field: "largoPedido",
      message: "Indica un largo mayor que 0.",
    });
  }
  if (input.anchoPedido <= 0) {
    issues.push({
      level: "warning",
      field: "anchoPedido",
      message: "Indica un ancho mayor que 0.",
    });
  }
  if (input.altoDelantero <= 0) {
    issues.push({
      level: "warning",
      field: "altoDelantero",
      message: "Indica el alto delantero.",
    });
  }
  if (input.altoTrasero <= 0) {
    issues.push({
      level: "warning",
      field: "altoTrasero",
      message: "Indica el alto trasero.",
    });
  }
  const contorno = calculateTrailerContour(input, DEFAULT_SETTINGS);
  if (contorno.value == null) {
    issues.push({
      level: "warning",
      field: "contornoCad",
      message:
        contorno.warning ?? "No se pudo calcular el contorno con los datos actuales.",
    });
  }
  if (
    (input.tipoPerfil === "tipo-03" || input.tipoPerfil === "tipo-05") &&
    input.radioCurva <= 0 &&
    (input.recogeDelante === "GOMA" || input.recogeAtras === "GOMA")
  ) {
    issues.push({
      level: "warning",
      field: "radioCurva",
      message: "Indica el radio de curva para las orejas de goma.",
    });
  }

  return issues;
}

export function validateBaquetonInput(input: BaquetonFormInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!input.numeroPedido.trim()) {
    issues.push({
      level: "warning",
      field: "numeroPedido",
      message: "Falta el número de pedido.",
    });
  }
  if (!input.cliente.trim()) {
    issues.push({
      level: "warning",
      field: "cliente",
      message: "Falta el cliente.",
    });
  }
  if (!input.material.trim()) {
    issues.push({
      level: "warning",
      field: "material",
      message: "Falta el material.",
    });
  }
  if (input.largoPedido <= 0) {
    issues.push({
      level: "warning",
      field: "largoPedido",
      message: "Indica un largo mayor que 0.",
    });
  }
  if (input.anchoPedido <= 0) {
    issues.push({
      level: "warning",
      field: "anchoPedido",
      message: "Indica un ancho mayor que 0.",
    });
  }
  if (input.baqueton <= 0) {
    issues.push({
      level: "warning",
      field: "baqueton",
      message: "Indica el baquetón.",
    });
  }

  return issues;
}
