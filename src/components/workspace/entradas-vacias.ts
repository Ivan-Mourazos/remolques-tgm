import type { LonaInput } from "@/lib/calc/lona";
import type { BaquetonInput } from "@/lib/calc/baqueton";
import { DEFAULT_PARAMS } from "@/lib/calc/params";

// La versión "10" es fija: solo marca el archivo como planteamiento en el
// nombre del Excel (PEDIDO-10.xlsx); no se muestra ni se edita en la app.
const cabecera = () => ({
  numeroPedido: "", version: "10", cliente: "", revision: "", realizadoPor: "",
  ordenFabricacion: "", fecha: new Date().toISOString().slice(0, 10), fechaSalida: "",
});
const sinOllaos = () => ({ laterales: [], atras: [], delante: [] });

export function emptyLona(): LonaInput {
  return {
    cabecera: cabecera(),
    cantidad: 1, largo: 0, ancho: 0, anchoAtras: 0, altoDelante: 0, altoAtras: 0, aguas: 0,
    radioCumbrera: 0, radioEsquina: 0, chaflan: 0,
    contorno: 0, tipoPerfil: "TIPO 01",
    recogeDelante: "NO", recogeAtras: "NO",
    bastillaEnfundar: false, ventana: false, rotulacion: false,
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
