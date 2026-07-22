export function normalizarNumeroPedido(value: string): string {
  return value.trim().toLocaleUpperCase("es-ES").replace(/[^A-Z0-9]/g, "");
}
