"use client";
import { useEffect, useRef } from "react";
import type { AccionConfirmacion, OpcionesConfirmacion } from "@/lib/feedback/tipos";

const tonos: Record<NonNullable<AccionConfirmacion["tono"]>, string> = {
  primario: "bg-deep text-white hover:bg-deep-2 focus-visible:ring-deep-2/25",
  peligro: "border border-red-500/45 bg-white text-red-800 hover:bg-red-50 focus-visible:ring-red-500/25",
  neutro: "border border-line-2 bg-surface text-ink-2 hover:border-line focus-visible:ring-gold/20",
};

export function DialogoConfirmacion({
  opciones, onResponder,
}: {
  opciones: OpcionesConfirmacion | null;
  onResponder: (clave: string) => void;
}) {
  const referencia = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogo = referencia.current;
    if (!dialogo) return;
    if (opciones && !dialogo.open) dialogo.showModal();
    if (!opciones && dialogo.open) dialogo.close();
  }, [opciones]);

  if (!opciones) return null;

  const motivo = opciones.acciones.find((accion) => accion.deshabilitada)?.deshabilitada;

  return (
    <dialog
      ref={referencia}
      aria-labelledby="titulo-confirmacion"
      // Escape y clic en el fondo resuelven «cancelar»: la salida segura es
      // siempre la que no destruye trabajo.
      onCancel={(evento) => { evento.preventDefault(); onResponder("cancelar"); }}
      onClick={(evento) => { if (evento.target === referencia.current) onResponder("cancelar"); }}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 text-ink shadow-[0_24px_60px_rgb(9_39_44/0.28)] backdrop:bg-deep/35 backdrop:backdrop-blur-[2px]"
    >
      <div className="p-4">
        <h2 id="titulo-confirmacion" className="text-[15px] font-extrabold tracking-[-0.02em] text-ink">
          {opciones.titulo}
        </h2>
        <p className="mt-1.5 text-xs font-medium leading-5 text-muted">{opciones.mensaje}</p>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          {opciones.acciones.map((accion) => (
            <button
              key={accion.clave}
              type="button"
              disabled={Boolean(accion.deshabilitada)}
              onClick={() => onResponder(accion.clave)}
              className={`rounded-xl px-3 py-2 text-xs font-extrabold transition focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-45 ${tonos[accion.tono ?? "neutro"]}`}
            >
              {accion.etiqueta}
            </button>
          ))}
        </div>
        {motivo && (
          <p className="mt-2 text-right text-[10px] font-bold text-muted-2">{motivo}</p>
        )}
      </div>
    </dialog>
  );
}
