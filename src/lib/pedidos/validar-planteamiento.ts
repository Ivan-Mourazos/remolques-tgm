import type { LonaInput } from "@/lib/calc/lona";
import type { BaquetonInput } from "@/lib/calc/baqueton";

export interface ErrorPlanteamiento {
  campo: string;
  mensaje: string;
}

const positivo = (valor: number | null | undefined) => Number.isFinite(valor) && Number(valor) > 0;

export function erroresPlanteamiento(input: LonaInput | BaquetonInput): ErrorPlanteamiento[] {
  const errores: ErrorPlanteamiento[] = [];
  const agregar = (condicion: boolean, campo: string, mensaje: string) => {
    if (condicion) errores.push({ campo, mensaje });
  };

  agregar(!input.cabecera.numeroPedido.trim(), "numeroPedido", "Introduce el número de pedido.");
  agregar(!positivo(input.cantidad), "cantidad", "La cantidad debe ser mayor que cero.");
  agregar(!positivo(input.largo), "largo", "Introduce el largo del remolque.");
  agregar(!positivo(input.ancho), "ancho", "Introduce el ancho del remolque.");
  agregar(!input.material.trim(), "material", "Selecciona o escribe el material.");

  if ("baqueton" in input) {
    agregar(!positivo(input.baqueton), "baqueton", "Introduce la medida del baquetón.");
  } else {
    agregar(!positivo(input.altoDelante), "altoDelante", "Introduce el alto delantero.");
    agregar(
      ["TIPO 02", "TIPO 03"].includes(input.tipoPerfil) && !positivo(input.aguas),
      "aguas",
      "Introduce la medida de aguas.",
    );
    agregar(input.tipoPerfil === "TIPO 04" && !positivo(input.chaflan), "chaflan", "Introduce el chaflán.");
    agregar(
      input.tipoPerfil === "TIPO 05" && !positivo(input.radioEsquina),
      "radioEsquina",
      "Introduce el radio de esquina.",
    );
    agregar(input.ventana && !positivo(input.ventanaAncho), "ventanaAncho", "Introduce el ancho de la ventana.");
    agregar(input.ventana && !positivo(input.ventanaAlto), "ventanaAlto", "Introduce el alto de la ventana.");
    agregar(
      input.ventana && positivo(input.ventanaAncho) && Number(input.ventanaAncho) >= input.ancho,
      "ventanaAncho",
      "El ancho de la ventana debe ser menor que el ancho del remolque.",
    );
    agregar(
      input.ventana && positivo(input.ventanaAlto) && Number(input.ventanaAlto) >= input.altoDelante,
      "ventanaAlto",
      "El alto de la ventana debe ser menor que el alto delantero.",
    );
    agregar(
      !positivo(input.contorno) && !positivo(input.contornoScad),
      "contorno",
      "Confirma el contorno de corte antes de guardar o generar el PDF.",
    );
  }

  if (input.modoOllaos === "REPARTIDOS") {
    agregar(!positivo(input.pasoOllaos), "pasoOllaos", "El paso de ollaos debe ser mayor que cero.");
    agregar(
      !Number.isFinite(input.primerOllao) || Number(input.primerOllao) < 0,
      "primerOllao",
      "La distancia del primer ollao no puede ser negativa.",
    );
  } else {
    const vacias = [
      ["laterales", input.ollaosManuales.laterales],
      ["atrás", input.ollaosManuales.atras],
      ["delante", input.ollaosManuales.delante],
    ].filter(([, posiciones]) => (posiciones as number[]).length === 0)
      .map(([nombre]) => nombre as string);
    if (vacias.length > 0) {
      errores.push({
        campo: "ollaosManuales",
        mensaje: `Completa los ollaos a medida de ${vacias.join(", ")} antes de guardar o generar el PDF.`,
      });
    }
  }

  return errores;
}

export function errorPlanteamientoIncompleto(input: LonaInput | BaquetonInput): string | null {
  return erroresPlanteamiento(input)[0]?.mensaje ?? null;
}

export function planteamientoGenerable(input: LonaInput | BaquetonInput): boolean {
  return erroresPlanteamiento(input).length === 0;
}
