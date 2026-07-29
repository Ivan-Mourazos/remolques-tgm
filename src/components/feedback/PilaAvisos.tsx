"use client";
import { Aviso } from "@/components/feedback/Aviso";
import type { Aviso as TipoAviso } from "@/lib/feedback/tipos";

export function PilaAvisos({
  avisos, onDescartar,
}: {
  avisos: TipoAviso[];
  onDescartar: (id: string) => void;
}) {
  // El contenedor se mantiene siempre montado, incluso vacío: role="status"
  // solo se anuncia de forma fiable cuando el nodo ya existía antes de
  // recibir contenido, no cuando se inserta ya poblado.
  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-3 z-[90] flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:w-[min(26rem,calc(100vw-2rem))]">
      {avisos.map((aviso) => (
        <div key={aviso.id} className="pointer-events-auto">
          <Aviso
            severidad={aviso.severidad}
            texto={aviso.texto}
            onDescartar={() => onDescartar(aviso.id)}
          />
        </div>
      ))}
    </div>
  );
}
