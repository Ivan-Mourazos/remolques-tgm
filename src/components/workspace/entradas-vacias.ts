import type { LonaInput } from "@/lib/calc/lona";
import type { BaquetonInput } from "@/lib/calc/baqueton";
import { DEFAULT_PARAMS } from "@/lib/calc/params";

const cabecera = () => ({
  numeroPedido: "", version: "", cliente: "", revision: "", realizadoPor: "",
  fecha: new Date().toISOString().slice(0, 10), fechaSalida: "",
});
const sinOllaos = () => ({ laterales: [], atras: [], delante: [] });

export function emptyLona(): LonaInput {
  return {
    cabecera: cabecera(),
    cantidad: 1, largo: 0, ancho: 0, altoDelante: 0, altoAtras: 0,
    contornoScad: 0, llevaCurva: false, tipoPerfil: "TIPO 01",
    recogeDelante: "NO", recogeAtras: "NO",
    bastillaEnfundar: false, ventana: false, rotulacion: false, textoRotulacion: "",
    modoOllaos: "REPARTIDOS", pasoOllaos: DEFAULT_PARAMS.pasoOllaosDefecto,
    ollaosManuales: sinOllaos(), material: "", observaciones: "",
  };
}

export function emptyBaqueton(): BaquetonInput {
  return {
    cabecera: cabecera(),
    cantidad: 1, largo: 0, ancho: 0, baqueton: 0,
    clienteEspecifico: "GENERAL",
    modoOllaos: "REPARTIDOS", pasoOllaos: DEFAULT_PARAMS.pasoOllaosDefecto,
    ollaosManuales: sinOllaos(), rotulacion: false, textoRotulacion: "",
    material: "", observaciones: "",
  };
}
