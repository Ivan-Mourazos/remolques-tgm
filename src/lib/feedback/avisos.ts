import { TOPE_AVISOS, type Aviso, type Severidad } from "@/lib/feedback/tipos";

/**
 * Deja la pila en el tope desalojando primero lo prescindible: un error solo
 * cede su sitio cuando ya no queda ningún aviso de otra severidad.
 */
function recortar(pila: Aviso[]): Aviso[] {
  const restante = [...pila];
  while (restante.length > TOPE_AVISOS) {
    const indice = restante.findIndex((a) => a.severidad !== "error");
    restante.splice(indice === -1 ? 0 : indice, 1);
  }
  return restante;
}

/** El equivalente ya presente en la pila, si lo hay. */
export function avisoDuplicado(
  pila: Aviso[],
  severidad: Severidad,
  texto: string,
): Aviso | undefined {
  return pila.find((a) => a.severidad === severidad && a.texto === texto);
}

/**
 * Añade un aviso. Un mensaje idéntico no se apila dos veces: se conserva el
 * que ya estaba, y el proveedor reinicia su temporizador.
 */
export function agregarAviso(pila: Aviso[], alta: Aviso): Aviso[] {
  if (avisoDuplicado(pila, alta.severidad, alta.texto)) return pila;
  return recortar([...pila, alta]);
}

export function descartarAviso(pila: Aviso[], id: string): Aviso[] {
  return pila.filter((a) => a.id !== id);
}
