import sql from "mssql";
import type { ListadoFiltro, PlanteamientoRecord, PlanteamientoStore } from "@/lib/store/types";
import { DEFAULT_PARAMS, type CalcParams } from "@/lib/calc/params";
import { normalizarParams } from "@/lib/calc/validar-params";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToRecord(row: any): PlanteamientoRecord {
  return {
    id: row.Id, tipo: row.Tipo,
    numeroPedido: row.NumeroPedido, version: row.Version, cliente: row.Cliente,
    input: JSON.parse(row.InputJson), result: JSON.parse(row.ResultJson),
    paramsSnapshot: JSON.parse(row.ParamsJson),
    snapshotSvg: row.SnapshotSvg ?? null,
    createdAt: new Date(row.CreatedAt).toISOString(),
    updatedAt: new Date(row.UpdatedAt).toISOString(),
  };
}

function config(): sql.config {
  const req = (name: string) => {
    const v = process.env[name];
    if (!v) throw new Error(`Falta ${name} en .env.local`);
    return v;
  };
  return {
    server: req("DB_HOST"),
    port: Number(process.env.DB_PORT ?? 1433),
    database: req("DB_DATABASE"),
    user: req("DB_USER"),
    password: req("DB_PASSWORD"),
    options: {
      encrypt: process.env.DB_ENCRYPT !== "false",
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== "false",
    },
    pool: { max: 5, min: 0, idleTimeoutMillis: 30_000 },
    connectionTimeout: 10_000,
  };
}

export class MssqlStore implements PlanteamientoStore {
  private pool: Promise<sql.ConnectionPool> | null = null;

  private getPool(): Promise<sql.ConnectionPool> {
    if (!this.pool) {
      this.pool = new sql.ConnectionPool(config()).connect().catch((e) => {
        this.pool = null;
        throw e;
      });
    }
    return this.pool;
  }

  async list(filtro?: ListadoFiltro): Promise<PlanteamientoRecord[]> {
    const pool = await this.getPool();
    const req = pool.request()
      .input("limit", sql.Int, filtro?.limit ?? 200)
      .input("tipo", sql.VarChar, filtro?.tipo ?? null)
      .input("pedido", sql.VarChar, filtro?.pedido ?? null)
      .input("texto", sql.NVarChar, filtro?.texto ? `%${filtro.texto}%` : null);
    const res = await req.query(`
      SELECT TOP (@limit) * FROM dbo.Planteamientos
      WHERE (@tipo IS NULL OR Tipo = @tipo)
        AND (@pedido IS NULL OR NumeroPedido = @pedido)
        AND (@texto IS NULL OR NumeroPedido LIKE @texto OR Cliente LIKE @texto)
      ORDER BY UpdatedAt DESC`);
    return res.recordset.map(rowToRecord);
  }

  async get(id: string): Promise<PlanteamientoRecord | null> {
    const pool = await this.getPool();
    const res = await pool.request().input("id", sql.UniqueIdentifier, id)
      .query("SELECT * FROM dbo.Planteamientos WHERE Id = @id");
    return res.recordset[0] ? rowToRecord(res.recordset[0]) : null;
  }

  async save(
    rec: Omit<PlanteamientoRecord, "id" | "createdAt" | "updatedAt"> & { id?: string },
  ): Promise<PlanteamientoRecord> {
    const pool = await this.getPool();
    const req = pool.request()
      .input("id", sql.UniqueIdentifier, rec.id ?? null)
      .input("tipo", sql.VarChar, rec.tipo)
      .input("pedido", sql.VarChar, rec.numeroPedido)
      .input("version", sql.VarChar, rec.version)
      .input("cliente", sql.NVarChar, rec.cliente)
      .input("input", sql.NVarChar, JSON.stringify(rec.input))
      .input("result", sql.NVarChar, JSON.stringify(rec.result))
      .input("params", sql.NVarChar, JSON.stringify(rec.paramsSnapshot))
      .input("snapshotSvg", sql.NVarChar, rec.snapshotSvg ?? null);
    const res = await req.query(`
      MERGE dbo.Planteamientos AS t
      USING (SELECT COALESCE(@id, NEWID()) AS Id) AS s ON t.Id = s.Id
      WHEN MATCHED THEN UPDATE SET Tipo=@tipo, NumeroPedido=@pedido, Version=@version,
        Cliente=@cliente, InputJson=@input, ResultJson=@result, ParamsJson=@params,
        SnapshotSvg=@snapshotSvg, UpdatedAt=SYSUTCDATETIME()
      WHEN NOT MATCHED THEN INSERT (Id, Tipo, NumeroPedido, Version, Cliente, InputJson, ResultJson, ParamsJson, SnapshotSvg)
        VALUES (s.Id, @tipo, @pedido, @version, @cliente, @input, @result, @params, @snapshotSvg)
      OUTPUT inserted.*;`);
    return rowToRecord(res.recordset[0]);
  }

  async getParams(): Promise<CalcParams> {
    const pool = await this.getPool();
    const res = await pool.request().query("SELECT ParamsJson FROM dbo.Parametros WHERE Id = 1");
    return res.recordset[0] ? normalizarParams(JSON.parse(res.recordset[0].ParamsJson)) : DEFAULT_PARAMS;
  }

  async saveParams(p: CalcParams): Promise<void> {
    const pool = await this.getPool();
    await pool.request().input("json", sql.NVarChar, JSON.stringify(p)).query(`
      MERGE dbo.Parametros AS t USING (SELECT 1 AS Id) AS s ON t.Id = s.Id
      WHEN MATCHED THEN UPDATE SET ParamsJson = @json, UpdatedAt = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN INSERT (Id, ParamsJson) VALUES (1, @json);`);
  }
}
