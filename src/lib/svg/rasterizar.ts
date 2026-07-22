export interface OpcionesRasterizado {
  ancho?: number;
  alto?: number;
  /** Salida de taller: grises contrastados para impresión en blanco y negro. */
  monocromo?: boolean;
}

/** Convierte un SVG serializado en PNG dataURL usando canvas. Solo en navegador. */
export async function rasterizarSvg(
  svg: string,
  opciones: OpcionesRasterizado = {},
): Promise<string | null> {
  if (!svg) return null;
  // Respeta la proporción del propio SVG (vista doble 1560×440 o antigua 780×440).
  const medidas = /width="(\d+)"\s+height="(\d+)"/.exec(svg);
  const anchoSvg = medidas ? Number(medidas[1]) : 780;
  const altoSvg = medidas ? Number(medidas[2]) : 440;
  const ancho = opciones.ancho ?? anchoSvg * 1.5;
  const alto = opciones.alto ?? altoSvg * 1.5;
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const imagen = new Image();
    imagen.src = url;
    await imagen.decode();
    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, ancho, alto);
    if (opciones.monocromo) ctx.filter = "grayscale(1) contrast(1.22)";
    ctx.drawImage(imagen, 0, 0, ancho, alto);
    ctx.filter = "none";
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
