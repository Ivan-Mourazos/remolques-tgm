"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { agregarAviso, avisoDuplicado, descartarAviso } from "@/lib/feedback/avisos";
import { DURACION_AVISO, type Aviso, type OpcionesConfirmacion, type Severidad } from "@/lib/feedback/tipos";
import { ContextoFeedback, type Feedback } from "@/components/feedback/useFeedback";
import { PilaAvisos } from "@/components/feedback/PilaAvisos";
import { DialogoConfirmacion } from "@/components/feedback/DialogoConfirmacion";

// crypto.randomUUID está sujeto a contexto seguro: en http://192.168.0.x
// (así se accede a esta app en la intranet) no existe en Chrome/Edge/Firefox.
let secuencia = 0;
const nuevoId = () => globalThis.crypto?.randomUUID?.() ?? `aviso-${Date.now()}-${secuencia++}`;

export function ProveedorFeedback({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [opcionesDialogo, setOpcionesDialogo] = useState<OpcionesConfirmacion | null>(null);
  // La pila vive también en un ref: decidir el id y el temporizador debe
  // ocurrir fuera del updater de setAvisos, que puede re-ejecutarse.
  const pila = useRef<Aviso[]>([]);
  const temporizadores = useRef(new Map<string, number>());
  const resolver = useRef<((clave: string) => void) | null>(null);

  const descartar = useCallback((id: string) => {
    const pendiente = temporizadores.current.get(id);
    if (pendiente !== undefined) {
      window.clearTimeout(pendiente);
      temporizadores.current.delete(id);
    }
    pila.current = descartarAviso(pila.current, id);
    setAvisos(pila.current);
  }, []);

  const programarDescarte = useCallback((id: string, severidad: Severidad) => {
    const duracion = DURACION_AVISO[severidad];
    if (duracion === null) return;
    const anterior = temporizadores.current.get(id);
    if (anterior !== undefined) window.clearTimeout(anterior);
    temporizadores.current.set(id, window.setTimeout(() => descartar(id), duracion));
  }, [descartar]);

  const mostrar = useCallback((severidad: Severidad, texto: string): string => {
    // Repetir un mensaje no lo apila: le devuelve su tiempo completo.
    const yaEsta = avisoDuplicado(pila.current, severidad, texto);
    const id = yaEsta?.id ?? nuevoId();
    programarDescarte(id, severidad);
    pila.current = agregarAviso(pila.current, { id, severidad, texto });
    setAvisos(pila.current);
    return id;
  }, [programarDescarte]);

  const confirmar = useCallback((opciones: OpcionesConfirmacion) => (
    new Promise<string>((resuelve) => {
      resolver.current?.("cancelar"); // nadie se queda esperando para siempre
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
