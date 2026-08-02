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
    // Solo se quita el color. El realce de contraste que había aquí existía
    // porque los grises salían de aplastar unos degradados pensados para
    // pantalla y había que rescatarlos. Ahora el valor de cada plano se elige
    // a propósito y están separados al menos 0,16, así que el realce ya no
    // tiene trabajo: lo único que hace es empujar la cubierta (0,88) a 246
    // sobre 255 y dejarla en blanco de papel. Además impide calibrar, porque
    // amplifica cualquier valor nuevo que se pruebe.
    if (opciones.monocromo) ctx.filter = "grayscale(1)";
    ctx.drawImage(imagen, 0, 0, ancho, alto);
    ctx.filter = "none";
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
