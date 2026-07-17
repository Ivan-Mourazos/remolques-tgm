"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { calcLona, type LonaInput } from "@/lib/calc/lona";
import { calcBaqueton, type BaquetonInput } from "@/lib/calc/baqueton";
import { DEFAULT_PARAMS, type CalcParams } from "@/lib/calc/params";
import type { Material } from "@/lib/calc/materiales-seed";
import type { PlanteamientoRecord, TipoPlanteamiento } from "@/lib/store/types";
import { rasterizarSvg } from "@/lib/svg/rasterizar";
import { nombrePdf } from "@/lib/pdf/ruta-pdf";
import { nombreExcel } from "@/lib/excel/nombre-excel";
import { emptyLona, emptyBaqueton } from "@/components/workspace/entradas-vacias";
import { FormularioLona } from "@/components/workspace/FormularioLona";
import { FormularioBaqueton } from "@/components/workspace/FormularioBaqueton";
import { ResultadosLona, ResultadosBaqueton } from "@/components/workspace/Resultados";
import { Escena3D } from "@/components/workspace/Escena3D";

export interface WorkspaceInicial {
  id?: string;
  tipo: TipoPlanteamiento;
  input: LonaInput | BaquetonInput;
}

export function Workspace({ inicial }: { inicial?: WorkspaceInicial }) {
  const [tipo, setTipo] = useState<TipoPlanteamiento>(inicial?.tipo ?? "lona");
  const [lona, setLona] = useState<LonaInput>(
    inicial?.tipo === "lona" ? (inicial.input as LonaInput) : emptyLona(),
  );
  const [baq, setBaq] = useState<BaquetonInput>(
    inicial?.tipo === "baqueton" ? (inicial.input as BaquetonInput) : emptyBaqueton(),
  );
  const [id, setId] = useState<string | undefined>(inicial?.id);
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [params, setParams] = useState<CalcParams>(DEFAULT_PARAMS);
  const [aviso, setAviso] = useState<string | null>(null);
  const [accion, setAccion] = useState<"guardar" | "pdf" | "excel" | null>(null);
  const busy = accion !== null;
  const snapshotRef = useRef<(() => string | null) | null>(null);

  useEffect(() => {
    fetch("/api/materiales").then((r) => r.json()).then(setMateriales).catch(() => setMateriales([]));
  }, []);

  useEffect(() => {
    fetch("/api/parametros").then((r) => r.json()).then(setParams).catch(() => {});
  }, []);

  const resLona = useMemo(() => calcLona(lona, params), [lona, params]);
  const resBaq = useMemo(() => calcBaqueton(baq, params), [baq, params]);
  const input = tipo === "lona" ? lona : baq;

  async function doGuardar(): Promise<string | null> {
    try {
      setAviso(null);
      const res = await fetch("/api/planteamientos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, tipo, input, snapshotSvg: snapshotRef.current?.() ?? null }),
      });
      if (!res.ok) {
        let detalle = String(res.status);
        try {
          detalle = (await res.json()).error ?? detalle;
        } catch {
          // cuerpo no JSON: dejamos el código de estado
        }
        setAviso(`Error al guardar: ${detalle}`);
        return null;
      }
      const saved = await res.json();
      setId(saved.id);
      setAviso("Guardado en el historial.");
      return saved.id as string;
    } catch {
      setAviso("Error de red al guardar");
      return null;
    }
  }

  async function guardar(): Promise<string | null> {
    if (busy) return null;
    setAccion("guardar");
    try {
      return await doGuardar();
    } finally {
      setAccion(null);
    }
  }

  // «Guardar como»: la ubicación se pide ANTES de generar el fichero, porque
  // el permiso del gesto de usuario caduca en unos segundos y la generación
  // tarda más — pedirlo después hacía que el navegador descargara sin preguntar.
  type Destino =
    | { tipo: "cancelado" }
    | { tipo: "descarga" }
    | { tipo: "picker"; handle: { createWritable(): Promise<{ write(b: Blob): Promise<void>; close(): Promise<void> }> } };

  async function elegirDestino(
    nombre: string, descripcion: string, mime: string, ext: string,
  ): Promise<Destino> {
    type SaveFilePicker = (opts: {
      suggestedName?: string;
      types?: Array<{ description: string; accept: Record<string, string[]> }>;
    }) => Promise<{ createWritable(): Promise<{ write(b: Blob): Promise<void>; close(): Promise<void> }> }>;
    const picker = (window as { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker;
    if (!picker) return { tipo: "descarga" };
    try {
      const handle = await picker({
        suggestedName: nombre,
        types: [{ description: descripcion, accept: { [mime]: [ext] } }],
      });
      return { tipo: "picker", handle };
    } catch (e) {
      if ((e as DOMException).name === "AbortError") return { tipo: "cancelado" };
      return { tipo: "descarga" };
    }
  }

  async function escribirEnDestino(destino: Destino, blob: Blob, nombre: string, descripcion: string) {
    if (destino.tipo === "picker") {
      const writable = await destino.handle.createWritable();
      await writable.write(blob);
      await writable.close();
      setAviso(`${descripcion} guardado como ${nombre}.`);
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
    setAviso(`${descripcion} descargado (${nombre}).`);
  }

  async function generarPdf() {
    if (busy) return;
    setAccion("pdf");
    try {
      const pedido = input.cabecera.numeroPedido.trim();
      const nombre = nombrePdf(pedido);
      const destino = await elegirDestino(nombre, "PDF", "application/pdf", ".pdf");
      if (destino.tipo === "cancelado") {
        setAviso("Guardado cancelado.");
        return;
      }
      const savedId = await doGuardar();
      if (!savedId) return;
      // Un PDF por pedido: una página por cada remolque guardado, en orden de creación.
      let registros: PlanteamientoRecord[] = [];
      if (pedido) {
        registros = await fetch(`/api/planteamientos?pedido=${encodeURIComponent(pedido)}`)
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => []);
      }
      const paginas = [...registros]
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const ids = paginas.length > 0 ? paginas.map((r) => r.id) : [savedId];
      const snapshots: Record<string, string | null> = {};
      for (const r of paginas) {
        snapshots[r.id] = r.snapshotSvg ? await rasterizarSvg(r.snapshotSvg) : null;
      }
      if (!(savedId in snapshots)) {
        snapshots[savedId] = await rasterizarSvg(snapshotRef.current?.() ?? "");
      }
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, snapshots }),
      });
      if (!res.ok) {
        setAviso(`Error al generar PDF: ${res.status}`);
        return;
      }
      await escribirEnDestino(destino, await res.blob(), nombre, "PDF");
    } catch {
      setAviso("Error de red al generar PDF");
    } finally {
      setAccion(null);
    }
  }

  async function generarExcel() {
    if (busy) return;
    setAccion("excel");
    try {
      const nombre = nombreExcel(input.cabecera.numeroPedido.trim(), input.cabecera.version);
      const destino = await elegirDestino(
        nombre, "Excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx",
      );
      if (destino.tipo === "cancelado") {
        setAviso("Guardado cancelado.");
        return;
      }
      const savedId = await doGuardar();
      if (!savedId) return;
      const res = await fetch("/api/excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: savedId,
          snapshot: await rasterizarSvg(snapshotRef.current?.() ?? ""),
        }),
      });
      if (!res.ok) {
        setAviso(`Error al generar Excel: ${res.status}`);
        return;
      }
      await escribirEnDestino(destino, await res.blob(), nombre, "Excel");
    } catch {
      setAviso("Error de red al generar Excel");
    } finally {
      setAccion(null);
    }
  }

  return (
    <div className="grid gap-3 xl:grid-cols-[480px_minmax(0,1fr)]">
      <div>
        <div className="mb-2.5 flex gap-1 rounded-xl border border-line bg-surface-3 p-1 shadow-inner">
          {(["lona", "baqueton"] as const).map((t) => (
            <button key={t} onClick={() => { if (t !== tipo) { setTipo(t); setId(undefined); setAviso(null); } }}
              aria-pressed={tipo === t}
              className={`flex-1 rounded-lg px-3 py-1.5 text-[13px] font-extrabold transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/15 ${tipo === t ? "bg-surface text-ink shadow-[0_4px_14px_rgb(14_45_49/0.10)]" : "text-muted hover:bg-white/55 hover:text-ink"}`}>
              {t === "lona" ? "Lona remolque" : "Baquetón"}
            </button>
          ))}
        </div>
        {tipo === "lona" ? (
          <FormularioLona input={lona} materiales={materiales} params={params} onChange={setLona} />
        ) : (
          <FormularioBaqueton input={baq} materiales={materiales} params={params} onChange={setBaq} />
        )}
        <div className="mt-2.5 flex flex-wrap gap-2">
          <button onClick={guardar} disabled={busy} className="rounded-lg border border-line bg-surface px-3.5 py-2 text-[13px] font-bold text-ink-2 shadow-sm transition-all hover:-translate-y-px hover:border-line-2 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink/10 disabled:cursor-wait disabled:opacity-50">
            {accion === "guardar" ? "Guardando…" : "Guardar"}
          </button>
          <button onClick={generarPdf} disabled={busy} className="rounded-lg bg-deep px-3.5 py-2 text-[13px] font-bold text-white shadow-[0_7px_20px_rgb(9_39_44/0.22)] transition-all hover:-translate-y-px hover:bg-deep-2 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-deep-2/20 disabled:cursor-wait disabled:opacity-50">
            {accion === "pdf" ? "Generando PDF…" : "Generar PDF"}
          </button>
          <button onClick={generarExcel} disabled={busy} className="rounded-lg border border-line bg-surface px-3.5 py-2 text-[13px] font-bold text-ink-2 shadow-sm transition-all hover:-translate-y-px hover:border-line-2 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink/10 disabled:cursor-wait disabled:opacity-50">
            {accion === "excel" ? "Generando Excel…" : "Generar Excel"}
          </button>
        </div>
        {aviso && <p role="status" aria-live="polite" className="mt-2 text-xs font-semibold text-muted">{aviso}</p>}
      </div>
      <div className="flex flex-col gap-4">
        {tipo === "lona" ? (
          <Escena3D modo="lona" largo={lona.largo} ancho={lona.ancho}
            altoDelante={lona.altoDelante} altoAtras={lona.altoAtras}
            aguas={lona.aguas} radioCumbrera={lona.radioCumbrera}
            radioEsquina={lona.radioEsquina} chaflan={lona.chaflan}
            ollaos={resLona.reparto}
            tipoPerfil={lona.tipoPerfil} ventana={lona.ventana} material={lona.material}
            observaciones={lona.observaciones}
            onObservacionesChange={(observaciones) => setLona((actual) => ({ ...actual, observaciones }))}
            onSnapshotReady={(fn) => { snapshotRef.current = fn; }} />
        ) : (
          <Escena3D modo="baqueton" largo={baq.largo} ancho={baq.ancho}
            altoDelante={0} altoAtras={0} tipoPerfil="TIPO 01"
            baqueton={baq.baqueton} material={baq.material}
            ollaos={resBaq.reparto}
            observaciones={baq.observaciones}
            onObservacionesChange={(observaciones) => setBaq((actual) => ({ ...actual, observaciones }))}
            onSnapshotReady={(fn) => { snapshotRef.current = fn; }} />
        )}
        {tipo === "lona"
          ? <ResultadosLona
              res={resLona}
              modoOllaos={lona.modoOllaos}
              primerOllao={lona.primerOllao ?? params.primerOllao}
              onOllaosChange={(ollaosManuales) => setLona((actual) => ({ ...actual, ollaosManuales }))}
            />
          : <ResultadosBaqueton
              res={resBaq}
              modoOllaos={baq.modoOllaos}
              primerOllao={baq.primerOllao ?? params.primerOllao}
              onOllaosChange={(ollaosManuales) => setBaq((actual) => ({ ...actual, ollaosManuales }))}
            />}
      </div>
    </div>
  );
}
