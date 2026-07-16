import { DEFAULT_PARAMS, type CalcParams, type ClienteBaqueton, type Recogida } from "@/lib/calc/params";

const esNumero = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

const CAMPOS_NUMERICOS = [
  "demasiaAlto", "demasiaContornoNormal", "demasiaContornoEnfundar", "demasiaLonaHecha",
  "ajusteContornoBase", "ajusteContornoCurva", "pasoOllaosDefecto", "primerOllao",
  "maxPosicionesOllaos", "baquetonDemasiaLargoCostura", "baquetonDemasiaAnchoCostura",
  "baquetonDemasiaCostura", "baquetonDemasiaFinal",
] as const;

/** Lectura tolerante: completa con DEFAULT_PARAMS lo que falte en datos guardados antiguos. */
export function normalizarParams(bruto: unknown): CalcParams {
  const p = (typeof bruto === "object" && bruto !== null ? bruto : {}) as Record<string, unknown>;
  const resultado: CalcParams = { ...DEFAULT_PARAMS };
  for (const campo of CAMPOS_NUMERICOS) {
    if (esNumero(p[campo])) resultado[campo] = p[campo];
  }
  if (Array.isArray(p.recogidas) && p.recogidas.length > 0) {
    resultado.recogidas = p.recogidas as Recogida[];
  }
  if (Array.isArray(p.clientesBaqueton) && p.clientesBaqueton.length > 0) {
    resultado.clientesBaqueton = p.clientesBaqueton as ClienteBaqueton[];
  }
  return resultado;
}

/** Validación estricta antes de persistir: todo presente, numérico y coherente. */
export function validarParams(
  bruto: unknown,
): { ok: true; params: CalcParams } | { ok: false; errores: string[] } {
  if (typeof bruto !== "object" || bruto === null) {
    return { ok: false, errores: ["El cuerpo debe ser un objeto de parámetros"] };
  }
  const p = bruto as Record<string, unknown>;
  const errores: string[] = [];
  for (const campo of CAMPOS_NUMERICOS) {
    if (!esNumero(p[campo])) errores.push(`«${campo}» debe ser un número`);
  }
  if (esNumero(p.pasoOllaosDefecto) && p.pasoOllaosDefecto <= 0) {
    errores.push("«pasoOllaosDefecto» debe ser mayor que 0");
  }
  if (esNumero(p.maxPosicionesOllaos) && p.maxPosicionesOllaos < 1) {
    errores.push("«maxPosicionesOllaos» debe ser al menos 1");
  }
  const recogidas = p.recogidas;
  if (!Array.isArray(recogidas) || recogidas.length === 0) {
    errores.push("«recogidas» debe tener al menos una entrada");
  } else {
    if (!recogidas.some((r) => (r as Recogida)?.nombre === "NO")) {
      errores.push("«recogidas» debe incluir la entrada «NO» (es el fallback)");
    }
    recogidas.forEach((r, i) => {
      const rec = r as Partial<Recogida> | null;
      if (typeof rec?.nombre !== "string" || rec.nombre.trim() === "") {
        errores.push(`recogida ${i + 1}: falta el nombre`);
      }
      for (const campo of ["delante", "atras", "lateralSoloAtras", "lateralSoloDelante"] as const) {
        if (!esNumero(rec?.[campo])) {
          errores.push(`recogida «${rec?.nombre ?? i + 1}»: «${campo}» debe ser un número`);
        }
      }
    });
  }
  const clientes = p.clientesBaqueton;
  if (!Array.isArray(clientes) || clientes.length === 0) {
    errores.push("«clientesBaqueton» debe tener al menos una entrada");
  } else if (!clientes.some((c) => (c as ClienteBaqueton)?.nombre === "GENERAL")) {
    errores.push("«clientesBaqueton» debe incluir la entrada «GENERAL» (es el fallback)");
  }
  return errores.length > 0 ? { ok: false, errores } : { ok: true, params: bruto as CalcParams };
}
