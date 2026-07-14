"use client";
import { useEffect, useState } from "react";
import type { CalcParams } from "@/lib/calc/params";
import { CampoNum } from "@/components/workspace/campos";

export default function ParametrosPage() {
  const [p, setP] = useState<CalcParams | null>(null);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    fetch("/api/parametros").then((r) => r.json()).then(setP);
  }, []);
  if (!p) return <main className="p-4 text-sm text-neutral-400">Cargando…</main>;

  const setConst = (k: keyof CalcParams, v: number) => setP({ ...p, [k]: v });
  const setRecogida = (i: number, campo: "delante" | "atras" | "lateralSoloAtras" | "lateralSoloDelante", v: number) =>
    setP({ ...p, recogidas: p.recogidas.map((r, j) => (j === i ? { ...r, [campo]: v } : r)) });

  async function guardar() {
    const res = await fetch("/api/parametros", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p),
    });
    setAviso(res.ok ? "Parámetros guardados." : "Error al guardar.");
  }

  return (
    <main className="max-w-3xl p-4">
      <h1 className="mb-4 text-lg font-semibold">Parámetros de cálculo</h1>
      <h2 className="mb-2 text-sm font-semibold">Constantes de lona</h2>
      <div className="mb-4 grid grid-cols-3 gap-2">
        <CampoNum label="Demasía alto" value={p.demasiaAlto} onChange={(v) => setConst("demasiaAlto", v)} />
        <CampoNum label="Contorno normal" value={p.demasiaContornoNormal} onChange={(v) => setConst("demasiaContornoNormal", v)} />
        <CampoNum label="Contorno enfundar" value={p.demasiaContornoEnfundar} onChange={(v) => setConst("demasiaContornoEnfundar", v)} />
        <CampoNum label="Lona hecha" value={p.demasiaLonaHecha} onChange={(v) => setConst("demasiaLonaHecha", v)} />
        <CampoNum label="Aumento curva" value={p.aumentoCurvaContorno} onChange={(v) => setConst("aumentoCurvaContorno", v)} />
        <CampoNum label="Paso ollaos" value={p.pasoOllaosDefecto} onChange={(v) => setConst("pasoOllaosDefecto", v)} />
        <CampoNum label="Primer ollao" value={p.primerOllao} onChange={(v) => setConst("primerOllao", v)} />
      </div>
      <h2 className="mb-2 text-sm font-semibold">Tipos de recogida (demasías)</h2>
      <table className="mb-4 w-full text-xs">
        <thead>
          <tr className="bg-neutral-50 text-left uppercase text-neutral-500">
            <th className="p-1">Recogida</th><th className="p-1">Delante</th><th className="p-1">Atrás</th>
            <th className="p-1">Lat. solo atrás</th><th className="p-1">Lat. solo delante</th>
          </tr>
        </thead>
        <tbody>
          {p.recogidas.map((r, i) => (
            <tr key={r.nombre} className="border-b border-neutral-100">
              <td className="p-1 font-medium">{r.nombre}</td>
              {(["delante", "atras", "lateralSoloAtras", "lateralSoloDelante"] as const).map((campo) => (
                <td key={campo} className="p-1">
                  <input type="number" step="0.5" className="w-20 rounded border border-neutral-300 px-1 py-0.5 tabular-nums"
                    value={r[campo]} onChange={(e) => setRecogida(i, campo, Number(e.target.value))} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={guardar} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
        Guardar parámetros
      </button>
      {aviso && <p className="mt-2 text-xs text-neutral-600">{aviso}</p>}
    </main>
  );
}
