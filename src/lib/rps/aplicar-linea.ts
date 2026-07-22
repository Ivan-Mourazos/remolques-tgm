import type { Material } from "@/lib/calc/materiales-seed";
import type { CalcParams } from "@/lib/calc/params";
import type { LonaInput } from "@/lib/calc/lona";
import type { BaquetonInput } from "@/lib/calc/baqueton";
import { emptyBaqueton, emptyLona } from "@/components/workspace/entradas-vacias";
import type { LineaPedidoRps, PedidoRps } from "@/lib/rps/types";
import { materialPreferidoRps } from "@/lib/rps/material-rps";

const normalizar = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^A-Z0-9]+/gi, " ")
  .trim()
  .toLocaleUpperCase("es-ES");

function cabeceraRps(
  pedido: PedidoRps,
  linea: LineaPedidoRps,
  version: string,
  realizadoPor: string,
) {
  return {
    numeroPedido: pedido.numero.trim(),
    version,
    cliente: (pedido.cliente.alias || pedido.cliente.nombre).trim(),
    revision: "",
    realizadoPor,
    ordenFabricacion: linea.ordenFabricacion ?? "",
    fecha: pedido.fecha ?? new Date().toISOString().slice(0, 10),
    fechaSalida: pedido.fechaSalida ?? "",
  };
}

export function crearInputDesdeRps(
  pedido: PedidoRps,
  linea: LineaPedidoRps,
  indice: number,
  materiales: Material[],
  params: CalcParams,
  realizadoPor = "",
): { tipo: "lona"; input: LonaInput } | { tipo: "baqueton"; input: BaquetonInput } {
  const version = String(10 + indice);
  const material = linea.materialSugerido || materialPreferidoRps(linea, materiales);
  if (linea.tipoTrabajo === "baqueton") {
    const input = emptyBaqueton();
    const clienteNormalizado = normalizar(pedido.cliente.alias || pedido.cliente.nombre);
    const clienteEspecifico = params.clientesBaqueton.find((cliente) =>
      cliente.nombre !== "GENERAL" && clienteNormalizado.includes(normalizar(cliente.nombre)),
    )?.nombre ?? "GENERAL";
    return {
      tipo: "baqueton",
      input: {
        ...input,
        cabecera: cabeceraRps(pedido, linea, version, realizadoPor),
        cantidad: linea.cantidad,
        largo: linea.largo ?? 0,
        ancho: linea.ancho ?? 0,
        baqueton: linea.baqueton ?? 0,
        clienteEspecifico,
        material,
        rotulacion: linea.rotulacion ?? input.rotulacion,
        observaciones: "",
      },
    };
  }

  const input = emptyLona();
  const altoComun = linea.alto ?? 0;
  return {
    tipo: "lona",
    input: {
      ...input,
      cabecera: cabeceraRps(pedido, linea, version, realizadoPor),
      cantidad: linea.cantidad,
      largo: linea.largo ?? 0,
      ancho: linea.ancho ?? 0,
      altoDelante: linea.altoDelante ?? altoComun,
      altoAtras: linea.altoAtras ?? linea.altoDelante ?? altoComun,
      aguas: linea.aguas ?? 0,
      tipoPerfil: (linea.aguas ?? 0) > 0 ? "TIPO 02" : "TIPO 01",
      ventana: linea.ventana,
      rotulacion: linea.rotulacion ?? input.rotulacion,
      material,
      observaciones: "",
    },
  };
}
