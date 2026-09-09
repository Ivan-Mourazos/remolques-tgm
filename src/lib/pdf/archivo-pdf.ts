import path from "node:path";
import { access, copyFile, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { constants } from "node:fs";

export interface EntornoRutasPdf {
  [key: string]: string | undefined;
  RUTA_PLANTEAMIENTOS?: string;
  RUTA_OFICINA_TECNICA?: string;
}

export function anioDelPlanteamiento(numeroPedido: string, fecha: string, ahora = new Date()): number {
  const anioPedido = /^AR[\s._/-]*(\d{2})/i.exec(numeroPedido.trim())?.[1];
  if (anioPedido) return 2000 + Number(anioPedido);
  const anioFecha = /^(20\d{2})[-/]/.exec(fecha.trim())?.[1];
  return anioFecha ? Number(anioFecha) : ahora.getFullYear();
}

/** PLANTEAMIENTOS lleva -10; OFICINA TÉCNICA/<año> lleva solo el pedido. */
export function rutasPdf(nombre: string, anio: number, entorno: EntornoRutasPdf = process.env): string[] {
  const planteamientos = entorno.RUTA_PLANTEAMIENTOS?.trim();
  const oficinaTecnica = entorno.RUTA_OFICINA_TECNICA?.trim();
  if (!planteamientos || !oficinaTecnica) {
    throw new Error("Deben configurarse RUTA_PLANTEAMIENTOS y RUTA_OFICINA_TECNICA. No se ha archivado el PDF.");
  }
  if (!path.isAbsolute(planteamientos) || !path.isAbsolute(oficinaTecnica)) {
    throw new Error("Las rutas de archivo PDF deben ser rutas absolutas del servidor.");
  }
  if (!/^[A-Z0-9-]+-10\.pdf$/.test(nombre)) throw new Error("Nombre de PDF inválido.");
  return [
    path.join(planteamientos, nombre),
    path.join(oficinaTecnica, String(anio), nombre.replace(/-10\.pdf$/, ".pdf")),
  ];
}

export class PdfExistenteError extends Error {
  constructor() {
    super("Ya existe un PDF de este pedido en las carpetas de archivo. Se sustituirán las dos copias.");
    this.name = "PdfExistenteError";
  }
}

async function existe(fichero: string): Promise<boolean> {
  try {
    const datos = await stat(fichero);
    if (!datos.isFile()) throw new Error(`El destino no es un archivo: ${fichero}`);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

export async function guardarPdfDuplicado(
  contenido: Uint8Array,
  nombre: string,
  anio: number,
  entorno: EntornoRutasPdf = process.env,
  opciones: { sustituir?: boolean } = {},
): Promise<string[]> {
  const destinos = rutasPdf(nombre, anio, entorno);
  // Las raíces deben existir: no crear una carpeta local si falta el montaje de red.
  for (const raiz of [entorno.RUTA_PLANTEAMIENTOS!.trim(), entorno.RUTA_OFICINA_TECNICA!.trim()]) {
    try {
      if (!(await stat(raiz)).isDirectory()) throw new Error("No es una carpeta");
      await access(raiz, constants.W_OK);
    } catch {
      throw new Error(`La carpeta de archivo no está disponible o no permite escribir: ${raiz}`);
    }
  }
  await mkdir(path.dirname(destinos[1]), { recursive: true });
  const anteriores = await Promise.all(destinos.map(existe));
  if (anteriores.some(Boolean) && !opciones.sustituir) throw new PdfExistenteError();

  const marca = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const temporales = destinos.map(d => `${d}.${marca}.tmp`);
  const copias = destinos.map(d => `${d}.${marca}.bak`);
  const escritos: number[] = [];
  try {
    // Preparar ambas copias antes de tocar los PDF publicados.
    for (let i = 0; i < destinos.length; i++) {
      await writeFile(temporales[i], contenido, { flag: "wx" });
      if (anteriores[i]) await copyFile(destinos[i], copias[i], constants.COPYFILE_EXCL);
    }
    for (let i = 0; i < destinos.length; i++) {
      if (opciones.sustituir) {
        await rename(temporales[i], destinos[i]);
      } else {
        // No sobrescribir un fichero que haya aparecido desde la comprobación.
        await copyFile(temporales[i], destinos[i], constants.COPYFILE_EXCL);
      }
      escritos.push(i);
    }
    for (const destino of destinos) {
      if (!Buffer.from(await readFile(destino)).equals(Buffer.from(contenido))) {
        throw new Error(`La copia del PDF no coincide: ${destino}`);
      }
    }
  } catch (error) {
    const fallos: string[] = [];
    for (const i of escritos.reverse()) {
      try {
        if (anteriores[i]) await rename(copias[i], destinos[i]);
        else await rm(destinos[i], { force: true });
      } catch {
        fallos.push(destinos[i]);
      }
    }
    if (fallos.length) throw new Error(`Archivo incompleto. Revisa ${fallos.join(", ")}; se conservan las copias .bak para recuperar los PDF anteriores.`);
    await Promise.all(copias.map(d => rm(d, { force: true }).catch(() => {})));
    if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new PdfExistenteError();
    throw error;
  } finally {
    await Promise.all(temporales.map(d => rm(d, { force: true }).catch(() => {})));
  }
  await Promise.all(copias.map(d => rm(d, { force: true }).catch(() => {})));
  return destinos;
}
