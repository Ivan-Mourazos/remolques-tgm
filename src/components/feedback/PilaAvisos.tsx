"use client";
import { Aviso } from "@/components/feedback/Aviso";
import type { Aviso as TipoAviso } from "@/lib/feedback/tipos";

export function PilaAvisos({
  avisos, onDescartar,
}: {
  avisos: TipoAviso[];
  onDescartar: (id: string) => void;
}) {
  // El contenedor se mantiene siempre montado, incluso vacío, y ya lleva
  // aria-live="polite": la región viva existe antes de que llegue ningún
  // aviso, que es cuando los lectores de pantalla la anuncian de forma
  // fiable, en vez de insertarse ya poblada.
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-3 bottom-3 z-[90] flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:w-[min(26rem,calc(100vw-2rem))]"
    >
      {avisos.map((aviso) => (
        <div key={aviso.id} className="pointer-events-auto">
          <Aviso
            severidad={aviso.severidad}
            texto={aviso.texto}
            onDescartar={() => onDescartar(aviso.id)}
            enRegionViva
          />
        </div>
      ))}
    </div>
  );
}
