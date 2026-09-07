import { existsSync } from "node:fs";
import { join } from "node:path";
import { Font } from "@react-pdf/renderer";

const PESOS = [
  { fichero: "Inter-Regular.ttf", fontWeight: 400 },
  { fichero: "Inter-SemiBold.ttf", fontWeight: 600 },
  { fichero: "Inter-Bold.ttf", fontWeight: 700 },
] as const;

let familia: string | null = null;

/**
 * Registra Inter una sola vez y devuelve la familia que debe usar la hoja.
 * Si faltase algún fichero devuelve "Helvetica", que @react-pdf trae de serie:
 * una hoja de taller no puede dejar de salir por una fuente.
 */
export function registrarFuentes(): string {
  if (familia !== null) return familia;
  const fuentes = PESOS.map((peso) => ({
    src: join(process.cwd(), "public", "fuentes", peso.fichero),
    fontWeight: peso.fontWeight,
  }));
  if (!fuentes.every((fuente) => existsSync(fuente.src))) {
    familia = "Helvetica";
    return familia;
  }
  Font.register({ family: "Inter", fonts: [...fuentes] });
  familia = "Inter";
  return familia;
}
