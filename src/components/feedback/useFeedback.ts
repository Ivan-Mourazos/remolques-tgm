"use client";
import { createContext, useContext } from "react";
import type { OpcionesConfirmacion, Severidad } from "@/lib/feedback/tipos";

export interface Feedback {
  mostrar: (severidad: Severidad, texto: string) => string;
  descartar: (id: string) => void;
  confirmar: (opciones: OpcionesConfirmacion) => Promise<string>;
}

export const ContextoFeedback = createContext<Feedback | null>(null);

export function useFeedback(): Feedback {
  const feedback = useContext(ContextoFeedback);
  if (!feedback) throw new Error("useFeedback se ha usado fuera de <ProveedorFeedback>.");
  return feedback;
}

/** Devuelve una función estable: puede ir en un array de dependencias. */
export function useAvisos() {
  return useFeedback().mostrar;
}

/** Devuelve una función estable. */
export function useConfirmar() {
  return useFeedback().confirmar;
}
