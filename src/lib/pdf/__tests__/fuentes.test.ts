import { describe, expect, it } from "vitest";
import { Font } from "@react-pdf/renderer";
import { registrarFuentes } from "@/lib/pdf/fuentes";

describe("registro de la fuente de la hoja", () => {
  it("registra Inter y no la duplica al llamar dos veces", () => {
    expect(registrarFuentes()).toBe("Inter");
    expect(registrarFuentes()).toBe("Inter");
    expect(Font.getRegisteredFontFamilies()).toContain("Inter");
    expect(Font.getRegisteredFonts().Inter.sources).toHaveLength(3);
  });
});
