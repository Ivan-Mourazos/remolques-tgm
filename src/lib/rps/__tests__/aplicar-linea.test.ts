import { describe, expect, it } from "vitest";
import { crearInputDesdeRps } from "@/lib/rps/aplicar-linea";
import { materialPreferidoRps } from "@/lib/rps/material-rps";
import { DEFAULT_PARAMS } from "@/lib/calc/params";
import type { LineaPedidoRps, PedidoRps } from "@/lib/rps/types";

const linea: LineaPedidoRps = {
  idLinea: "L1", numeroLinea: 20, codigoArticulo: "LONAREMOLQUE",
  ordenFabricacion: "0230001", cantidad: 2, tipoTrabajo: "lona",
  largo: 250, ancho: 150, alto: 90, altoDelante: null, altoAtras: null,
  aguas: null, baqueton: null, ventana: true, rotulacion: false,
  recogidaDelante: false, recogidaAtras: true,
  materialRps: { gramaje: 580, color: "GRIS 7038", texto: "PVC 580 · color GRIS 7038" },
  tipoRotulacion: null, textoRotulacion: null,
  descripcion: "LONA REMOLQUE", detalle: "Detalle RPS", requiereRevision: false,
};
const pedido: PedidoRps = {
  numero: "AR2600001", fecha: "2026-07-20", fechaSalida: "2026-08-01",
  cliente: { codigo: "C1", nombre: "CLIENTE COMPLETO", alias: "CLIENTE" },
  lineas: [linea],
};

describe("crearInputDesdeRps", () => {
  it("crea una copia editable con cabecera, OF, cantidad y medidas", () => {
    const result = crearInputDesdeRps(pedido, linea, 1, [], DEFAULT_PARAMS, "IVÁN");
    expect(result.tipo).toBe("lona");
    expect(result.input).toMatchObject({
      cantidad: 2, largo: 250, ancho: 150, altoDelante: 90, altoAtras: 90,
      ventana: true, observaciones: "",
      cabecera: {
        numeroPedido: "AR2600001", version: "11", cliente: "CLIENTE",
        ordenFabricacion: "0230001", realizadoPor: "IVÁN",
        fecha: "2026-07-20", fechaSalida: "2026-08-01",
      },
    });
  });

  it("selecciona la bobina compatible con más stock", () => {
    const materiales = [
      { nombre: "LONA ALPHA 580 :GRIS 7038 :250 AN", codigoBobina: "A", stockArzua: 35 },
      { nombre: "LONA ALPHA 580 :ROJO 3002 :250 AN", codigoBobina: "B" },
    ];
    expect(materialPreferidoRps(linea, materiales)).toBe(materiales[0].nombre);
    expect(materialPreferidoRps(linea, [...materiales, {
      nombre: "LONA RECORD 580 :GRIS 7038 :220 AN", codigoBobina: "C", stockArzua: 80,
    }])).toBe("LONA RECORD 580 :GRIS 7038 :220 AN");
  });

  it("mapea una tercera medida pequeña a baquetón", () => {
    const result = crearInputDesdeRps(pedido, {
      ...linea, tipoTrabajo: "baqueton", alto: null, baqueton: 14,
    }, 0, [], DEFAULT_PARAMS);
    expect(result.tipo).toBe("baqueton");
    expect(result.input).toMatchObject({ baqueton: 14, largo: 250, ancho: 150 });
  });
});
