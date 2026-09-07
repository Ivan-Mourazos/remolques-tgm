# Despliegue en Linux con PM2

Mismo esquema que CoordinaOT e Historial de pedidos: Next.js con `next start`,
una instancia de Node y credenciales en `.env.local`. El archivo se llama
`ecosystem.config.cjs`.

Ruta propuesta: `/webs/remolques-tgm`, en el servidor de las otras webs
(`192.168.0.90`, según la documentación de CoordinaOT). Puerto propuesto: **4500**.
Las configuraciones vecinas usan 4000, 4100, 4200, 4300 y 4400; hay que comprobar
los puertos reales del servidor antes de arrancar.

## 1. Preparar el servidor

Usar **el mismo usuario Linux que administra las otras webs con PM2**.
`sudo pm2` crea otro entorno de procesos y no debe usarse para arrancar esta app.

```bash
node --version
pnpm --version
pm2 list
ss -ltnp 'sport = :4500'
```

Si `ss` muestra un proceso en 4500, elegir otro puerto y cambiar `args` en
`ecosystem.config.cjs` y las URL de esta guía antes de continuar.

Entorno de referencia local: Node **24.17.0**, pnpm **11.3.0**. Mantener las
herramientas ya instaladas si son compatibles; no actualizar globalmente las
herramientas del servidor sin revisar las otras webs. El lockfile es de pnpm.
La compilación necesita también las dependencias de desarrollo.
El servidor necesita salida a GitHub y al registro de paquetes para instalar;
`next build` descarga Plus Jakarta Sans desde Google Fonts, por lo que también
necesita acceso a `fonts.googleapis.com` y `fonts.gstatic.com` al compilar.

La app es interna: permitir el puerto solo desde la LAN/VPN. Para publicarla
con un dominio, usar el proxy de las otras webs; su destino será
`http://127.0.0.1:4500`, conservando `Host` y `X-Forwarded-*` y desactivando
el buffering de respuestas. Si todo el acceso pasa por ese proxy, cambiar
`-H 0.0.0.0` por `-H 127.0.0.1` en el ecosystem.

## 2. Descargar el código

Primero deben estar subidos a GitHub los cambios locales, incluido este
ecosystem. Comprobar el commit publicado antes de clonar o actualizar.

```bash
cd /webs
git clone https://github.com/Ivan-Mourazos/remolques-tgm.git remolques-tgm
cd /webs/remolques-tgm
git log -1 --oneline
test -f ecosystem.config.cjs
mkdir -p logs
test -f .env.local || cp .env.example .env.local
chmod 600 .env.local
nano .env.local
```

Si la carpeta ya contiene un clon, usar la sección de actualización.
Si el repositorio es privado, usar la autenticación de GitHub que ya utilice
el servidor; no introducir tokens en la URL del repositorio.

## 3. Configurar los datos y el archivo PDF

Para producción, configurar `DATASOURCE=mssql` y las variables `DB_HOST`,
`DB_PORT`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD`, `DB_ENCRYPT` y
`DB_TRUST_SERVER_CERTIFICATE` del ejemplo. IT debe crear primero las tablas
de `db/schema.sql` en **la base asignada a Remolques TGM**. Ese script es para
una base nueva; no es una migración repetible ni se ejecuta en la base de RPS.

Para una prueba inicial se puede conservar `DATASOURCE=file`: los pedidos y
parámetros se guardarán en `/webs/remolques-tgm/data/`. Hacer copia de esa
carpeta y mantener una sola instancia. Cambiar después a `mssql` **no migra**
estos datos automáticamente. Los datos locales de Windows tampoco viajan
con Git: decidir cuáles deben trasladarse antes de empezar a trabajar.

`RPS_DB_*` configura por separado las consultas de pedidos y materiales,
de solo lectura. Tomar del servidor los valores que correspondan; no copiar
un `.env.local` completo de otra web porque sus variables pueden ser distintas.
Sin RPS configurado, el catálogo usa la semilla local y no se consultan pedidos
reales. No guardar contraseñas en el ecosystem ni en Git.

Para archivar los documentos de taller hay que configurar **las dos rutas**:

```dotenv
RUTA_PLANTEAMIENTOS=/ruta/linux/real/PLANTEAMIENTOS
RUTA_OFICINA_TECNICA="/ruta/linux/real/OFICINA TECNICA"
```

Son ejemplos: sustituirlos por los puntos de montaje existentes en Linux.
No sirven letras de unidad de Windows ni rutas UNC. El usuario de PM2 debe
poder crear archivos, renombrarlos y crear subcarpetas en ambos destinos.
Comprobar con `findmnt -T '/ruta/real'` que cada carpeta pertenece al recurso
compartido esperado y que se monta también tras reiniciar el servidor.
Un directorio local vacío no equivale a un recurso de red montado.

La app añade el año del pedido al segundo destino: `AR2603583` produce
`2026/AR2603583-10.pdf`. Sin las dos variables configuradas, solo se descarga
el PDF en el navegador. Con una sola variable, la generación devuelve error.

## 4. Compilar y arrancar

Ejecutar desde `/webs/remolques-tgm`. Instalar y compilar **en Linux**;
no copiar `node_modules` ni `.next` desde Windows.

```bash
pnpm install --frozen-lockfile --prod=false && pnpm build && pm2 start ecosystem.config.cjs --only remolques-tgm
```

Comprobar el resultado antes de guardar la lista de procesos:

```bash
pm2 status remolques-tgm
pm2 logs remolques-tgm --lines 50 --nostream
curl -fsS -o /dev/null -w 'HTTP %{http_code}\n' http://127.0.0.1:4500/
```

Abrir `http://192.168.0.90:4500` desde un equipo de la oficina (ajustar la IP
si es otro servidor). Verificar un pedido de prueba, su guardado e historial,
la consulta a RPS y la generación del PDF en ambos destinos. Un HTTP 200 en
la portada comprueba el servidor web, no las conexiones SQL ni el archivo PDF.

Con el proceso funcionando:

```bash
pm2 save
```

Si el usuario ya tiene PM2 configurado al iniciar Linux, basta con guardar.
Si aún no lo tiene, ejecutar `pm2 startup`, ejecutar **el comando exacto con
sudo que muestre PM2**, y después `pm2 save`. No reiniciar la máquina para esta
comprobación mientras se estén usando las otras webs.

Logs en `logs/`; incluirlos en la rotación de logs del servidor. Conservar
las copias de seguridad de la base de datos, las carpetas de PDF y, si se usa,
`data/`. Las credenciales y los datos persistentes quedan fuera de Git.

## 5. Actualizar una instalación existente

Hacerlo en una pausa de uso: esta instalación compila en la misma carpeta y
tendrá una interrupción. Anotar el commit anterior y hacer la copia de datos
correspondiente antes de actualizar. Si `git status` muestra cambios locales,
resolverlos antes de seguir.

```bash
cd /webs/remolques-tgm
git status --short
git rev-parse HEAD
pm2 stop remolques-tgm && git pull --ff-only && pnpm install --frozen-lockfile --prod=false && pnpm build && pm2 restart ecosystem.config.cjs --only remolques-tgm --update-env
```

La cadena se detiene si falla cualquier paso; en ese caso la app queda parada
hasta corregir el error y completar la compilación y el reinicio. Las otras
webs siguen ejecutándose. Repetir las comprobaciones de la sección 4 y
ejecutar `pm2 save` tras comprobar el servicio.

Si solo cambian credenciales o rutas en `.env.local`, basta con:

```bash
pm2 restart ecosystem.config.cjs --only remolques-tgm --update-env
```

El puerto se configura en `args` del ecosystem, no en `.env.local`.

Referencias: [ecosystem de PM2](https://pm2.keymetrics.io/docs/usage/application-declaration/),
[arranque de PM2 con Linux](https://pm2.keymetrics.io/docs/usage/startup/)
y la guía `node_modules/next/dist/docs/01-app/02-guides/self-hosting.md`
de la versión de Next.js instalada.
