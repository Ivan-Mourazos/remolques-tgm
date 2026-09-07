import sql from "mssql";
import type {
  DecisionFirme, EstadoPedido, EstadoRevision, Produccion,
} from "@/lib/pedidos/estado-pedido";
import type { PedidosStore } from "@/lib/store/pedidos-types";
import { normalizarNumeroPedido } from "@/lib/pedidos/numero-pedido";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function filaAEstado(row: any): EstadoPedido {
  return {
    pedido: row.Pedido,
    numeroPedido: row.NumeroPedido,
    revision: {
      estado: row.RevisionEstado as EstadoRevision,
      por: row.RevisionPor,
      en: new Date(row.RevisionEn).toISOString(),
    },
    ultimaDecision: row.UltimaDecisionJson
      ? (JSON.parse(row.UltimaDecisionJson) as DecisionFirme)
      : null,
    produccion: row.ProduccionJson
      ? (JSON.parse(row.ProduccionJson) as Produccion)
      : null,
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

export class PedidosMssqlStore implements PedidosStore {
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

  async get(pedido: string): Promise<EstadoPedido | null> {
    const pool = await this.getPool();
    const res = await pool.request()
      .input("pedido", sql.VarChar, normalizarNumeroPedido(pedido))
      .query("SELECT * FROM dbo.PedidosRevision WHERE Pedido = @pedido");
    return res.recordset[0] ? filaAEstado(res.recordset[0]) : null;
  }

  async list(): Promise<EstadoPedido[]> {
    const pool = await this.getPool();
    const res = await pool.request()
      .query("SELECT * FROM dbo.PedidosRevision ORDER BY UpdatedAt DESC");
    return res.recordset.map(filaAEstado);
  }

  async save(estado: EstadoPedido): Promise<EstadoPedido> {
    const pool = await this.getPool();
    const clave = normalizarNumeroPedido(estado.pedido || estado.numeroPedido);
    const res = await pool.request()
      .input("pedido", sql.VarChar, clave)
      .input("numeroPedido", sql.VarChar, estado.numeroPedido)
      .input("revisionEstado", sql.VarChar, estado.revision.estado)
      .input("revisionPor", sql.NVarChar, estado.revision.por)
      .input("revisionEn", sql.DateTime2, new Date(estado.revision.en))
      .input("ultimaDecision", sql.NVarChar,
        estado.ultimaDecision ? JSON.stringify(estado.ultimaDecision) : null)
      .input("produccion", sql.NVarChar,
        estado.produccion ? JSON.stringify(estado.produccion) : null)
      .input("updatedAt", sql.DateTime2, new Date(estado.updatedAt))
      .query(`
        MERGE dbo.PedidosRevision AS t
        USING (SELECT @pedido AS Pedido) AS s ON t.Pedido = s.Pedido
        WHEN MATCHED THEN UPDATE SET NumeroPedido=@numeroPedido,
          RevisionEstado=@revisionEstado, RevisionPor=@revisionPor, RevisionEn=@revisionEn,
          UltimaDecisionJson=@ultimaDecision, ProduccionJson=@produccion, UpdatedAt=@updatedAt
        WHEN NOT MATCHED THEN INSERT
          (Pedido, NumeroPedido, RevisionEstado, RevisionPor, RevisionEn,
           UltimaDecisionJson, ProduccionJson, UpdatedAt)
          VALUES (s.Pedido, @numeroPedido, @revisionEstado, @revisionPor, @revisionEn,
            @ultimaDecision, @produccion, @updatedAt)
        OUTPUT inserted.*;`);
    return filaAEstado(res.recordset[0]);
  }
}
