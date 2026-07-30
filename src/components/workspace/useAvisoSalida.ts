"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Avisa antes de abandonar la página con cambios sin guardar.
 *
 * El de recargar o cerrar la pestaña sigue siendo el cuadro nativo: los
 * navegadores no permiten otra cosa. El de los enlaces internos sí es propio,
 * y por eso cancela siempre la navegación y navega por código después de que
 * el usuario responda.
 */
export function useAvisoSalida({
  activo, confirmarSalida,
}: {
  activo: boolean;
  /** Resuelve true si se puede abandonar la página. */
  confirmarSalida: () => Promise<boolean>;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!activo) return;
    const antesDeSalir = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const interceptarEnlace = (event: MouseEvent) => {
      // Abrir en otra pestaña o ventana no pone en riesgo el trabajo sin
      // guardar: esta página se queda como está. No hay nada que confirmar, y
      // además interceptarlo obligaría a navegar en la pestaña actual.
      if (event.button !== 0 || event.metaKey || event.ctrlKey
        || event.shiftKey || event.altKey) return;
      const enlace = (event.target as Element | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!enlace || enlace.target === "_blank" || event.defaultPrevented) return;
      const destino = new URL(enlace.href, window.location.href);
      if (destino.origin !== window.location.origin || destino.pathname === window.location.pathname) return;
      event.preventDefault();
      event.stopPropagation();
      // Solo la parte interna de la URL. Nunca el href crudo: la documentación
      // de Next avisa de que router.push ejecuta las URL «javascript:».
      const ruta = `${destino.pathname}${destino.search}${destino.hash}`;
      void confirmarSalida().then((puedeSalir) => {
        if (puedeSalir) router.push(ruta);
      });
    };
    window.addEventListener("beforeunload", antesDeSalir);
    document.addEventListener("click", interceptarEnlace, true);
    return () => {
      window.removeEventListener("beforeunload", antesDeSalir);
      document.removeEventListener("click", interceptarEnlace, true);
    };
  }, [activo, confirmarSalida, router]);
}
