export type OpcionFormulario = { value: string; label: string };


export const MODOS_OLLAOS: OpcionFormulario[] = [
  { value: "REPARTIDOS", label: "Repartidos automáticamente" },
  { value: "SEGUN SE INDICA", label: "A medida" },
];

const etiquetasConocidas: Record<string, string> = {
  NO: "No",
  "PUENTES ESVA": "Puentes ESVA",
  "PUENTES HIJOS DE PEDRO LOPEZ": "Puentes Hijos de Pedro López",
  "HIJOS DE PEDRO LOPEZ": "Hijos de Pedro López",
};

function capitalizar(value: string): string {
  const minusculas = value.toLocaleLowerCase("es-ES");
  return minusculas.replace(/(^|[\s/(-])([a-záéíóúüñ])/giu, (_, separador, letra: string) => (
    `${separador}${letra.toLocaleUpperCase("es-ES")}`
  ));
}

/** Normaliza solo la etiqueta visible; el valor persistido no cambia. */
export function opcionesConEtiqueta(valores: string[]): OpcionFormulario[] {
  return valores.map((value) => ({
    value,
    label: etiquetasConocidas[value] ?? capitalizar(value),
  }));
}

/** «Sin asignar» va primero: un desplegable que arranca en un nombre concreto
 *  convierte en decisión lo que nadie ha decidido. */
export function opcionesTecnicos(tecnicos: string[]): OpcionFormulario[] {
  return [{ value: "", label: "Sin asignar" }, ...opcionesConEtiqueta(tecnicos)];
}
