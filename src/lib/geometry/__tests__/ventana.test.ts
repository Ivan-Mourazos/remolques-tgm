import { describe, expect, it } from "vitest";
import { perfilPuntos } from "@/lib/geometry/perfil";
import { calcularVentanaFrontal } from "@/lib/geometry/ventana";

describe("calcularVentanaFrontal", () => {
  it("centra una ventana proporcionada a 5 cm bajo una cubierta plana", () => {
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

  it("reduce la ventana para adaptarla a un paño delantero estrecho", () => {
    const perfil = perfilPuntos("TIPO 01", { ancho: 40, altoDelante: 120 });
    const ventana = calcularVentanaFrontal(perfil, 40);
    expect(ventana).toMatchObject({ x: 6, ancho: 28 });
    expect(ventana!.y).toBeCloseTo(95.4, 5);
    expect(ventana!.alto).toBeCloseTo(19.6, 5);
  });

  it("respeta las medidas de fabricación introducidas", () => {
    const perfil = perfilPuntos("TIPO 01", { ancho: 180, altoDelante: 140 });
    expect(calcularVentanaFrontal(perfil, 180, 5, { ancho: 80, alto: 45 })).toEqual({
      x: 50, y: 90, ancho: 80, alto: 45,
    });
  });
});
