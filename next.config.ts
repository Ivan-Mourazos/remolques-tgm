import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ExcelJS usa APIs nativas de Node en el Route Handler. Evitamos que
  // Webpack intente reempaquetarlo y lo cargamos directamente en el servidor.
  serverExternalPackages: ["exceljs", "mssql"],
};

export default nextConfig;
