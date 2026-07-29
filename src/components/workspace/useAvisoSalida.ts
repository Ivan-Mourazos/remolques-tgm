"use client";
import { useEffect } from "react";

/** Avisa antes de recargar o de navegar con cambios sin guardar. */
export function useAvisoSalida(activo: boolean) {
  useEffect(() => {
    if (!activo) return;
    const antesDeSalir = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const interceptarEnlace = (event: MouseEvent) => {
      const enlace = (event.target as Element | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!enlace || enlace.target === "_blank" || event.defaultPrevented) return;
      const destino = new URL(enlace.href, window.location.href);
      if (destino.origin !== window.location.origin || destino.pathname === window.location.pathname) return;
      if (!window.confirm("Hay cambios sin guardar. ¿Quieres salir y descartarlos?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", antesDeSalir);
    document.addEventListener("click", interceptarEnlace, true);
    return () => {
      window.removeEventListener("beforeunload", antesDeSalir);
      document.removeEventListener("click", interceptarEnlace, true);
    };
  }, [activo]);
}
