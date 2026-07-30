import type { ReactNode } from "react";
import type { Severidad } from "@/lib/feedback/tipos";

const estilos: Record<Severidad, string> = {
  error: "border-red-500/40 bg-red-50/90 text-red-900",
  exito: "border-deep/25 bg-deep/8 text-deep",
  info: "border-gold/35 bg-gold/8 text-ink-2",
};

const iconos: Record<Severidad, string> = { error: "!", exito: "✓", info: "i" };

/**
 * Un fallo interrumpe al lector de pantalla; lo demás espera su turno.
 */
export function Aviso({
  severidad, texto, onDescartar, children, enRegionViva = false,
}: {
  severidad: Severidad;
  texto: string;
  onDescartar?: () => void;
  children?: ReactNode;
  /**
   * `true` cuando un ancestro ya expone la región viva (p. ej. PilaAvisos),
   * de modo que este aviso no debe declarar su propio role/aria-live para
   * las severidades "educadas" y así evitar el doble anuncio. Los errores
   * conservan siempre role="alert", que se anuncia de forma fiable incluso
   * anidado dentro de una región polite.
   */
  enRegionViva?: boolean;
}) {
  const esError = severidad === "error";
  return (
    <div
      role={esError ? "alert" : enRegionViva ? undefined : "status"}
      aria-live={esError ? "assertive" : enRegionViva ? undefined : "polite"}
      className={`flex items-start gap-2.5 rounded-xl border px-3 py-2 text-xs font-semibold shadow-sm ${estilos[severidad]}`}
    >
      <span aria-hidden className="mt-px grid h-4 w-4 shrink-0 place-items-center rounded-full border border-current text-[9px] font-extrabold">
        {iconos[severidad]}
      </span>
      <span className="min-w-0 flex-1 leading-5">{texto}</span>
      {children}
      {onDescartar && (
        <button
          type="button"
          onClick={onDescartar}
          aria-label="Descartar aviso"
          className="-mr-1 shrink-0 rounded-md px-1.5 text-sm font-bold opacity-60 transition hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
        >
          ×
        </button>
      )}
    </div>
  );
}
