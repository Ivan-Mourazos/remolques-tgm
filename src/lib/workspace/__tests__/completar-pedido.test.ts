import { describe, expect, it } from "vitest";
import { emptyLona } from "@/components/workspace/entradas-vacias";
import type { LonaInput } from "@/lib/calc/lona";
import type { LineaPedido } from "@/lib/workspace/lineas";
import { impedimentosCompletar, mensajeImpedimentos } from "@/lib/workspace/completar-pedido";

const lonaCompleta = (version: string): LonaInput => ({
  ...emptyLona(),
  cabecera: { ...emptyLona().cabecera, numeroPedido: "AR2603583", version, cliente: "CLIENTE" },
  largo: 600, ancho: 250, altoDelante: 220, contorno: 620, material: "PVC 580 AZUL",
  tipoPerfil: "TIPO 01", recogeDelante: "NO", recogeAtras: "NO",
  ventana: false, rotulacion: false, bastillaEnfundar: false, modoOllaos: "REPARTIDOS",
});

const linea = (version: string, cambios: Partial<LonaInput> = {}): LineaPedido => ({
  version, tipo: "lona", input: { ...lonaCompleta(version), ...cambios },
});

describe("impedimentosCompletar", () => {
  it("no impide nada cuando todas las líneas están listas", () => {
    expect(impedimentosCompletar([linea("10"), linea("11")])).toEqual([]);
  });

  it("un pedido sin líneas no se puede completar", () => {
    expect(impedimentosCompletar([])).toEqual([
      { version: "", nombre: "El pedido", falta: "Añade al menos un remolque o un baquetón." },
    ]);
  });

  it("nombra la línea y dice qué le falta, en vez de omitirla en silencio", () => {
    expect(impedimentosCompletar([linea("10"), linea("11", { modoOllaos: "" })])).toEqual([
      { version: "11", nombre: "Remolque 2", falta: "Elige cómo van repartidos los ollaos." },
    ]);
  });

  it("recoge todas las que fallan, en el orden de la lista", () => {
    const impedimentos = impedimentosCompletar([
      linea("10", { tipoPerfil: "" }),
      linea("11"),
      linea("12", { material: "" }),
    ]);
    expect(impedimentos.map((i) => i.version)).toEqual(["10", "12"]);
  });
});

describe("mensajeImpedimentos", () => {
  it("una sola línea se nombra en singular y con su falta", () => {
    const mensaje = mensajeImpedimentos([
      { version: "11", nombre: "Remolque 2", falta: "Elige cómo van repartidos los ollaos." },
    ]);
    expect(mensaje).toBe("Remolque 2: Elige cómo van repartidos los ollaos.");
  });

  it("varias líneas se enumeran todas", () => {
    const mensaje = mensajeImpedimentos([
      { version: "10", nombre: "Remolque 1", falta: "Elige el tipo de perfil del remolque." },
      { version: "12", nombre: "Remolque 3", falta: "Selecciona o escribe el material." },
    ]);
    expect(mensaje).toBe(
      "Faltan 2 líneas por terminar. Remolque 1: Elige el tipo de perfil del remolque."
      + " Remolque 3: Selecciona o escribe el material.",
    );
  });

  it("sin impedimentos no hay mensaje", () => {
    expect(mensajeImpedimentos([])).toBe("");
  });
});
