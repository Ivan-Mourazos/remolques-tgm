# Remolques TGM — Planteamientos

Aplicación interna de oficina técnica para calcular los planteamientos de
fabricación de lonas de remolque y baquetones (paños a cortar, contorno de
corte, reparto de ollaos) y emitir la hoja de taller.

## Qué hace

- **Planteamiento**: formulario por pasos con vista técnica acotada del remolque.
- **PDF**: hoja de taller A4 apaisada; si el pedido tiene varias versiones
  (-10, -11…), un único PDF con una página por remolque.
- **Excel**: hoja de cálculo por remolque (paridad con el Excel histórico).
- **Historial**: búsqueda por pedido/cliente y «Reutilizar».
- **Parámetros**: demasías y recogidas editables (hoja PAR), validadas al guardar.

Los ficheros se entregan con «Guardar como»: el usuario elige la carpeta.

## Desarrollo

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm test       # vitest
pnpm lint
```

Configuración en `.env.local`: `DATASOURCE=file` guarda en `data/`
(desarrollo); `DATASOURCE=mssql` usa el SQL Server que administre IT
(esquema en `db/schema.sql`, variables `DB_*`). El catálogo de materiales se
lee de RPS en solo lectura (variables `RPS_DB_*`).

## Estructura

- `src/lib/calc` — cálculo puro (lona, baquetón, ollaos, parámetros).
- `src/lib/geometry` — perfiles y geometría del dibujo técnico.
- `src/lib/pdf` / `src/lib/excel` — generación de documentos.
- `src/lib/store` — persistencia (FileStore / MssqlStore) tras una interfaz común.
- `src/components/workspace` — formulario, vista técnica y resultados.
