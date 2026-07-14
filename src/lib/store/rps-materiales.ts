import sql from "mssql";
import { MATERIALES_SEED, type Material } from "@/lib/calc/materiales-seed";

// Subfamilia "PLASTICA (LONA)" (lonas PVC) de la empresa 001 en RPSNext.
const SUBFAMILIA_PLASTICA_LONA = "8fcf241e-fcfa-4760-8992-26e35c031ffc";
// Almacén "NUEVA SEDE ARZÚA" (donde se mira el stock de lona).
const ALMACEN_ARZUA = "001-5";
const CACHE_MS = 60 * 60 * 1000;

let cache: { data: Material[]; at: number } | null = null;

/** Materiales de producción: familias PVC identificadas como 580 o 650. */
export function esLonaPvcProduccion(descripcion: string): boolean {
  const nombre = descripcion.trim().toUpperCase();
  return /^LONA\b/.test(nombre) && /(?:^|\D)(?:580|650)(?:\D|$)/.test(nombre);
}

const materialesSeedProduccion = () =>
  MATERIALES_SEED.filter((material) => esLonaPvcProduccion(material.nombre));
let pool: Promise<sql.ConnectionPool> | null = null;

/** Conexión a RPS (solo lectura). Credenciales solo por entorno — nunca en código. */
function config(): sql.config | null {
  const server = process.env.RPS_DB_HOST;
  const database = process.env.RPS_DB_DATABASE;
  const user = process.env.RPS_DB_USER;
  const password = process.env.RPS_DB_PASSWORD;
  if (!server || !database || !user || !password) return null;
  return {
    server,
    port: Number(process.env.RPS_DB_PORT ?? 1433),
    database,
    user,
    password,
    // SQL Server 2014: TLS viejo no negocia con Node moderno → sin cifrado (red interna).
    options: { encrypt: false, trustServerCertificate: true },
    pool: { max: 2, min: 0, idleTimeoutMillis: 30_000 },
    connectionTimeout: 8_000,
  };
}

function getPool(): Promise<sql.ConnectionPool> | null {
  if (!pool) {
    const cfg = config();
    if (!cfg) return null; // RPS no configurado → se usará la semilla
    pool = new sql.ConnectionPool(cfg).connect().catch((e) => {
      pool = null;
      throw e;
    });
  }
  return pool;
}

export function rowsToMateriales(
  rows: Array<{ CodArticle: string; Description: string; StockArzua?: number | null }>,
): Material[] {
  return rows
    .map((r) => ({
      codigoBobina: (r.CodArticle ?? "").trim(),
      nombre: (r.Description ?? "").trim(),
      stockArzua: r.StockArzua != null ? Number(r.StockArzua) : null,
    }))
    .filter((m) =>
      m.codigoBobina !== "" && m.nombre !== "" && esLonaPvcProduccion(m.nombre),
    );
}

/**
 * Lonas PVC de RPS: artículos activos de la empresa 001, subfamilia
 * PLASTICA (LONA), solo variantes reales de bobina (Description con
 * ':COLOR :ANCHO'), con el stock en la Nueva sede de Arzúa. Caché 1 h; si RPS
 * no responde, última caché o semilla TC.
 */
export async function getMateriales(): Promise<Material[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.data;
  const poolPromise = getPool();
  if (!poolPromise) return cache?.data ?? materialesSeedProduccion(); // RPS sin configurar
  try {
    const p = await poolPromise;
    const res = await p.request()
      .input("sub", sql.VarChar, SUBFAMILIA_PLASTICA_LONA)
      .input("alm", sql.VarChar, ALMACEN_ARZUA)
      .query(`
        SELECT a.CodArticle, a.Description, st.StockArzua
        FROM STKArticle a
        LEFT JOIN (
          SELECT IDArticle, SUM(Stock) AS StockArzua
          FROM STKStock
          WHERE CodCompany = '001' AND IDWarehouse = @alm
          GROUP BY IDArticle
        ) st ON st.IDArticle = a.IDArticle
        WHERE a.CodCompany = '001'
          AND a.IDProductSubFamily = @sub
          AND a.InactiveDate IS NULL
          AND a.Description LIKE '%:%:%'
          AND (a.Description LIKE '%580%' OR a.Description LIKE '%650%')
        ORDER BY a.Description`);
    const data = rowsToMateriales(res.recordset);
    if (data.length > 0) {
      cache = { data, at: Date.now() };
      return data;
    }
    return cache?.data ?? materialesSeedProduccion();
  } catch {
    return cache?.data ?? materialesSeedProduccion();
  }
}
