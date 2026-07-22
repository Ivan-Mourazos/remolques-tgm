import { describe, expect, it } from "vitest";
import { perfilForma, perfilPuntos } from "@/lib/geometry/perfil";
import { nombrePerfil } from "@/lib/calc/params";

const maxY = (pts: Array<[number, number]>) => Math.max(...pts.map(([, y]) => y));
const maxX = (pts: Array<[number, number]>) => Math.max(...pts.map(([x]) => x));

describe("perfilPuntos", () => {
  it("TIPO 01: rectángulo ancho x alto", () => {
    const pts = perfilPuntos("TIPO 01", { ancho: 150, altoDelante: 60 });
    expect(pts).toEqual([[0, 0], [0, 60], [150, 60], [150, 0]]);
  });
  it("TIPO 02: pico central más alto que los laterales", () => {
    const pts = perfilPuntos("TIPO 02", { ancho: 150, altoDelante: 60, alturaPico: 20 });
    expect(maxY(pts)).toBe(60);
    expect(pts).toContainEqual([0, 40]);
    expect(pts.some(([x, y]) => x === 75 && y === 60)).toBe(true);
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
    expect(maxY(pts)).toBe(60);
    expect(Math.min(...pts.slice(1, -1).map(([, y]) => y))).toBeLessThan(60);
  });
  it("expone las aristas longitudinales de cada perfil", () => {
    const opts = { ancho: 150, altoDelante: 100, alturaPico: 10, chaflan: 12, radio: 12 };
    for (const tipo of ["TIPO 01", "TIPO 02", "TIPO 03", "TIPO 04", "TIPO 05"] as const) {
      const { puntos, aristas } = perfilForma(tipo, opts);
      expect(puntos).toEqual(perfilPuntos(tipo, opts));
      expect(aristas.length).toBeGreaterThanOrEqual(2);
      for (const i of aristas) {
        expect(i).toBeGreaterThan(0);
        expect(i).toBeLessThan(puntos.length - 1);
      }
    }
    expect(perfilForma("TIPO 01", opts).aristas).toEqual([1, 2]);
    expect(perfilForma("TIPO 04", opts).aristas).toEqual([1, 2, 3, 4]);
    // TIPO 05: hombros = tangentes superiores de los dos arcos
    const t5 = perfilForma("TIPO 05", opts);
    expect(t5.puntos[t5.aristas[1]][1]).toBe(100);
    expect(t5.puntos[t5.aristas[2]][1]).toBe(100);
    // TIPO 03 con aguas: la arista central es el pico
    const t3 = perfilForma("TIPO 03", opts);
    expect(t3.puntos[t3.aristas[1]]).toEqual([75, 100]);
  });

  it("TIPO 03 con radio: aristas en las tangencias, no en el vértice liso", () => {
    const { puntos, aristas } = perfilForma("TIPO 03", {
      ancho: 150, altoDelante: 100, alturaPico: 20, radioCumbrera: 60,
    });
    expect(aristas).toHaveLength(4); // hombros + dos tangencias
    // ninguna arista en el vértice del arco (superficie lisa)
    for (const i of aristas) expect(puntos[i][1]).toBeLessThan(100);
    // tangencias simétricas a la misma altura
    const [, tIzq, tDer] = aristas;
    expect(puntos[tIzq][1]).toBeCloseTo(puntos[tDer][1], 9);
    expect(puntos[tIzq][0]).toBeCloseTo(150 - puntos[tDer][0], 9);
  });

  it("TIPO 03 con radio de hombro: tangencias sobre el lateral y arcos en el círculo", () => {
    const { puntos, aristas } = perfilForma("TIPO 03", {
      ancho: 150, altoDelante: 100, alturaPico: 20, radioHombro: 15,
    });
    // Cada hombro aporta sus dos tangencias y el pico vivo una arista.
    expect(aristas).toHaveLength(5);
    const theta = Math.atan2(20, 75);
    const t = 15 * Math.tan((Math.PI / 2 - theta) / 2);
    expect(puntos[aristas[0]]).toEqual([0, 80 - t]);
    expect(puntos[aristas[1]][0]).toBeGreaterThan(0);
    expect(puntos[aristas[1]][1]).toBeGreaterThan(80 - t);
    expect(puntos[aristas[2]]).toEqual([75, 100]);
    expect(puntos[aristas[3]][0]).toBeLessThan(150);
    expect(puntos[aristas[3]][1]).toBeGreaterThan(80 - t);
    expect(puntos[aristas[4]][0]).toBeCloseTo(150, 9);
    expect(puntos[aristas[4]][1]).toBeCloseTo(80 - t, 9);
    // los puntos del arco izquierdo están a distancia rh del centro
    const centro = { x: 15, y: 80 - t };
    const arco = puntos.filter(([x, y]) => x > 0 && x < 20 && y > 80 - t && y < 100);
    for (const [x, y] of arco) {
      expect(Math.hypot(x - centro.x, y - centro.y)).toBeCloseTo(15, 9);
    }
  });

  it("TIPO 03 con ambos radios expone las seis tangencias longitudinales", () => {
    const { puntos, aristas } = perfilForma("TIPO 03", {
      ancho: 150, altoDelante: 100, alturaPico: 20, radioHombro: 15, radioCumbrera: 10,
    });
    expect(aristas).toHaveLength(6);
    expect(aristas).toEqual([...aristas].sort((a, b) => a - b));
    for (const indice of aristas) {
      expect(indice).toBeGreaterThan(0);
      expect(indice).toBeLessThan(puntos.length - 1);
    }
  });

  it("expone nombres de perfil claros para oficina técnica", () => {
    expect(nombrePerfil("TIPO 04")).toContain("chaflanes");
    expect(nombrePerfil("TIPO 05")).toContain("esquinas curvas");
  });
});
