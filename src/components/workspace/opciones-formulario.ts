export type OpcionFormulario = { value: string; label: string };

export const TECNICOS: OpcionFormulario[] = [
  { value: "", label: "Sin asignar" },
  { value: "IVAN", label: "Iván" },
  { value: "ADRIAN", label: "Adrián" },
  { value: "JAIME", label: "Jaime" },
  { value: "TAMARA", label: "Tamara" },
  { value: "ALBERTO", label: "Alberto" },
  { value: "ANGEL", label: "Ángel" },
];

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
