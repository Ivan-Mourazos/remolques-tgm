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
      <main className="text-sm text-[#789094]">
        {aviso ? <span className="text-red-700">{aviso.texto}</span> : "Cargando…"}
      </main>
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
    <main className="max-w-4xl">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#a7760b]">Configuración</p>
      <h1 className="mb-4 mt-0.5 text-[26px] font-extrabold tracking-[-0.045em] text-[#102a2f]">Parámetros de cálculo</h1>
      <section className="mb-4 rounded-2xl border border-[#d4dfdb] bg-[#fbfcfb]/95 p-4 shadow-[0_10px_28px_rgb(14_45_49/0.045)]">
      <h2 className="mb-3 text-sm font-extrabold text-[#294b51]">Constantes de lona</h2>
      <div className="grid grid-cols-3 gap-2.5">
        <CampoNum label="Demasía alto" value={p.demasiaAlto} onChange={(v) => setConst("demasiaAlto", v)} />
        <CampoNum label="Contorno normal" value={p.demasiaContornoNormal} onChange={(v) => setConst("demasiaContornoNormal", v)} />
        <CampoNum label="Contorno enfundar" value={p.demasiaContornoEnfundar} onChange={(v) => setConst("demasiaContornoEnfundar", v)} />
        <CampoNum label="Lona hecha" value={p.demasiaLonaHecha} onChange={(v) => setConst("demasiaLonaHecha", v)} />
        <CampoNum label="Contorno: bastillas" value={p.ajusteContornoBase} onChange={(v) => setConst("ajusteContornoBase", v)} />
        <CampoNum label="Contorno: extra curva" value={p.ajusteContornoCurva} onChange={(v) => setConst("ajusteContornoCurva", v)} />
        <CampoNum label="Paso ollaos" value={p.pasoOllaosDefecto} onChange={(v) => setConst("pasoOllaosDefecto", v)} />
        <CampoNum label="Primer ollao" value={p.primerOllao} onChange={(v) => setConst("primerOllao", v)} />
      </div>
      </section>
      <section className="rounded-2xl border border-[#d4dfdb] bg-[#fbfcfb]/95 p-4 shadow-[0_10px_28px_rgb(14_45_49/0.045)]">
      <h2 className="mb-3 text-sm font-extrabold text-[#294b51]">Tipos de recogida · demasías</h2>
      <table className="mb-4 w-full overflow-hidden rounded-xl text-xs">
        <thead>
          <tr className="bg-[#e5ece9] text-left uppercase text-[#587278]">
            <th className="p-1">Recogida</th><th className="p-1">Delante</th><th className="p-1">Atrás</th>
            <th className="p-1">Lat. solo atrás</th><th className="p-1">Lat. solo delante</th>
          </tr>
        </thead>
        <tbody>
          {p.recogidas.map((r, i) => (
            <tr key={r.nombre} className="border-b border-[#e1e8e5]">
              <td className="p-1 font-medium">{r.nombre}</td>
              {(["delante", "atras", "lateralSoloAtras", "lateralSoloDelante"] as const).map((campo) => (
                <td key={campo} className="p-1">
                  <input type="number" step="0.5" className="w-20 rounded-lg border border-[#d0ddd8] bg-white px-2 py-1 tabular-nums outline-none focus:border-[#c59420]"
                    value={r[campo]} onChange={(e) => setRecogida(i, campo, Number(e.target.value))} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={guardar} className="rounded-lg bg-[#0d2c31] px-4 py-2 text-sm font-bold text-white shadow-[0_7px_20px_rgb(9_39_44/0.20)] transition hover:bg-[#173a40]">
        Guardar parámetros
      </button>
      {aviso && (
        <p className={`mt-2 text-xs font-semibold ${aviso.error ? "text-red-700" : "text-[#587278]"}`}>
          {aviso.texto}
        </p>
      )}
      </section>
    </main>
  );
}
