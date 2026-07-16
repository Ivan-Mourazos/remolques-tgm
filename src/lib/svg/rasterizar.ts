/** Convierte un SVG serializado en PNG dataURL usando canvas. Solo en navegador. */
export async function rasterizarSvg(svg: string, ancho = 1560, alto = 880): Promise<string | null> {
  if (!svg) return null;
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
    ctx.drawImage(imagen, 0, 0, ancho, alto);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
