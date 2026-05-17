import type { BaquetonFormInput, LonaFormInput } from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/defaults/default-settings";
import { calculateTrailerContour } from "@/lib/calculations/trailer-contour";

export type ValidationLevel = "warning";

export interface ValidationIssue {
  level: ValidationLevel;
  message: string;
}

export function validateLonaInput(input: LonaFormInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!input.numeroPedido.trim()) {
    issues.push({ level: "warning", message: "Falta el número de pedido." });
  }
  if (!input.cliente.trim()) {
    issues.push({ level: "warning", message: "Falta el cliente." });
  }
  if (!input.material.trim()) {
    issues.push({ level: "warning", message: "Falta el material." });
  }
  if (input.largoPedido <= 0 || input.anchoPedido <= 0) {
    issues.push({
      level: "warning",
      message: "Largo o ancho de pedido deben ser mayores que 0.",
    });
  }
  if (input.altoDelantero <= 0 || input.altoTrasero <= 0) {
    issues.push({
      level: "warning",
      message: "Los altos delantero y trasero deben ser mayores que 0.",
    });
  }
  const contorno = calculateTrailerContour(input, DEFAULT_SETTINGS);
  if (contorno.value == null) {
    issues.push({
      level: "warning",
      message: contorno.warning ?? "No se pudo calcular el contorno con los datos actuales.",
    });
  }
  if (
    (input.tipoPerfil === "tipo-03" || input.tipoPerfil === "tipo-05") &&
    input.radioCurva <= 0 &&
    (input.recogeDelante === "GOMA" || input.recogeAtras === "GOMA")
  ) {
    issues.push({
      level: "warning",
      message:
        "Con curva y recoge con goma debe indicarse el radio de curva para las orejas.",
    });
  }

  return issues;
}

export function validateBaquetonInput(input: BaquetonFormInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!input.numeroPedido.trim()) {
    issues.push({ level: "warning", message: "Falta el número de pedido." });
  }
  if (!input.cliente.trim()) {
    issues.push({ level: "warning", message: "Falta el cliente." });
  }
  if (!input.material.trim()) {
    issues.push({ level: "warning", message: "Falta el material." });
  }
  if (input.largoPedido <= 0 || input.anchoPedido <= 0) {
    issues.push({
      level: "warning",
      message: "Largo o ancho de pedido deben ser mayores que 0.",
    });
  }
  if (input.baqueton <= 0) {
    issues.push({
      level: "warning",
      message: "El baquetón debe ser mayor que 0.",
    });
  }

  return issues;
}
