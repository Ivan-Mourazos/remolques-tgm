import { Workbook, type Cell, type Worksheet } from "exceljs";
import type { LonaInput, LonaResult } from "@/lib/calc/lona";
import type { BaquetonInput, BaquetonResult } from "@/lib/calc/baqueton";
import type { Material } from "@/lib/calc/materiales-seed";
import type { PlanteamientoRecord } from "@/lib/store/types";

const C = {
  negro: "FF111827",
  gris: "FFF3F4F6",
  grisMedio: "FFD1D5DB",
  grisTexto: "FF4B5563",
  ambar: "FFF59E0B",
  ambarClaro: "FFFFF7E6",
  blanco: "FFFFFFFF",
};

const bordeFino = {
  top: { style: "thin" as const, color: { argb: C.grisMedio } },
  left: { style: "thin" as const, color: { argb: C.grisMedio } },
  bottom: { style: "thin" as const, color: { argb: C.grisMedio } },
  right: { style: "thin" as const, color: { argb: C.grisMedio } },
};

const bordeNegro = {
  top: { style: "thin" as const, color: { argb: C.negro } },
  left: { style: "thin" as const, color: { argb: C.negro } },
  bottom: { style: "thin" as const, color: { argb: C.negro } },
  right: { style: "thin" as const, color: { argb: C.negro } },
};

const num = (n: number) => Number(n.toFixed(2));
const siNo = (v: boolean) => (v ? "SÍ" : "NO");

function valor(cell: Cell, value: string | number | null, negrita = false) {
  cell.value = value;
  cell.font = { name: "Arial", size: 8, bold: negrita, color: { argb: C.negro } };
  cell.alignment = { vertical: "middle", wrapText: true };
  cell.border = bordeFino;
}

function etiqueta(cell: Cell, value: string) {
  cell.value = value.toUpperCase();
  cell.font = { name: "Arial", size: 7, bold: true, color: { argb: C.grisTexto } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.gris } };
  cell.alignment = { vertical: "middle", wrapText: true };
  cell.border = bordeFino;
}

function campoPar(
  ws: Worksheet, row: number,
  izquierda: [string, string | number], derecha: [string, string | number],
) {
  ws.mergeCells(`A${row}:B${row}`);
  etiqueta(ws.getCell(`A${row}`), izquierda[0]);
  valor(ws.getCell(`C${row}`), izquierda[1], true);
  ws.mergeCells(`D${row}:E${row}`);
  etiqueta(ws.getCell(`D${row}`), derecha[0]);
  valor(ws.getCell(`F${row}`), derecha[1], true);
}

function campoAncho(ws: Worksheet, row: number, nombre: string, contenido: string | number) {
  ws.mergeCells(`A${row}:B${row}`);
  etiqueta(ws.getCell(`A${row}`), nombre);
  ws.mergeCells(`C${row}:F${row}`);
  valor(ws.getCell(`C${row}`), contenido, true);
}

function seccion(ws: Worksheet, row: number, titulo: string) {
  ws.mergeCells(`A${row}:F${row}`);
  const cell = ws.getCell(`A${row}`);
  cell.value = titulo;
  cell.font = { name: "Arial", size: 8, bold: true, color: { argb: C.negro } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.ambarClaro } };
  cell.alignment = { vertical: "middle" };
  cell.border = bordeNegro;
}

function cabecera(ws: Worksheet, wb: Workbook, rec: PlanteamientoRecord, logoTgm?: string | null) {
  const i = rec.input;
  ws.mergeCells("A1:C3");
  const marca = ws.getCell("A1");
  marca.value = logoTgm ? null : "TGM\nTOLDOS GÓMEZ";
  marca.font = { name: "Arial", size: 17, bold: true, color: { argb: C.ambar } };
  marca.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  marca.border = bordeNegro;
  if (logoTgm?.startsWith("data:image/png;base64,")) {
    const imageId = wb.addImage({ base64: logoTgm, extension: "png" });
    ws.addImage(imageId, {
      tl: { col: 1.05, row: 0.12 },
      ext: { width: 76, height: 58 },
      editAs: "oneCell",
    });
  }

  const filas: Array<[number, string, string, string, string]> = [
    [1, "CLIENTE", i.cabecera.cliente || "-", "Nº PEDIDO", i.cabecera.numeroPedido || "-"],
    [2, "REVISIÓN", i.cabecera.revision || "-", "O.F.", i.cabecera.ordenFabricacion || "-"],
    [3, "REALIZADO", i.cabecera.realizadoPor || "-", "FECHA", i.cabecera.fecha || "-"],
  ];
  for (const [row, l1, v1, l2, v2] of filas) {
    ws.mergeCells(`D${row}:E${row}`);
    etiqueta(ws.getCell(`D${row}`), l1);
    ws.mergeCells(`F${row}:M${row}`);
    valor(ws.getCell(`F${row}`), v1, true);
    ws.mergeCells(`N${row}:P${row}`);
    etiqueta(ws.getCell(`N${row}`), l2);
    ws.mergeCells(`Q${row}:R${row}`);
    valor(ws.getCell(`Q${row}`), v2, true);
  }

  ws.mergeCells("A4:R4");
  const banda = ws.getCell("A4");
  banda.value = rec.tipo === "lona" ? "REMOLQUES · LONA" : "REMOLQUES · BAQUETÓN";
  banda.font = { name: "Arial", size: 9, bold: true, color: { argb: C.negro } };
  banda.alignment = { horizontal: "center", vertical: "middle" };
  banda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.gris } };
  banda.border = bordeNegro;
}

function datosLona(ws: Worksheet, rec: PlanteamientoRecord, material?: Material) {
  const i = rec.input as LonaInput;
  const r = rec.result as LonaResult;
  seccion(ws, 5, "DATOS DEL PEDIDO");
  campoPar(ws, 6, ["Cantidad", i.cantidad], ["Largo pedido", num(i.largo)]);
  campoPar(ws, 7, ["Ancho pedido", num(i.ancho)], ["Alto delante", num(i.altoDelante)]);
  campoPar(ws, 8, ["Alto detrás", num(i.altoAtras)], ["Aguas", num(i.aguas ?? 0)]);
  campoPar(ws, 9, ["Perfil", i.tipoPerfil], ["Contorno SCAD", num(i.contornoScad)]);
  campoPar(ws, 10, ["Recoge delante", r.recogeDelanteTexto], ["Recoge atrás", r.recogeAtrasTexto]);
  campoPar(ws, 11, ["Bastilla enfundar", siNo(i.bastillaEnfundar)], ["Ventana", siNo(i.ventana)]);
  campoPar(ws, 12, ["Ollaos", i.modoOllaos], ["Paso objetivo", num(i.pasoOllaos)]);
  campoAncho(ws, 13, "Material", i.material || "-");
  campoPar(ws, 14, ["Bobina almacén", material?.codigoBobina ?? "MANUAL"], ["Stock Arzúa", material?.stockArzua ?? "-"]);
  campoAncho(ws, 15, "Rotulación", i.rotulacion ? i.textoRotulacion || "SÍ" : "NO");
  seccion(ws, 16, "RESULTADO DE PRODUCCIÓN");
  campoPar(ws, 17, ["Lona hecha", `${num(r.lonaHecha.largo)} × ${num(r.lonaHecha.ancho)}`], ["Contorno", num(r.contornoAjustado)]);
  campoAncho(ws, 18, "Paño delantero", `${i.cantidad} PAÑO DE ${num(r.panoDelantero.ancho)} × ${num(r.panoDelantero.alto)}`);
  campoAncho(ws, 19, "Paño trasero", `${i.cantidad} PAÑO DE ${num(r.panoTrasero.ancho)} × ${num(r.panoTrasero.alto)}`);
  campoAncho(ws, 20, "Paño contorno", r.panoContorno
    ? `${i.cantidad} PAÑO DE ${num(r.panoContorno.ancho)} × ${num(r.panoContorno.alto)}`
    : "NO CALCULADO");
  campoAncho(ws, 21, "Observaciones", i.observaciones || "-");
  campoAncho(ws, 22, "Notas", r.notas.join(" · ") || "-");
  campoPar(ws, 23, ["Metros de tela", num(r.metrosTela)], ["Medidas", "cm"]);
  ws.mergeCells("A24:F24");
  valor(ws.getCell("A24"), "PLANTEAMIENTO FINAL", true);
  ws.getCell("A24").alignment = { horizontal: "center", vertical: "middle" };
  ws.getCell("A24").fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.gris } };
  ws.getCell("A24").border = bordeNegro;
}

function datosBaqueton(ws: Worksheet, rec: PlanteamientoRecord, material?: Material) {
  const i = rec.input as BaquetonInput;
  const r = rec.result as BaquetonResult;
  seccion(ws, 5, "DATOS DEL PEDIDO");
  campoPar(ws, 6, ["Cantidad", i.cantidad], ["Largo pedido", num(i.largo)]);
  campoPar(ws, 7, ["Ancho pedido", num(i.ancho)], ["Baquetón", num(i.baqueton)]);
  campoPar(ws, 8, ["Cliente específico", i.clienteEspecifico || "-"], ["Ollaos", i.modoOllaos]);
  campoPar(ws, 9, ["Paso objetivo", num(i.pasoOllaos)], ["Rotulación", i.rotulacion ? "SÍ" : "NO"]);
  campoAncho(ws, 10, "Texto rotulación", i.textoRotulacion || "-");
  campoAncho(ws, 11, "Material", i.material || "-");
  campoPar(ws, 12, ["Bobina almacén", material?.codigoBobina ?? "MANUAL"], ["Stock Arzúa", material?.stockArzua ?? "-"]);
  campoAncho(ws, 13, "Observaciones", i.observaciones || "-");
  seccion(ws, 14, "RESULTADO DE PRODUCCIÓN");
  campoAncho(ws, 15, "Paño único a cortar", `${i.cantidad} PAÑO DE ${num(r.panoUnico.largo)} × ${num(r.panoUnico.ancho)}`);
  campoPar(ws, 16, ["Remolque hecho", `${num(r.remolqueHecho.largo)} × ${num(r.remolqueHecho.ancho)}`], ["Baquetón + costura", num(r.baquetonCostura)]);
  campoPar(ws, 17, ["Esquina delante", num(r.esquinaDelante)], ["Esquina detrás", num(r.esquinaDetras)]);
  campoPar(ws, 18, ["Baquetón trasero", r.baquetonTrasero ?? "EN LÍNEA"], ["Superficie", `${num(r.superficieM2)} m²/ud`]);
  campoAncho(ws, 19, "Notas", r.notas.join(" · ") || "-");
  campoPar(ws, 20, ["Metros de tela", num(r.metrosTela)], ["Medidas", "cm"]);
  for (let row = 21; row <= 23; row += 1) campoAncho(ws, row, "", "");
  ws.mergeCells("A24:F24");
  valor(ws.getCell("A24"), "PLANTEAMIENTO FINAL", true);
  ws.getCell("A24").alignment = { horizontal: "center", vertical: "middle" };
  ws.getCell("A24").fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.gris } };
  ws.getCell("A24").border = bordeNegro;
}

function plano(ws: Worksheet, wb: Workbook, snapshotPng: string | null, material: string) {
  ws.mergeCells("G5:R5");
  const materialCell = ws.getCell("G5");
  materialCell.value = `LONA: ${material || "SIN INDICAR"}`;
  materialCell.font = { name: "Arial", size: 8, bold: true, color: { argb: C.negro } };
  materialCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  materialCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.ambarClaro } };
  materialCell.border = bordeNegro;
  ws.mergeCells("G6:R24");
  const fondo = ws.getCell("G6");
  fondo.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.blanco } };
  fondo.border = bordeNegro;
  if (!snapshotPng?.startsWith("data:image/png;base64,")) {
    fondo.value = "SIN VISTA TÉCNICA";
    fondo.font = { name: "Arial", size: 10, color: { argb: C.grisTexto } };
    fondo.alignment = { horizontal: "center", vertical: "middle" };
    return;
  }
  const imageId = wb.addImage({ base64: snapshotPng, extension: "png" });
  ws.addImage(imageId, "G6:R24");
}

function tablaOllaos(ws: Worksheet, reparto: { laterales: number[]; atras: number[]; delante: number[] }) {
  const filas: Array<[string, number[]]> = [
    ["OLLAOS LATERALES DE ATRÁS A ADELANTE", reparto.laterales],
    ["OLLAOS ATRÁS DE IZQUIERDA A DERECHA", reparto.atras],
    ["OLLAOS DELANTE DE IZQUIERDA A DERECHA", reparto.delante],
  ];
  ws.mergeCells("A26:E26");
  etiqueta(ws.getCell("A26"), "REPARTO DE OLLAOS");
  for (let col = 6; col <= 17; col += 1) {
    const cell = ws.getCell(26, col);
    etiqueta(cell, String(col - 5));
    cell.alignment = { horizontal: "center", vertical: "middle" };
  }
  etiqueta(ws.getCell("R26"), "TOTAL");
  ws.getCell("R26").alignment = { horizontal: "center", vertical: "middle" };

  filas.forEach(([nombre, posiciones], idx) => {
    const row = 27 + idx;
    ws.mergeCells(`A${row}:E${row}`);
    valor(ws.getCell(`A${row}`), nombre, true);
    for (let col = 6; col <= 17; col += 1) {
      const v = posiciones[col - 6];
      valor(ws.getCell(row, col), v == null ? null : num(v));
      ws.getCell(row, col).alignment = { horizontal: "center", vertical: "middle" };
    }
    valor(ws.getCell(`R${row}`), posiciones.length, true);
    ws.getCell(`R${row}`).alignment = { horizontal: "center", vertical: "middle" };
  });
}

function prepararHoja(ws: Worksheet) {
  ws.views = [{ showGridLines: false, zoomScale: 80 }];
  ws.pageSetup = {
    paperSize: 9, orientation: "landscape", fitToPage: true,
    fitToWidth: 1, fitToHeight: 1, horizontalCentered: true,
    printArea: "A1:R29", showGridLines: false,
    margins: { left: 0.2, right: 0.2, top: 0.25, bottom: 0.25, header: 0, footer: 0 },
  };
  ws.properties.defaultRowHeight = 16;
  ws.columns = [
    { width: 12 }, { width: 12 }, { width: 14 }, { width: 12 }, { width: 12 }, { width: 14 },
    ...Array.from({ length: 12 }, () => ({ width: 9 })),
  ];
  [1, 2, 3].forEach((row) => { ws.getRow(row).height = 18; });
  ws.getRow(4).height = 20;
  ws.getRow(5).height = 19;
  for (let row = 6; row <= 24; row += 1) ws.getRow(row).height = 18;
  ws.getRow(25).height = 8;
  for (let row = 26; row <= 29; row += 1) ws.getRow(row).height = 18;
}

/** Libro final de producción: datos a la izquierda y planteamiento técnico a la derecha. */
export async function buildPlanteamientoWorkbook(
  rec: PlanteamientoRecord,
  snapshotPng: string | null = null,
  material?: Material,
  logoTgm?: string | null,
): Promise<Buffer> {
  const wb = new Workbook();
  wb.creator = "TGM · Remolques";
  wb.created = new Date();
  wb.modified = new Date();
  wb.calcProperties.fullCalcOnLoad = true;
  const ws = wb.addWorksheet("Planteamiento");
  prepararHoja(ws);
  cabecera(ws, wb, rec, logoTgm);
  if (rec.tipo === "lona") datosLona(ws, rec, material);
  else datosBaqueton(ws, rec, material);
  plano(ws, wb, snapshotPng, rec.input.material);
  tablaOllaos(ws, (rec.result as LonaResult | BaquetonResult).reparto);
  const bytes = await wb.xlsx.writeBuffer();
  return Buffer.from(bytes);
}
