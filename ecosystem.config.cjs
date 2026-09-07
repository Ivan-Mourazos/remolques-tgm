// Linux + PM2, siguiendo el despliegue de CoordinaOT e Historial de pedidos.
// Preparación y comandos: DEPLOY.md. Next.js carga las credenciales de .env.local.
module.exports = {
  apps: [
    {
      name: "remolques-tgm",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      // Puerto propuesto: comprobar con ss en Linux antes del primer arranque.
      // 0.0.0.0 permite acceso directo desde la LAN, como las otras webs internas.
      args: "start -H 0.0.0.0 -p 4500",
      interpreter: "node",
      // FileStore escribe JSON compartido; mantener un único proceso.
      instances: 1,
      exec_mode: "fork",
      watch: false,
      autorestart: true,
      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 5000,
      kill_timeout: 30000,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
      },
      out_file: "logs/remolques-tgm.out.log",
      error_file: "logs/remolques-tgm.err.log",
      merge_logs: true,
      time: true,
    },
  ],
};
