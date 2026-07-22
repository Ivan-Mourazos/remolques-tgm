"use client";
import { useEffect, useState } from "react";
import type { CalcParams } from "@/lib/calc/params";
import { CampoNum } from "@/components/workspace/campos";

export default function ParametrosPage() {
  const [p, setP] = useState<CalcParams | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; error: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/parametros")
      .then((r) => r.json())
      .then(setP)
      .catch(() => setAviso({ texto: "No se pudieron cargar los parámetros.", error: true }));
  }, []);
  if (!p) {
    return (
      <div className="text-sm text-muted-2">
        {aviso ? <span className="text-red-700">{aviso.texto}</span> : "Cargando…"}
      </div>
    );
  }

  const setConst = (k: keyof CalcParams, v: number) => setP({ ...p, [k]: v });
  const setRecogida = (i: number, campo: "delante" | "atras" | "lateralSoloAtras" | "lateralSoloDelante", v: number) =>
    setP({ ...p, recogidas: p.recogidas.map((r, j) => (j === i ? { ...r, [campo]: v } : r)) });

  async function guardar() {
    try {
      const res = await fetch("/api/parametros", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p),
      });
      if (res.ok) {
        setAviso({ texto: "Parámetros guardados.", error: false });
        return;
      }
      const detalle = (await res.json().catch(() => null))?.error ?? String(res.status);
      setAviso({ texto: `No se guardó: ${detalle}`, error: true });
    } catch {
      setAviso({ texto: "Error de red al guardar.", error: true });
    }
  }

  return (
    <div className="max-w-4xl">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-gold-2">Configuración</p>
      <h1 className="mb-4 mt-0.5 text-[26px] font-extrabold tracking-[-0.045em] text-ink">Parámetros de cálculo</h1>
      <section className="mb-4 rounded-2xl border border-line bg-surface/95 p-4 shadow-[0_10px_28px_rgb(14_45_49/0.045)]">
      <h2 className="mb-3 text-sm font-extrabold text-ink-2">Constantes de lona</h2>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        <CampoNum name="demasiaAlto" label="Demasía alto" value={p.demasiaAlto} onChange={(v) => setConst("demasiaAlto", v)} />
        <CampoNum name="demasiaContornoNormal" label="Contorno normal" value={p.demasiaContornoNormal} onChange={(v) => setConst("demasiaContornoNormal", v)} />
        <CampoNum name="demasiaContornoEnfundar" label="Contorno enfundar" value={p.demasiaContornoEnfundar} onChange={(v) => setConst("demasiaContornoEnfundar", v)} />
        <CampoNum name="demasiaLonaHecha" label="Lona hecha" value={p.demasiaLonaHecha} onChange={(v) => setConst("demasiaLonaHecha", v)} />
        <CampoNum name="ajusteContornoBase" label="Contorno: bastillas" value={p.ajusteContornoBase} onChange={(v) => setConst("ajusteContornoBase", v)} />
        <CampoNum name="ajusteContornoCurva" label="Contorno: extra curva" value={p.ajusteContornoCurva} onChange={(v) => setConst("ajusteContornoCurva", v)} />
        <CampoNum name="pasoOllaosDefecto" label="Paso ollaos" value={p.pasoOllaosDefecto} onChange={(v) => setConst("pasoOllaosDefecto", v)} />
        <CampoNum name="primerOllao" label="Primer ollao" value={p.primerOllao} onChange={(v) => setConst("primerOllao", v)} />
      </div>
      </section>
      <section className="rounded-2xl border border-line bg-surface/95 p-4 shadow-[0_10px_28px_rgb(14_45_49/0.045)]">
      <h2 className="mb-3 text-sm font-extrabold text-ink-2">Tipos de recogida · demasías</h2>
      <div className="mb-4 overflow-x-auto rounded-xl">
      <table className="w-full min-w-[680px] text-xs">
        <thead>
          <tr className="bg-surface-3 text-left uppercase text-muted">
            <th className="p-1">Recogida</th><th className="p-1">Delante</th><th className="p-1">Atrás</th>
            <th className="p-1">Lat. solo atrás</th><th className="p-1">Lat. solo delante</th>
          </tr>
        </thead>
        <tbody>
          {p.recogidas.map((r, i) => (
            <tr key={r.nombre} className="border-b border-line">
              <td className="p-1 font-medium">{r.nombre}</td>
              {(["delante", "atras", "lateralSoloAtras", "lateralSoloDelante"] as const).map((campo) => (
                <td key={campo} className="p-1">
                  <input type="number" step="0.5" name={`recogida-${i}-${campo}`}
                    aria-label={`${r.nombre}, ${campo}`}
                    className="w-20 rounded-lg border border-line bg-white px-2 py-1 tabular-nums outline-none focus-visible:border-gold focus-visible:ring-4 focus-visible:ring-gold/15"
                    value={r[campo]} onChange={(e) => setRecogida(i, campo, Number(e.target.value))} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <button onClick={guardar} className="rounded-lg bg-deep px-4 py-2 text-sm font-bold text-white shadow-[0_7px_20px_rgb(9_39_44/0.20)] transition hover:bg-deep-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-deep-2/25">
        Guardar parámetros
      </button>
      {aviso && (
        <p role={aviso.error ? "alert" : "status"} className={`mt-2 text-xs font-semibold ${aviso.error ? "text-red-700" : "text-muted"}`}>
          {aviso.texto}
        </p>
      )}
      </section>
    </div>
  );
}
