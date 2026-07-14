import { describe, expect, it } from "vitest";
import { buildRecord } from "@/app/api/planteamientos/build-record";
import { DEFAULT_PARAMS } from "@/lib/calc/params";
import type { LonaInput } from "@/lib/calc/lona";

describe("buildRecord", () => {
  it("lona: recalcula el resultado en servidor y extrae cabecera", () => {
    const input = {
      cabecera: { numeroPedido: "AR1", version: "1", cliente: "YAGÜE", revision: "", realizadoPor: "", fecha: "", fechaSalida: "" },
      cantidad: 1, largo: 250, ancho: 151, altoDelante: 62, altoAtras: 62,
      contornoScad: 270, llevaCurva: false, tipoPerfil: "TIPO 02",
      recogeDelante: "NO", recogeAtras: "CREMALLERA",
      bastillaEnfundar: false, ventana: false, rotulacion: false, textoRotulacion: "",
      modoOllaos: "REPARTIDOS", pasoOllaos: 35,
      ollaosManuales: { laterales: [], atras: [], delante: [] },
      material: "", observaciones: "",
    } satisfies LonaInput;
    const rec = buildRecord("lona", input, DEFAULT_PARAMS);
    expect(rec.numeroPedido).toBe("AR1");
    expect(rec.cliente).toBe("YAGÜE");
    expect((rec.result as { metrosTela: number }).metrosTela).toBe(5.61);
  });

  it("tipo desconocido lanza error", () => {
    expect(() => buildRecord("otro" as never, {} as never, DEFAULT_PARAMS)).toThrow();
  });
});
