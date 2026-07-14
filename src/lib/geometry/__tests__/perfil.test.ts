import { describe, expect, it } from "vitest";
import { perfilPuntos } from "@/lib/geometry/perfil";

const maxY = (pts: Array<[number, number]>) => Math.max(...pts.map(([, y]) => y));
const maxX = (pts: Array<[number, number]>) => Math.max(...pts.map(([x]) => x));

describe("perfilPuntos", () => {
  it("TIPO 01: rectángulo ancho x alto", () => {
    const pts = perfilPuntos("TIPO 01", { ancho: 150, altoDelante: 60 });
    expect(pts).toEqual([[0, 0], [0, 60], [150, 60], [150, 0]]);
  });
  it("TIPO 02: pico central más alto que los laterales", () => {
    const pts = perfilPuntos("TIPO 02", { ancho: 150, altoDelante: 60, alturaPico: 20 });
    expect(maxY(pts)).toBe(80);
    expect(pts.some(([x, y]) => x === 75 && y === 80)).toBe(true);
  });
  it("TIPO 04: chaflán recorta las esquinas superiores", () => {
    const pts = perfilPuntos("TIPO 04", { ancho: 150, altoDelante: 60, chaflan: 15 });
    expect(pts).toContainEqual([0, 45]);
    expect(pts).toContainEqual([15, 60]);
    expect(pts).toContainEqual([135, 60]);
    expect(pts).toContainEqual([150, 45]);
  });
  it("TIPO 05: esquinas redondeadas dentro de la caja", () => {
    const pts = perfilPuntos("TIPO 05", { ancho: 150, altoDelante: 60, radio: 15 });
    expect(maxY(pts)).toBe(60);
    expect(maxX(pts)).toBe(150);
    expect(pts.length).toBeGreaterThan(10); // arcos discretizados
    expect(pts.some(([x, y]) => Math.abs(x - 135) < 1e-9 && Math.abs(y - 60) < 1e-9)).toBe(true);
  });
  it("TIPO 03: pico suavizado, más alto que el lateral", () => {
    const pts = perfilPuntos("TIPO 03", { ancho: 150, altoDelante: 60, alturaPico: 20 });
    expect(maxY(pts)).toBeGreaterThan(60);
    expect(maxY(pts)).toBeLessThanOrEqual(80);
  });
});
