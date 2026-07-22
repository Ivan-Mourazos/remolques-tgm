import sql from "mssql";
import { getRpsPool } from "@/lib/rps/pool";
import { interpretarLineaRps, type FilaLineaRps } from "@/lib/rps/interpretar-linea";
import { normalizarNumeroPedidoRps } from "@/lib/rps/numero-pedido";
import type { PedidoRps } from "@/lib/rps/types";

const fechaIso = (value: Date | null): string | null => value ? value.toISOString().slice(0, 10) : null;

export async function pedidoRpsPorNumero(numero: string): Promise<PedidoRps | null> {
  const normalizado = normalizarNumeroPedidoRps(numero);
  if (!/^[A-Z]{2}\d{5,}$/.test(normalizado)) return null;
  const poolPromise = getRpsPool();
  if (!poolPromise) throw new Error("La conexión de RPS no está configurada.");
  const pool = await poolPromise;

  const cabeceraResult = await pool.request()
    .input("numero", sql.VarChar(50), normalizado)
    .query(`SELECT TOP 1 o.IDOrder, o.CodOrder AS numero, o.OrderDate AS fecha,
        o.ReceptionDemandDate AS fechaSalida,
        c.CodCustomer AS codigo,
        LTRIM(RTRIM(COALESCE(NULLIF(c.CompanyName, ''), c.Description))) AS nombre,
        NULLIF(LTRIM(RTRIM(cc.Alias)), '') AS alias
      FROM dbo.FACOrderSL o
      INNER JOIN dbo.FACCustomer c ON c.IDCustomer = o.IDCustomer
      LEFT JOIN dbo._FACCustomer_Custom cc ON cc.IDCustomer = c.IDCustomer
      WHERE o.CodCompany = '001'
        AND REPLACE(REPLACE(UPPER(o.CodOrder), '.', ''), ' ', '') = @numero
      ORDER BY o.OrderDate DESC`);
  const cabecera = cabeceraResult.recordset[0] as {
    IDOrder: string;
    numero: string;
    fecha: Date | null;
    fechaSalida: Date | null;
    codigo: string;
    nombre: string;
    alias: string | null;
  } | undefined;
  if (!cabecera) return null;

  const lineasResult = await pool.request()
    .input("idOrder", sql.VarChar(255), cabecera.IDOrder)
    .query(`SELECT l.IDOrderLine, l.NumLine, l.Description, l.Comment, l.Quantity,
        article.CodArticle, mo.CodManufacturingOrder,
        tipoRotulacion.Rotulado,
        tipoRotulacion.DescripcionTipoRotulacion AS TipoRotulacion,
        lineaCustom.TextoRotulacion
      FROM dbo.FACOrderLineSL l
      LEFT JOIN dbo.STKArticle article ON article.IDArticle = l.IDArticle
      LEFT JOIN dbo.CPRManufacturingOrder mo ON mo.IDManufacturingOrder = l.IDManufacturingOrder
      LEFT JOIN dbo._FACOrderLineSL_Custom lineaCustom ON lineaCustom.IDOrderLine = l.IDOrderLine
      LEFT JOIN dbo._TipoRotulacion tipoRotulacion
        ON tipoRotulacion.IDTipoRotulacion = lineaCustom.IDTipoRotulacion
      WHERE l.IDOrder = @idOrder
      ORDER BY l.NumLine`);
  const lineas = (lineasResult.recordset as FilaLineaRps[])
    .map(interpretarLineaRps)
    .filter((linea): linea is NonNullable<typeof linea> => linea !== null);

  return {
    numero: String(cabecera.numero).trim(),
    fecha: fechaIso(cabecera.fecha),
    fechaSalida: fechaIso(cabecera.fechaSalida),
    cliente: {
      codigo: String(cabecera.codigo).trim(),
      nombre: String(cabecera.nombre).trim(),
      alias: cabecera.alias?.trim() || null,
    },
    lineas,
  };
}
