"use client";
import { useCallback, useEffect, useState } from "react";
import styles from "./revision.module.css";
import type { FichaPedido as DatosFicha } from "@/lib/revision/ficha-pedido";
import type { CalcParams } from "@/lib/calc/params";
import { rasterizarSvg } from "@/lib/svg/rasterizar";
import { SALIDA_MONOCROMA } from "@/lib/pdf/salida";
import { DetalleLineaRevision } from "@/components/revision/DetalleLineaRevision";
import { Aviso } from "@/components/feedback/Aviso";
import { useAvisos, useConfirmar } from "@/components/feedback/useFeedback";

export function FichaPedido({ pedido }: { pedido: string }) {
  const [ficha, setFicha] = useState<DatosFicha | null>(null);
  const [tecnicos, setTecnicos] = useState<string[]>([]);
  const [por, setPor] = useState("");
  const [error, setError] = useState("");
  const [accion, setAccion] = useState<"guardar" | "preview" | null>(null);
  const ocupado = accion !== null;
  const avisar = useAvisos();
  const confirmar = useConfirmar();

  const cargar = useCallback(() => (
    fetch(`/api/pedidos/${encodeURIComponent(pedido)}`)
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((datos: DatosFicha) => { setFicha(datos); setError(""); })
      .catch(() => setError("No se pudo cargar el pedido."))
  ), [pedido]);

  useEffect(() => { void cargar(); }, [cargar]);

  useEffect(() => {
    fetch("/api/parametros")
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((params: CalcParams) => setTecnicos(params.tecnicos))
      .catch(() => setTecnicos([]));
  }, []);

  async function prepararSnapshots() {
    const snapshots: Record<string, string | null> = {};
    for (const linea of ficha?.lineas ?? []) {
      snapshots[linea.id] = linea.snapshotSvg
        ? await rasterizarSvg(linea.snapshotSvg, { monocromo: SALIDA_MONOCROMA })
        : null;
    }
    return snapshots;
  }

  async function previsualizar() {
    if (ocupado || !ficha) return;
    // Abrir durante el clic para evitar que el navegador bloquee la nueva pestaña.
    const ventana = window.open("", "_blank");
    if (!ventana) {
      avisar("error", "El navegador ha bloqueado la vista previa. Permite ventanas emergentes para esta aplicación.");
      return;
    }
    ventana.opener = null;
    ventana.document.title = "Generando vista previa…";
    ventana.document.body.textContent = "Generando vista previa del planteamiento…";
    ventana.document.body.style.cssText = "font:600 14px sans-serif;color:#17393e;padding:24px";
    setAccion("preview");
    try {
      const snapshots = await prepararSnapshots();
      const respuesta = await fetch(`/api/pedidos/${encodeURIComponent(pedido)}/vista-previa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ por, snapshots }),
      });
      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => null);
        ventana.close();
        avisar("error", datos?.error ?? "No se pudo generar la vista previa.");
        return;
      }
      const url = URL.createObjectURL(await respuesta.blob());
      if (ventana.closed) {
        URL.revokeObjectURL(url);
        return;
      }
      ventana.location.replace(url);
      // Mantener disponible el PDF mientras su pestaña siga abierta.
      const limpieza = window.setInterval(() => {
        if (ventana.closed) {
          URL.revokeObjectURL(url);
          window.clearInterval(limpieza);
        }
      }, 1000);
      avisar("info", "Vista previa abierta sin guardar archivos.");
    } catch {
      ventana.close();
      avisar("error", "No se pudo generar la vista previa. Comprueba la conexión y vuelve a intentarlo.");
    } finally {
      setAccion(null);
    }
  }

  async function guardar(por: string, sustituir = false) {
    if (!ficha) return;
    if (!por) { avisar("info", "Elige el nombre del revisor antes de guardar."); return; }
    setAccion("guardar");
    try {
      const snapshots = await prepararSnapshots();
      const respuesta = await fetch(`/api/pedidos/${encodeURIComponent(pedido)}/guardar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ por, sustituir, snapshots }),
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
          if (clave === "sustituir") await guardar(por, true);
          return;
        }
        avisar("error", datos?.error ?? "No se pudo guardar el planteamiento.");
        await cargar();
        return;
      }
      const destinos = Number(respuesta.headers.get("X-Pdf-Destinos") ?? 0);
      if (destinos !== 2) {
        avisar("error", "No se ha confirmado el archivo en las dos carpetas. Vuelve a intentarlo.");
        return;
      }
      const nombre = respuesta.headers.get("X-Nombre-Pdf") ?? "";
      avisar("exito", `Planteamiento guardado: ${nombre} en PLANTEAMIENTOS y ${nombre.replace(/-10\.pdf$/, ".pdf")} en la carpeta del año. Revisor: ${por}.`);
      await cargar();
    } catch {
      avisar("error", "No se pudo confirmar el guardado. Comprueba la conexión y vuelve a intentarlo.");
    } finally {
      setAccion(null);
    }
  }

  if (error) return <Aviso severidad="error" texto={error} />;
  if (!ficha) return <p className="text-sm text-muted-2">Cargando…</p>;

  return (
    <div className={`${styles.frame} min-w-0`}>
      <header className={styles.pageHeader}>
        <div className={styles.identity}>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-gold-2">Revisión</p>
          <h1 className="mb-1 mt-0.5 text-[26px] font-extrabold tracking-[-0.045em] text-ink">{ficha.numeroPedido.toUpperCase()}</h1>
          <p className="mb-1 text-sm text-ink-2">{ficha.cliente || "—"}</p>
          <p className="mb-4 text-sm font-bold text-gold-2">{ficha.visible.etiqueta}</p>
        </div>
        <div className={`${styles.actions} mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface/95 p-3`}>
          <label htmlFor="revisado-por" className="text-xs font-bold text-muted">Revisado por</label>
          <select id="revisado-por" value={por} disabled={ocupado} onChange={e => setPor(e.target.value)} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink">
            <option value="">Elige el revisor</option>
            {tecnicos.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button
            type="button"
            onClick={() => void previsualizar()}
            disabled={ocupado || !ficha.visible.puedeGuardar}
            title="Abrir el PDF en una pestaña nueva sin guardarlo"
            className="rounded-lg border border-line px-4 py-2 text-sm font-bold text-ink disabled:cursor-not-allowed disabled:opacity-35"
          >
            {accion === "preview" ? "Generando vista previa…" : "Vista previa del planteamiento"}
          </button>
          <button
            type="button"
            onClick={() => void guardar(por)}
            disabled={ocupado || !por || !ficha.visible.puedeGuardar}
            title={ficha.visible.impedimento || undefined}
            className="rounded-lg bg-gold px-4 py-2 text-sm font-extrabold text-deep disabled:cursor-not-allowed disabled:opacity-35"
          >
            {accion === "guardar" ? "Preparando guardado…" : "Guardar planteamiento"}
          </button>
        </div>
        {ficha.visible.impedimento && <Aviso severidad="info" texto={ficha.visible.impedimento} />}
      </header>
      <div className={styles.list} role="region" aria-label="Fichas del pedido" tabIndex={0}>
        {ficha.lineas.map(linea => <DetalleLineaRevision key={linea.id} linea={linea} />)}
      </div>
    </div>
  );
}
