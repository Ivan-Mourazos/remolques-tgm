import sql from "mssql";

let pool: Promise<sql.ConnectionPool> | null = null;

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
    options: {
      // RPS está en SQL Server 2014 dentro de la red interna.
      encrypt: false,
      trustServerCertificate: true,
      readOnlyIntent: true,
    },
    pool: { max: 5, min: 0, idleTimeoutMillis: 30_000 },
    connectionTimeout: 8_000,
    requestTimeout: 30_000,
  };
}

/** Pool compartido para todas las consultas de solo lectura a RPS. */
export function getRpsPool(): Promise<sql.ConnectionPool> | null {
  if (!pool) {
    const cfg = config();
    if (!cfg) return null;
    pool = new sql.ConnectionPool(cfg).connect().catch((error) => {
      pool = null;
      throw error;
    });
  }
  return pool;
}

