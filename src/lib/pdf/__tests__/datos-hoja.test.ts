import { describe, expect, it } from "vitest";
import { textoPanos, tituloPagina } from "@/lib/pdf/datos-hoja";

describe("textos sueltos de la hoja", () => {
  it("concuerda el plural de los paños con la cantidad", () => {
    expect(textoPanos(1, 160, 124.5)).toBe("1 PAÑO DE 160 × 124,5");
    expect(textoPanos(2, 160, 124.5)).toBe("2 PAÑOS DE 160 × 124,5");
  });

  it("numera la página solo cuando el pedido tiene más de una", () => {
    expect(tituloPagina("lona", 0, 1)).toBe("REMOLQUE");
    expect(tituloPagina("lona", 0, 3)).toBe("REMOLQUE · 1 DE 3");
    expect(tituloPagina("baqueton", 1, 3)).toBe("BAQUETÓN · 2 DE 3");
    expect(tituloPagina("baqueton", 0, 1)).toBe("BAQUETÓN");
  });
});
