-- Planteamientos TGM v2 — esquema para SQL Server (ejecutar en la BD que asigne IT)
CREATE TABLE dbo.Planteamientos (
  Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
  Tipo VARCHAR(10) NOT NULL CHECK (Tipo IN ('lona','baqueton')),
  NumeroPedido VARCHAR(50) NOT NULL,
  Version VARCHAR(20) NOT NULL DEFAULT '',
  Cliente NVARCHAR(200) NOT NULL DEFAULT '',
  InputJson NVARCHAR(MAX) NOT NULL,
  ResultJson NVARCHAR(MAX) NOT NULL,
  ParamsJson NVARCHAR(MAX) NOT NULL,
  SnapshotSvg NVARCHAR(MAX) NULL,
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_Planteamientos_Pedido ON dbo.Planteamientos (NumeroPedido);
CREATE INDEX IX_Planteamientos_UpdatedAt ON dbo.Planteamientos (UpdatedAt DESC);
-- Materiales: no hay tabla local; se leen de RPSNext (STKArticle) en solo lectura.

-- Parámetros de cálculo (hoja PAR): una sola fila vigente.
CREATE TABLE dbo.Parametros (
  Id INT NOT NULL PRIMARY KEY DEFAULT 1 CHECK (Id = 1),
  ParamsJson NVARCHAR(MAX) NOT NULL,
  UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
