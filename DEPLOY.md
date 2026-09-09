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
`2026/AR2603583.pdf`. En PLANTEAMIENTOS se guarda `AR2603583-10.pdf`.
El pedido se normaliza a mayúsculas y sin puntos en ambos nombres.
Las dos carpetas raíz deben existir y tener permiso de escritura. Si falta
alguna ruta o falla una copia, Guardar planteamiento devuelve un error y no
registra el archivo como completado. La vista previa sigue disponible sin rutas.

En Revisión, seleccionar **Revisado por** junto a **Guardar planteamiento**.
El nombre se imprime en todas las páginas del PDF y queda registrado al
completarse ambas copias. Las aprobaciones y devoluciones se hacen en Coordina.

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

## 6. Copia diaria de los datos en modo file

`scripts/backup-data.sh` guarda los JSON de `data/` en `backups/` y en
`/mnt/oftecnica/remolques-backups`. Valida los JSON, comprueba el archivo
comprimido y compara la copia remota con la local antes de darla por buena.
Conserva 30 días de copias completas. No copia credenciales ni los PDF de las
carpetas compartidas; estos deben seguir incluidos en el backup del servidor
de archivos. SQL Server necesita su propio mecanismo de backup.

Se ejecuta con el mismo usuario que la app. Si esta está online, **la detiene
brevemente para copiar sus datos** y la reanuda antes de transferir a la red.
Si falla la lectura o compresión, intenta reanudar igualmente. Una app que ya
estaba parada sigue parada. No se modifican los datos originales.

Si `data/` aún no tiene JSON (instalación nueva sin guardar nada), el resultado
será `SIN DATOS`; no se genera un archivo vacío que parezca un respaldo válido.
Guardar un pedido de prueba antes de comprobar la primera copia real.

Primera ejecución, en una pausa de uso:

```bash
cd /webs/remolques-tgm
git pull --ff-only
mkdir -p logs
bash scripts/backup-data.sh
ls -lh backups/remolques-tgm-*.tar.gz /mnt/oftecnica/remolques-backups/remolques-tgm-*.tar.gz
```

La instalación comprobada usa root para PM2 y Node bajo nvm. El cron debe
guardar el PATH real para encontrar tanto Node como PM2. Estos comandos
instalan una tarea específica sin reemplazar los cron de las otras webs:

```bash
cd /webs/remolques-tgm
node_dir=$(dirname "$(command -v node)")
pm2_dir=$(dirname "$(command -v pm2)")
printf 'SHELL=/bin/bash\nPATH=%s:%s:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\n30 2 * * * root /bin/bash /webs/remolques-tgm/scripts/backup-data.sh >> /webs/remolques-tgm/logs/backup.log 2>&1\n' "$node_dir" "$pm2_dir" > /etc/cron.d/remolques-tgm-backup
chmod 644 /etc/cron.d/remolques-tgm-backup
systemctl is-active cron
cat /etc/cron.d/remolques-tgm-backup
```

Si cron no está activo, activarlo con `systemctl enable --now cron` (en
distribuciones con servicio `crond`, adaptar el nombre). Se ejecuta a las
**02:30 de la hora local del servidor**. Al cambiar la versión de Node de nvm,
repetir la instalación del cron para actualizar el PATH. Estos cambios de
scripts no necesitan recompilar Next.js.

Comprobación manual con el PATH reducido del cron:

```bash
env PATH="$node_dir:$pm2_dir:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" /bin/bash /webs/remolques-tgm/scripts/backup-data.sh >> /webs/remolques-tgm/logs/backup.log 2>&1
tail -n 30 /webs/remolques-tgm/logs/backup.log
```

El éxito termina con `OK: copia terminada`. Revisar periódicamente el log y
la fecha de las copias; este cron no configura avisos automáticos. Si la red
falla, queda una copia local y se registra error, sin rotar las anteriores.

Para probar la recuperación sin tocar los datos activos, elegir una copia
completa real y descomprimirla en un directorio de prueba:

```bash
copia=/mnt/oftecnica/remolques-backups/remolques-tgm-FECHA.tar.gz
prueba=$(mktemp -d /tmp/remolques-restauracion.XXXXXXXX)
tar -xzf "$copia" -C "$prueba"
node -e 'const fs=require("node:fs");const path=require("node:path");const dir=path.join(process.argv[1],"data");const files=fs.readdirSync(dir).filter(f=>f.endsWith(".json"));if(!files.length)throw new Error("Copia sin datos");for(const f of files){JSON.parse(fs.readFileSync(path.join(dir,f),"utf8"));console.log("JSON válido:",f)}' "$prueba"
```

Para una recuperación real, con esa copia ya verificada y en una pausa de uso:

```bash
(
set -e
cd /webs/remolques-tgm
pm2 stop remolques-tgm
# Conservar los datos actuales para poder deshacer la recuperación.
mkdir -p backups
rescate=$(mktemp -d "$PWD/backups/antes-restauracion.XXXXXXXX")
if [ -d data ]; then mv -- data "$rescate/data"; fi
cp -a -- "$prueba/data" ./data && pm2 restart remolques-tgm
)
```

Si falla algún paso, conservar las carpetas y corregir el error antes de
reanudar. Comprobar el historial y los parámetros en la web tras restaurar.

Referencias: [ecosystem de PM2](https://pm2.keymetrics.io/docs/usage/application-declaration/),
[arranque de PM2 con Linux](https://pm2.keymetrics.io/docs/usage/startup/)
y la guía `node_modules/next/dist/docs/01-app/02-guides/self-hosting.md`
de la versión de Next.js instalada.
