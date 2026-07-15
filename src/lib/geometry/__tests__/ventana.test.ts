import { describe, expect, it } from "vitest";
import { perfilPuntos } from "@/lib/geometry/perfil";
import { calcularVentanaFrontal } from "@/lib/geometry/ventana";

describe("calcularVentanaFrontal", () => {
  it("centra una ventana 50 × 35 a 5 cm bajo una cubierta plana", () => {
    const perfil = perfilPuntos("TIPO 01", { ancho: 140, altoDelante: 120 });
    expect(calcularVentanaFrontal(perfil, 140)).toEqual({
      x: 45, y: 80, ancho: 50, alto: 35,
    });
  });

  it("mantiene 5 cm desde ambas esquinas superiores hasta una cubierta con aguas", () => {
    const perfil = perfilPuntos("TIPO 02", {
      ancho: 140, altoDelante: 120, alturaPico: 15,
    });
    const ventana = calcularVentanaFrontal(perfil, 140);
    expect(ventana).not.toBeNull();
    expect(ventana).toMatchObject({ x: 45, ancho: 50, alto: 35 });
    // En x=45 y x=95 la cubierta simétrica está a 114,64 cm.
    expect(ventana!.y + ventana!.alto).toBeCloseTo(109.642857, 5);
  });

  it("no dibuja una ventana estándar si no cabe", () => {
    const perfil = perfilPuntos("TIPO 01", { ancho: 40, altoDelante: 120 });
    expect(calcularVentanaFrontal(perfil, 40)).toBeNull();
  });
});
