export function normalizarNumeroPedidoRps(value: string): string {
  return value.trim().toLocaleUpperCase("es-ES").replace(/[^A-Z0-9]/g, "");
}

