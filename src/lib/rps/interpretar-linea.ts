import type { LineaPedidoRps, MaterialRps } from "@/lib/rps/types";

export interface FilaLineaRps {
  IDOrderLine: string;
  NumLine: number;
  CodArticle: string | null;
  CodManufacturingOrder: string | null;
  Quantity: number | null;
  Description: string | null;
  Comment: string | null;
  Rotulado: boolean | number | null;
  TipoRotulacion: string | null;
  TextoRotulacion: string | null;
}

const numeroMedida = (value: string | undefined): number | null => {
  if (!value) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizarTexto = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleUpperCase("es-ES");

function extraerMaterial(texto: string): MaterialRps {
  const gramaje = numeroMedida(
    texto.match(/(?:PVC|LONA)[^\d]{0,35}(\d{3})\s*(?:G(?:R)?\s*\/\s*M|GR\/M|G\/M|GRAMOS?)/i)?.[1],
  );
  const colorExplicito = texto.match(/\bCO(?:LOR|OR)\s+([^,.;\r\n]+)/i)?.[1]?.trim();
  const colorConocido = texto.match(/\b(BLANCO|NEGRO|GRIS(?:\s+(?:CLARO|OSCURO))?|AZUL(?:\s+EUROPA(?:\s+95)?)?|ROJO|VERDE(?:\s+OSCURO)?|NARANJA|AMARILLO|BURDEOS|CREMA|MARFIL|PLATA|ARENA|MARRON)(?:\s+(?:RAL\s*)?\d{3,4})?\b/i)?.[0]?.trim();
  const colorRaw = colorExplicito ?? colorConocido ?? null;
  return {
    gramaje,
    color: colorRaw?.replace(/\s+/g, " ") ?? null,
    texto: [gramaje ? `PVC ${gramaje}` : null, colorRaw ? `color ${colorRaw}` : null]
      .filter(Boolean)
      .join(" · "),
  };
}

/**
 * Interpreta el texto comercial de RPS. Los campos que no aparecen de forma
 * inequívoca quedan a null para que oficina técnica los revise en el formulario.
 */
export function interpretarLineaRps(fila: FilaLineaRps): LineaPedidoRps | null {
  const descripcion = (fila.Description ?? "").trim();
  const detalle = (fila.Comment ?? "").trim();
  const textoOriginal = `${descripcion} ${detalle}`;
  const texto = normalizarTexto(textoOriginal);
  const codigoArticulo = (fila.CodArticle ?? "").trim().toLocaleUpperCase("es-ES");
  const esRemolque = codigoArticulo === "LONAREMOLQUE"
    || codigoArticulo === "LONAREMGANA"
    || texto.includes("LONA REMOLQUE")
    || texto.includes("CANVAS FOR TRAILER");
  if (!esRemolque) return null;

  const match = texto.match(/MEDIDAS?\s+([0-9]+(?:[,.][0-9]+)?)\s*(?:CM)?\s*X\s*([0-9]+(?:[,.][0-9]+)?)\s*(?:CM)?(?:\s*X\s*([0-9]+(?:[,.][0-9]+)?)(?:\s*CM)?(?:\s*\/\s*([0-9]+(?:[,.][0-9]+)?)(?:\s*CM)?)?(?:\s*\+\s*([0-9]+(?:[,.][0-9]+)?)(?:\s*CM)?)?)?/i)
    ?? texto.match(/MEASURES?\s+([0-9]+(?:[,.][0-9]+)?)\s*(?:CM)?\s*X\s*([0-9]+(?:[,.][0-9]+)?)\s*(?:CM)?(?:\s*X\s*([0-9]+(?:[,.][0-9]+)?)(?:\s*CM)?(?:\s*\/\s*([0-9]+(?:[,.][0-9]+)?)(?:\s*CM)?)?(?:\s*\+\s*([0-9]+(?:[,.][0-9]+)?)(?:\s*CM)?)?)?/i);
  const largo = numeroMedida(match?.[1]);
  const ancho = numeroMedida(match?.[2]);
  const altoBase = numeroMedida(match?.[3]);
  const altoAtras = numeroMedida(match?.[4]);
  const altoExtra = numeroMedida(match?.[5]);
  const esBaqueton = altoBase !== null && altoBase <= 25 && altoAtras === null && altoExtra === null;
  const cantidadRaw = Number(fila.Quantity ?? 1);
  const cantidad = Number.isFinite(cantidadRaw) && cantidadRaw > 0 ? cantidadRaw : 1;
  const rotulacionNegativa = /(?:NO\s+INCLUYE|SIN|NO\s+LLEVA)\s+ROTUL|NO\s+ROTULAD/.test(texto);
  const rotulacionPositiva = /(?:INCLUYE[N]?\s+ROTUL|CON\s+ROTUL|ROTULAD[AO])/.test(texto);
  const rotulacionRps = fila.Rotulado === null || fila.Rotulado === undefined
    ? null
    : Boolean(fila.Rotulado);

  return {
    idLinea: String(fila.IDOrderLine),
    numeroLinea: Number(fila.NumLine),
    codigoArticulo,
    ordenFabricacion: fila.CodManufacturingOrder?.trim() || null,
    cantidad,
    tipoTrabajo: esBaqueton ? "baqueton" : "lona",
    largo,
    ancho,
    alto: esBaqueton || altoAtras !== null ? null : altoBase === null ? null : altoBase + (altoExtra ?? 0),
    altoDelante: !esBaqueton && altoAtras !== null ? altoBase : null,
    altoAtras: !esBaqueton ? altoAtras : null,
    aguas: !esBaqueton ? altoExtra : null,
    baqueton: esBaqueton ? altoBase : null,
    ventana: texto.includes("VENTANA"),
    rotulacion: rotulacionRps ?? (rotulacionNegativa ? false : rotulacionPositiva ? true : null),
    tipoRotulacion: fila.TipoRotulacion?.trim() || null,
    textoRotulacion: fila.TextoRotulacion?.trim() || null,
    recogidaDelante: /RECOGID[AO][^.;]{0,40}DELANTER|DELANTER[AO][^.;]{0,40}RECOGID/.test(texto),
    recogidaAtras: /RECOGID[AO][^.;]{0,40}(?:TRASER|ATRAS)|(?:TRASER|ATRAS)[^.;]{0,40}RECOGID|FRUNCIR\s+ATRAS/.test(texto),
    materialRps: extraerMaterial(textoOriginal),
    descripcion,
    detalle,
    requiereRevision: !match || largo === null || ancho === null || altoBase === null,
  };
}
