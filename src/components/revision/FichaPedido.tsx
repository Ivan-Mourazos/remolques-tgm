"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { FichaPedido as DatosFicha } from "@/lib/revision/ficha-pedido";
import type { CalcParams } from "@/lib/calc/params";
import { rasterizarSvg } from "@/lib/svg/rasterizar";
import { SALIDA_MONOCROMA } from "@/lib/pdf/salida";
import { Aviso } from "@/components/feedback/Aviso";
import { useAvisos, useConfirmar } from "@/components/feedback/useFeedback";

const descargar = (blob: Blob, nombre: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
};

export function FichaPedido({ pedido }: { pedido: string }) {
  const [ficha, setFicha] = useState<DatosFicha | null>(null);
  const [tecnicos, setTecnicos] = useState<string[]>([]);
  const [quien, setQuien] = useState("");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const avisar = useAvisos();
  const confirmar = useConfirmar();

  // Cadena de promesas y no async/await: el estado se toca dentro de las
  // devoluciones de llamada, que es lo que el efecto de abajo necesita para no
  // encadenar renders (react-hooks/set-state-in-effect).
  const cargar = useCallback(() => (
    fetch(`/api/pedidos/${encodeURIComponent(pedido)}`)
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((datos: DatosFicha) => setFicha(datos))
      .catch(() => setError("No se pudo cargar el pedido."))
  ), [pedido]);

  useEffect(() => { void cargar(); }, [cargar]);
  useEffect(() => {
    fetch("/api/parametros")
      .then((r) => r.json())
      .then((params: CalcParams) => setTecnicos(params.tecnicos))
      .catch(() => setTecnicos([]));
  }, []);

  async function decidir(accion: "aprobar" | "no-aprobar") {
    if (!quien) {
      avisar("info", "Elige quién revisa antes de decidir.");
      return;
    }
    setOcupado(true);
    try {
      const respuesta = await fetch(`/api/pedidos/${encodeURIComponent(pedido)}/revision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion, por: quien }),
      });
      const datos = await respuesta.json().catch(() => null);
      if (!respuesta.ok) {
        // 409: alguien se pronunció antes. Se recarga y se enseña el estado
        // real en vez de pisar su decisión.
        avisar("error", datos?.error ?? "No se pudo guardar la decisión.");
        await cargar();
        return;
      }
      avisar("exito", accion === "aprobar" ? "Pedido aprobado." : "Pedido no aprobado.");
      await cargar();
    } catch {
      avisar("error", "Error de red al guardar la decisión.");
    } finally {
      setOcupado(false);
    }
  }

  async function producir(sustituir = false) {
    if (!ficha) return;
    if (!quien) {
      avisar("info", "Elige quién pasa el pedido a producción.");
      return;
    }
    setOcupado(true);
    try {
      // Los dibujos se rasterizan aquí, como en la vista previa: @react-pdf no
      // dibuja SVG suelto.
      const snapshots: Record<string, string | null> = {};
      for (const linea of ficha.lineas) {
        snapshots[linea.id] = linea.snapshotSvg
          ? await rasterizarSvg(linea.snapshotSvg, { monocromo: SALIDA_MONOCROMA })
          : null;
      }
      const respuesta = await fetch(`/api/pedidos/${encodeURIComponent(pedido)}/produccion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ por: quien, sustituir, snapshots }),
      });
      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => null);
        if (datos?.requiereConfirmacion) {
          const clave = await confirmar({
            titulo: "Ya hay un PDF de este pedido",
            mensaje: datos.error,
            acciones: [
              { clave: "sustituir", etiqueta: "Sustituirlo", tono: "peligro" },
              { clave: "cancelar", etiqueta: "Cancelar", tono: "neutro" },
            ],
          });
          if (clave === "sustituir") await producir(true);
          return;
        }
        avisar("error", datos?.error ?? "No se pudo pasar a producción.");
        await cargar();
        return;
      }
      const destinos = Number(respuesta.headers.get("X-Pdf-Destinos") ?? 0);
      const nombre = respuesta.headers.get("X-Nombre-Pdf") ?? "planteamiento.pdf";
      if (destinos === 0) {
        descargar(await respuesta.blob(), nombre);
        avisar("exito", `PDF generado (${nombre}). Configura las rutas del servidor para archivarlo.`);
      } else {
        avisar("exito", `Pedido en producción. PDF archivado en ${destinos} carpetas.`);
      }
      await cargar();
    } catch {
      avisar("error", "Error de red al pasar a producción.");
    } finally {
      setOcupado(false);
    }
  }

  if (error) return <Aviso severidad="error" texto={error} />;
  if (!ficha) return <p className="text-sm text-muted-2">Cargando…</p>;

  return (
    <div className="max-w-5xl">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-gold-2">Revisión</p>
      <h1 className="mb-1 mt-0.5 text-[26px] font-extrabold tracking-[-0.045em] text-ink">
        {ficha.numeroPedido}
      </h1>
      <p className="mb-1 text-sm text-ink-2">{ficha.cliente || "—"}</p>
      <p className="mb-4 text-sm font-bold text-gold-2">{ficha.visible.etiqueta}</p>

      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface/95 p-3">
        <label className="text-xs font-bold text-muted" htmlFor="quien">Soy</label>
        <select
          id="quien"
          value={quien}
          onChange={(e) => setQuien(e.target.value)}
          className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink"
        >
          <option value="">Elige tu nombre</option>
          {tecnicos.map((tecnico) => <option key={tecnico} value={tecnico}>{tecnico}</option>)}
        </select>

        <button
          type="button"
          onClick={() => decidir("aprobar")}
          disabled={ocupado || ficha.visible.situacion === "HISTORICO"}
          className="rounded-lg bg-ink px-3 py-1.5 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-35"
        >
          Aprobar
        </button>
        <button
          type="button"
          onClick={() => decidir("no-aprobar")}
          disabled={ocupado || ficha.visible.situacion === "HISTORICO"}
          className="rounded-lg border border-line px-3 py-1.5 text-xs font-extrabold text-ink disabled:cursor-not-allowed disabled:opacity-35"
        >
          No aprobar
        </button>
        <button
          type="button"
          onClick={() => producir(false)}
          disabled={ocupado || !ficha.visible.puedeProducir}
          title={ficha.visible.impedimento || undefined}
          className="rounded-lg bg-gold px-3 py-1.5 text-xs font-extrabold text-deep disabled:cursor-not-allowed disabled:opacity-35"
        >
          Pasar a producción
        </button>
        {ficha.lineas[0] && (
          <Link
            href={`/planteamiento?desde=${encodeURIComponent(ficha.lineas[0].id)}`}
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-extrabold text-ink"
          >
            Abrir en Planteamiento
          </Link>
        )}
      </div>

      {ficha.visible.impedimento && (
        <div className="mb-4"><Aviso severidad="info" texto={ficha.visible.impedimento} /></div>
      )}

      {ficha.lineas.map((linea) => (
        <section
          key={linea.id}
          className="mb-4 rounded-2xl border border-line bg-surface/95 p-4 shadow-[0_10px_28px_rgb(14_45_49/0.045)]"
        >
          <h2 className="mb-3 text-sm font-extrabold text-ink-2">{linea.nombre}</h2>

          {linea.snapshotSvg && (
            <div
              className="mb-4 overflow-hidden rounded-xl border border-line [&>svg]:h-auto [&>svg]:w-full"
              // El dibujo ya está guardado como SVG en el registro, generado por
              // esta misma aplicación: no hay que recalcularlo ni volver a
              // montar la escena.
              dangerouslySetInnerHTML={{ __html: linea.snapshotSvg }}
            />
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {linea.secciones.map((seccion) => (
              <div key={seccion.titulo}>
                <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">
                  {seccion.titulo}
                </p>
                <dl className="text-xs">
                  {seccion.campos.map((campo) => (
                    <div key={campo.etiqueta} className="flex justify-between gap-3 border-b border-line/60 py-1 last:border-0">
                      <dt className="text-muted-2">{campo.etiqueta}</dt>
                      <dd className="text-right font-bold text-ink">{campo.valor}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-4 border-t border-line pt-3 text-[11px] text-muted-2">
            {linea.corte.map((celda) => (
              <div key={celda.titulo}>
                <p className="font-extrabold uppercase tracking-wide">{celda.titulo}</p>
                {celda.lineas.map((texto) => <p key={texto}>{texto}</p>)}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
