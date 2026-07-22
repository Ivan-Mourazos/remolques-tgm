import type { Material } from "@/lib/calc/materiales-seed";
import type { LineaPedidoRps } from "@/lib/rps/types";

const normalizar = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^A-Z0-9]+/gi, " ")
  .trim()
  .toLocaleUpperCase("es-ES");

/** Bobina compatible con gramaje/color de RPS que tiene más stock en Arzúa. */
export function materialPreferidoRps(linea: LineaPedidoRps, materiales: Material[]): string {
  const { gramaje, color } = linea.materialRps;
  if (!color) return "";
  const tokensColor = normalizar(color).split(" ")
    .filter((token) => token.length >= 3 || /^\d{3,4}$/.test(token));
  const candidatas = materiales.filter((material) => {
    const nombre = normalizar(material.nombre);
    if (gramaje && !nombre.includes(String(gramaje))) return false;
    return tokensColor.every((token) => nombre.includes(token));
  });
  if (candidatas.length === 0) return "";
  candidatas.sort((a, b) => {
    const stockA = a.stockArzua == null ? Number.NEGATIVE_INFINITY : Number(a.stockArzua);
    const stockB = b.stockArzua == null ? Number.NEGATIVE_INFINITY : Number(b.stockArzua);
    return stockB - stockA || a.nombre.localeCompare(b.nombre, "es");
  });
  return candidatas[0].nombre;
}

