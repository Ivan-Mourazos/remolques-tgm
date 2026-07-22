import { describe, expect, it } from "vitest";
import { emptyLona } from "@/components/workspace/entradas-vacias";
import { datosGeometriaPdf } from "@/lib/pdf/datos-geometria";

describe("datos geométricos del PDF", () => {
  it("detalla aguas y los dos radios del perfil curvo", () => {
    expect(datosGeometriaPdf({
      ...emptyLona(), tipoPerfil: "TIPO 03", aguas: 35, radioCumbrera: 20, radioHombro: 18,
    })).toEqual([
      "AGUAS 35 CM",
      "RADIO CUMBRERA 20 CM",
      "RADIO HOMBRO 18 CM",
    ]);
  });

  it("incluye la medida propia de chaflán y esquina redonda", () => {
    expect(datosGeometriaPdf({ ...emptyLona(), tipoPerfil: "TIPO 04", chaflan: 25 }))
      .toEqual(["CHAFLÁN ESQUINA 25 CM"]);
    expect(datosGeometriaPdf({ ...emptyLona(), tipoPerfil: "TIPO 05", radioEsquina: 30 }))
      .toEqual(["RADIO ESQUINA 30 CM"]);
  });
});
