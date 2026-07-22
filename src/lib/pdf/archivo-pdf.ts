import path from "node:path";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";

export interface EntornoRutasPdf {
  [key: string]: string | undefined;
  RUTA_PLANTEAMIENTOS?: string;
  RUTA_OFICINA_TECNICA?: string;
}

export function anioDelPlanteamiento(
  numeroPedido: string,
  fecha: string,
  ahora = new Date(),
): number {
  // Regla de archivo de TGM: los dos dígitos inmediatamente posteriores a
  // AR mandan sobre cualquier fecha introducida en el formulario.
  const anioPedido = /^AR[\s._/-]*(\d{2})/i.exec(numeroPedido.trim())?.[1];
  if (anioPedido) return 2000 + Number(anioPedido);

  const anioFecha = /^(20\d{2})[-/]/.exec(fecha.trim())?.[1];
  if (anioFecha) return Number(anioFecha);

  return ahora.getFullYear();
}

/**
 * Dos destinos distintos: ESCÁNER/PLANTEAMIENTOS y OFICINA TÉCNICA/<año>.
 */
export function rutasPdf(
  nombre: string,
  anio: number,
  entorno: EntornoRutasPdf = process.env,
): string[] {
  const planteamientos = entorno.RUTA_PLANTEAMIENTOS?.trim();
  const oficinaTecnica = entorno.RUTA_OFICINA_TECNICA?.trim();
  if (!planteamientos && !oficinaTecnica) return [];
  if (!planteamientos || !oficinaTecnica) {
    throw new Error("Deben configurarse RUTA_PLANTEAMIENTOS y RUTA_OFICINA_TECNICA.");
  }
  if (!path.isAbsolute(planteamientos) || !path.isAbsolute(oficinaTecnica)) {
    throw new Error("Las rutas de archivo PDF deben ser rutas absolutas del servidor Linux.");
  }

  const destinos = [
    path.join(planteamientos, nombre),
    path.join(oficinaTecnica, String(anio), nombre),
  ];
  if (path.resolve(destinos[0]) === path.resolve(destinos[1])) {
    throw new Error("Las dos rutas de PDF deben apuntar a carpetas distintas.");
  }
  return destinos;
}

export async function guardarPdfDuplicado(
  contenido: Uint8Array,
  nombre: string,
  anio: number,
  entorno: EntornoRutasPdf = process.env,
): Promise<string[]> {
  const destinos = rutasPdf(nombre, anio, entorno);
  if (destinos.length === 0) return [];

  const marca = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const temporales = destinos.map((destino) => path.join(
    path.dirname(destino), `.${path.basename(nombre)}.${marca}.tmp`,
  ));

  await Promise.all(destinos.map((destino) => mkdir(path.dirname(destino), { recursive: true })));
  try {
    await Promise.all(temporales.map((temporal) => writeFile(temporal, contenido)));
    await Promise.all(temporales.map((temporal, indice) => rename(temporal, destinos[indice])));
  } catch (error) {
    await Promise.all(temporales.map((temporal) => rm(temporal, { force: true }).catch(() => {})));
    throw error;
  }
  return destinos;
}
