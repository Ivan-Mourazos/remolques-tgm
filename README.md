# Remolques TGM — Planteamientos

Aplicación interna de oficina técnica para calcular los planteamientos de
fabricación de lonas de remolque y baquetones (paños a cortar, contorno de
corte, reparto de ollaos) y emitir la hoja de taller.

## Qué hace

- **Planteamiento**: espacio de trabajo organizado por pedido. Tras introducir
  el número, se pueden añadir remolques o baquetones, cambiar entre ellos y
  editarlos con el pedido activo siempre visible.
- **PDF**: hoja de taller A4 apaisada. Todos los remolques del pedido van como
  páginas de un único `<pedido>-10.pdf`; ya no se crean -11, -12… El mismo
  fichero se archiva en ESCÁNER/PLANTEAMIENTOS y OFICINA TÉCNICA/<año>.
- **Historial**: búsqueda por pedido/cliente, agrupación de sus remolques y
  «Reutilizar». Las versiones internas 10, 11, 12… identifican la posición del
  remolque dentro del pedido, pero el documento final siempre termina en `-10`.
- **Parámetros**: demasías y recogidas editables (hoja PAR), validadas al guardar.

En producción Linux, el PDF se archiva en las dos rutas configuradas. Sin esas
variables (desarrollo local), se descarga en el navegador como respaldo.

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

El archivo de planteamientos usa dos rutas Linux:

```bash
RUTA_PLANTEAMIENTOS=/ruta/linux/de/la/carpeta-compartida/planteamientos
RUTA_OFICINA_TECNICA=/ruta/linux/de/la/carpeta-compartida/oficina-tecnica
```

Son los puntos de montaje que vea Linux, no las letras de unidad de Windows.
La segunda recibe automáticamente el subdirectorio del año indicado por los dos
dígitos posteriores a `AR`: `AR2603583` se archiva en `2026/`.

## Estructura

- `src/lib/calc` — cálculo puro (lona, baquetón, ollaos, parámetros).
- `src/lib/geometry` — perfiles y geometría del dibujo técnico.
- `src/lib/pdf` — generación y archivo duplicado del documento de taller.
- `src/lib/store` — persistencia (FileStore / MssqlStore) tras una interfaz común.
- `src/components/workspace` — formulario, vista técnica y resultados.
