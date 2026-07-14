import sql from "mssql";
import { MATERIALES_SEED, type Material } from "@/lib/calc/materiales-seed";

// Subfamilia "PLASTICA (LONA)" (lonas PVC) de la empresa 001 en RPSNext.
const SUBFAMILIA_PLASTICA_LONA = "8fcf241e-fcfa-4760-8992-26e35c031ffc";
const CACHE_MS = 60 * 60 * 1000;

let cache: { data: Material[]; at: number } | null = null;
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
  rows: Array<{ CodArticle: string; Description: string }>,
): Material[] {
  return rows
    .map((r) => ({
      codigoBobina: (r.CodArticle ?? "").trim(),
      nombre: (r.Description ?? "").trim(),
    }))
    .filter((m) => m.codigoBobina !== "" && m.nombre !== "");
}

/**
 * Lonas PVC de RPS: artículos activos de la empresa 001, subfamilia
 * PLASTICA (LONA), solo variantes reales de bobina (Description con
 * ':COLOR :ANCHO'). Caché 1 h; si RPS no responde, última caché o semilla TC.
 */
export async function getMateriales(): Promise<Material[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.data;
  const poolPromise = getPool();
  if (!poolPromise) return cache?.data ?? MATERIALES_SEED; // RPS sin configurar
  try {
    const p = await poolPromise;
    const res = await p.request().input("sub", sql.VarChar, SUBFAMILIA_PLASTICA_LONA)
      .query(`
        SELECT CodArticle, Description FROM STKArticle
        WHERE CodCompany = '001'
          AND IDProductSubFamily = @sub
          AND InactiveDate IS NULL
          AND Description LIKE '%:%:%'
        ORDER BY Description`);
    const data = rowsToMateriales(res.recordset);
    if (data.length > 0) {
      cache = { data, at: Date.now() };
      return data;
    }
    return cache?.data ?? MATERIALES_SEED;
  } catch {
    return cache?.data ?? MATERIALES_SEED;
  }
}
