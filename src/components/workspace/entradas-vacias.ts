import type { LonaInput } from "@/lib/calc/lona";
import type { BaquetonInput } from "@/lib/calc/baqueton";
import { DEFAULT_PARAMS } from "@/lib/calc/params";

// La posición interna comienza en 10; las siguientes piezas del pedido usan
// 11, 12… El PDF agrupado conserva siempre el nombre final PEDIDO-10.pdf.
const cabecera = () => ({
  numeroPedido: "", version: "10", cliente: "", revision: "", realizadoPor: "",
  ordenFabricacion: "", fecha: new Date().toISOString().slice(0, 10), fechaSalida: "",
});
const sinOllaos = () => ({ laterales: [], atras: [], delante: [] });

export function emptyLona(): LonaInput {
  return {
    cabecera: cabecera(),
    cantidad: 1, largo: 0, ancho: 0, anchoAtras: 0, altoDelante: 0, altoAtras: 0, aguas: 0,
    radioCumbrera: 0, radioHombro: 0, radioEsquina: 0, chaflan: 0,
    contorno: 0, tipoPerfil: "TIPO 01",
    recogeDelante: "NO", recogeAtras: "NO",
    bastillaEnfundar: false, ventana: false, ventanaAncho: 0, ventanaAlto: 0, rotulacion: false,
    modoOllaos: "REPARTIDOS", pasoOllaos: DEFAULT_PARAMS.pasoOllaosDefecto,
    primerOllao: DEFAULT_PARAMS.primerOllao,
    ollaosManuales: sinOllaos(), material: "", observaciones: "",
  };
}

export function emptyBaqueton(): BaquetonInput {
  return {
    cabecera: cabecera(),
    cantidad: 1, largo: 0, ancho: 0, baqueton: 0,
    clienteEspecifico: "GENERAL",
    modoOllaos: "REPARTIDOS", pasoOllaos: DEFAULT_PARAMS.pasoOllaosDefecto,
    primerOllao: DEFAULT_PARAMS.primerOllao,
    ollaosManuales: sinOllaos(), rotulacion: false,
    material: "", observaciones: "",
  };
}
