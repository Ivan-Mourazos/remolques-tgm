import type { PlanteamientoRecord, TipoPlanteamiento } from "@/lib/store/types";
import { normalizarNumeroPedido } from "@/lib/pedidos/numero-pedido";

const numeroVersion = (version: string) => {
  const numero = Number(version);
  return Number.isFinite(numero) ? numero : Number.MAX_SAFE_INTEGER;
};

/** Conserva solo el guardado más reciente de cada remolque (10, 11, 12…). */
export function remolquesUnicos(registros: PlanteamientoRecord[]): PlanteamientoRecord[] {
  const unicos = new Map<string, PlanteamientoRecord>();
  for (const registro of registros) {
    const pedido = normalizarNumeroPedido(registro.numeroPedido) || `SIN-PEDIDO:${registro.id}`;
    const clave = `${pedido}:${registro.version.trim() || registro.id}`;
    const anterior = unicos.get(clave);
    if (!anterior || registro.updatedAt > anterior.updatedAt) unicos.set(clave, registro);
  }
  return [...unicos.values()].sort((a, b) => (
    numeroVersion(a.version) - numeroVersion(b.version)
    || a.createdAt.localeCompare(b.createdAt)
  ));
}

export interface GrupoPedido {
  clave: string;
  numeroPedido: string;
  cliente: string;
  updatedAt: string;
  remolques: PlanteamientoRecord[];
}

export function agruparPorPedido(registros: PlanteamientoRecord[]): GrupoPedido[] {
  const grupos = new Map<string, PlanteamientoRecord[]>();
  for (const registro of registros) {
    const clave = normalizarNumeroPedido(registro.numeroPedido) || `SIN-PEDIDO:${registro.id}`;
    grupos.set(clave, [...(grupos.get(clave) ?? []), registro]);
  }
  return [...grupos.entries()].map(([clave, candidatos]) => {
    const remolques = remolquesUnicos(candidatos);
    const reciente = [...remolques].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    return {
      clave,
      numeroPedido: reciente?.numeroPedido || "SIN PEDIDO",
      cliente: reciente?.cliente ?? "",
      updatedAt: reciente?.updatedAt ?? "",
      remolques,
    };
  }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function nombreRemolque(version: string): string {
  const indice = Number(version) - 9;
  return Number.isInteger(indice) && indice > 0 ? `Remolque ${indice}` : `Remolque ${version}`;
}

export function nombreElementoPedido(version: string, tipo: TipoPlanteamiento): string {
  const indice = Number(version) - 9;
  const nombre = tipo === "lona" ? "Remolque" : "Baquetón";
  return Number.isInteger(indice) && indice > 0 ? `${nombre} ${indice}` : `${nombre} ${version}`;
}

export function siguienteVersionPedido(registros: Pick<PlanteamientoRecord, "version">[]): string {
  const ultima = registros.reduce((maximo, registro) => {
    const version = Number(registro.version);
    return Number.isInteger(version) ? Math.max(maximo, version) : maximo;
  }, 9);
  return String(ultima + 1);
}
