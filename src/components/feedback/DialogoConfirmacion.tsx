"use client";
import { useEffect, useId, useRef } from "react";
import type { AccionConfirmacion, OpcionesConfirmacion } from "@/lib/feedback/tipos";

const tonos: Record<NonNullable<AccionConfirmacion["tono"]>, string> = {
  primario: "bg-deep text-white hover:bg-deep-2 focus-visible:ring-deep-2/25",
  peligro: "border border-red-500/45 bg-white text-red-800 hover:bg-red-50 focus-visible:ring-red-500/25",
  neutro: "border border-line-2 bg-surface text-ink-2 hover:border-line focus-visible:ring-gold/20",
};

/**
 * Acción que recibe el foco al abrir: la primera habilitada de tono distinto
 * de «peligro» (para que pulsar Intro sin pensar nunca dispare la opción
 * destructiva), o si todas las seguras están deshabilitadas, la última acción
 * habilitada que quede.
 */
function accionInicial(acciones: AccionConfirmacion[]): AccionConfirmacion | undefined {
  const habilitadas = acciones.filter((accion) => !accion.deshabilitada);
  return habilitadas.find((accion) => accion.tono !== "peligro") ?? habilitadas[habilitadas.length - 1];
}

export function DialogoConfirmacion({
  opciones, onResponder,
}: {
  opciones: OpcionesConfirmacion | null;
  onResponder: (clave: string) => void;
}) {
  const referencia = useRef<HTMLDialogElement>(null);
  const mousedownEnFondo = useRef(false);
  const idTitulo = useId();

  useEffect(() => {
    const dialogo = referencia.current;
    if (!dialogo) return;
    if (opciones && !dialogo.open) dialogo.showModal();
    if (opciones) {
      // showModal() enfoca el primer descendiente enfocable, que puede ser
      // la acción destructiva si «Guardar y continuar» está deshabilitada.
      // Se corrige a mano justo después. Esto también cubre la transición
      // en la que una segunda confirmación sustituye a la primera mientras
      // el <dialog> ya estaba abierto, para que el foco se mueva igualmente.
      dialogo.querySelector<HTMLButtonElement>("[data-autofoco]")?.focus();
    }
    if (!opciones && dialogo.open) dialogo.close();
  }, [opciones]);

  const objetivoFoco = opciones ? accionInicial(opciones.acciones) : undefined;

  return (
    <dialog
      ref={referencia}
      aria-labelledby={opciones ? idTitulo : undefined}
      // Escape y clic en el fondo resuelven «cancelar»: la salida segura es
      // siempre la que no destruye trabajo.
      onCancel={(evento) => { evento.preventDefault(); onResponder("cancelar"); }}
      onMouseDown={(evento) => { mousedownEnFondo.current = evento.target === referencia.current; }}
      onClick={(evento) => {
        // Solo cancela si la pulsación y la suelta ocurren sobre el fondo:
        // una selección de texto que empieza dentro del panel y termina
        // fuera también dispara click en el <dialog>, y no debe descartar
        // la respuesta del usuario.
        if (evento.target === referencia.current && mousedownEnFondo.current) onResponder("cancelar");
      }}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 text-ink shadow-[0_24px_60px_rgb(9_39_44/0.28)] backdrop:bg-deep/35 backdrop:backdrop-blur-[2px]"
    >
      {opciones && (
        <div className="p-4">
          <h2 id={idTitulo} className="text-[15px] font-extrabold tracking-[-0.02em] text-ink">
            {opciones.titulo}
          </h2>
          <p className="mt-1.5 text-xs font-medium leading-5 text-muted">{opciones.mensaje}</p>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            {opciones.acciones.map((accion) => {
              const idMotivo = accion.deshabilitada ? `${idTitulo}-motivo-${accion.clave}` : undefined;
              return (
                <button
                  key={accion.clave}
                  type="button"
                  disabled={Boolean(accion.deshabilitada)}
                  data-autofoco={accion === objetivoFoco ? "" : undefined}
                  aria-describedby={idMotivo}
                  onClick={() => onResponder(accion.clave)}
                  className={`rounded-xl px-3 py-2 text-xs font-extrabold transition focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-45 ${tonos[accion.tono ?? "neutro"]}`}
                >
                  {accion.etiqueta}
                </button>
              );
            })}
          </div>
          {opciones.acciones.map((accion) => accion.deshabilitada && (
            <p
              key={accion.clave}
              id={`${idTitulo}-motivo-${accion.clave}`}
              className="mt-2 text-right text-[10px] font-bold text-muted-2"
            >
              {accion.deshabilitada}
            </p>
          ))}
        </div>
      )}
    </dialog>
  );
}
