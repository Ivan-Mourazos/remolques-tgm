"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { agregarAviso, avisoDuplicado, descartarAviso } from "@/lib/feedback/avisos";
import { DURACION_AVISO, type Aviso, type OpcionesConfirmacion, type Severidad } from "@/lib/feedback/tipos";
import { ContextoFeedback, type Feedback } from "@/components/feedback/useFeedback";
import { PilaAvisos } from "@/components/feedback/PilaAvisos";
import { DialogoConfirmacion } from "@/components/feedback/DialogoConfirmacion";

export function ProveedorFeedback({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [opcionesDialogo, setOpcionesDialogo] = useState<OpcionesConfirmacion | null>(null);
  const temporizadores = useRef(new Map<string, number>());
  const resolver = useRef<((clave: string) => void) | null>(null);

  const descartar = useCallback((id: string) => {
    const pendiente = temporizadores.current.get(id);
    if (pendiente !== undefined) {
      window.clearTimeout(pendiente);
      temporizadores.current.delete(id);
    }
    setAvisos((pila) => descartarAviso(pila, id));
  }, []);

  const programarDescarte = useCallback((id: string, severidad: Severidad) => {
    const duracion = DURACION_AVISO[severidad];
    if (duracion === null) return;
    const anterior = temporizadores.current.get(id);
    if (anterior !== undefined) window.clearTimeout(anterior);
    temporizadores.current.set(id, window.setTimeout(() => descartar(id), duracion));
  }, [descartar]);

  const mostrar = useCallback((severidad: Severidad, texto: string) => {
    setAvisos((pila) => {
      // Repetir un mensaje no lo apila: le devuelve su tiempo completo.
      const yaEsta = avisoDuplicado(pila, severidad, texto);
      const id = yaEsta?.id ?? crypto.randomUUID();
      programarDescarte(id, severidad);
      return yaEsta ? pila : agregarAviso(pila, { id, severidad, texto });
    });
  }, [programarDescarte]);

  const confirmar = useCallback((opciones: OpcionesConfirmacion) => (
    new Promise<string>((resuelve) => {
      resolver.current = resuelve;
      setOpcionesDialogo(opciones);
    })
  ), []);

  const responder = useCallback((clave: string) => {
    setOpcionesDialogo(null);
    const pendiente = resolver.current;
    resolver.current = null;
    pendiente?.(clave);
  }, []);

  useEffect(() => {
    const pendientes = temporizadores.current;
    return () => {
      for (const id of pendientes.values()) window.clearTimeout(id);
      pendientes.clear();
    };
  }, []);

  const valor = useMemo<Feedback>(
    () => ({ mostrar, descartar, confirmar }),
    [confirmar, descartar, mostrar],
  );

  return (
    <ContextoFeedback.Provider value={valor}>
      {children}
      <PilaAvisos avisos={avisos} onDescartar={descartar} />
      <DialogoConfirmacion opciones={opcionesDialogo} onResponder={responder} />
    </ContextoFeedback.Provider>
  );
}
