"use client";
import type { LonaResult } from "@/lib/calc/lona";
import type { BaquetonResult } from "@/lib/calc/baqueton";

const fmt = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 2 });

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[0_1px_2px_rgb(15_23_42/0.04)]">
      <div className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{label}</div>
      <div className="mt-0.5 text-base font-extrabold tabular-nums text-slate-900">{valor}</div>
    </div>
  );
}

function TablaReparto({ reparto }: { reparto: { laterales: number[]; atras: number[]; delante: number[] } }) {
  const filas: Array<[string, number[]]> = [
    ["OLLAOS LATERALES DE ATRÁS A ADELANTE", reparto.laterales],
    ["OLLAOS ATRÁS DE IZQUIERDA A DERECHA", reparto.atras],
    ["OLLAOS DELANTE DE IZQUIERDA A DERECHA", reparto.delante],
  ];
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm tabular-nums">
        <thead>
          <tr className="bg-neutral-100 text-neutral-600">
            <th className="px-3 py-2 text-left font-bold">Reparto</th>
            {Array.from({ length: 12 }, (_, i) => <th key={i} className="px-2 py-2 font-bold">{i + 1}</th>)}
            <th className="px-3 py-2 font-bold">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {filas.map(([nombre, pos]) => (
            <tr key={nombre} className="border-b border-neutral-100">
              <td className="whitespace-nowrap px-3 py-2 font-semibold">{nombre}</td>
              {Array.from({ length: 12 }, (_, i) => (
                <td key={i} className="px-2 py-2 text-center">{pos[i] != null ? fmt(pos[i]) : "–"}</td>
              ))}
              <td className="px-3 py-2 text-center font-extrabold">{pos.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ResultadosLona({ res }: { res: LonaResult }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        <Dato label="Medida lona hecha" valor={`${fmt(res.lonaHecha.largo)} × ${fmt(res.lonaHecha.ancho)}`} />
        <Dato label="Contorno SCAD" valor={res.contornoAjustado ? fmt(res.contornoAjustado) : "—"} />
        <Dato label="Paño delantero" valor={`${fmt(res.panoDelantero.ancho)} × ${fmt(res.panoDelantero.alto)}`} />
        <Dato label="Paño trasero" valor={`${fmt(res.panoTrasero.ancho)} × ${fmt(res.panoTrasero.alto)}`} />
        <Dato label="Paño contorno" valor={res.panoContorno ? `${fmt(res.panoContorno.ancho)} × ${fmt(res.panoContorno.alto)}` : "—"} />
        <Dato label="Recoge delante" valor={res.recogeDelanteTexto} />
        <Dato label="Recoge atrás" valor={res.recogeAtrasTexto} />
      </div>
      <TablaReparto reparto={res.reparto} />
      {res.notas.length > 0 && (
        <ul className="list-inside list-disc text-xs text-amber-700">
          {res.notas.map((n) => <li key={n}>{n}</li>)}
        </ul>
      )}
    </div>
  );
}

export function ResultadosBaqueton({ res }: { res: BaquetonResult }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        <Dato label="Paño único" valor={`${fmt(res.panoUnico.largo)} × ${fmt(res.panoUnico.ancho)}`} />
        <Dato label="Remolque hecho" valor={`${fmt(res.remolqueHecho.largo)} × ${fmt(res.remolqueHecho.ancho)}`} />
        <Dato label="Baquetón + costura" valor={fmt(res.baquetonCostura)} />
        <Dato label="Esquinas (del./tras.)" valor={`${fmt(res.esquinaDelante)} / ${fmt(res.esquinaDetras)}`} />
        <Dato label="Baquetón" valor={res.baquetonTrasero ? `Trasero ${fmt(res.baquetonTrasero)} · NO EN LÍNEA` : "EN LÍNEA"} />
        <Dato label="Superficie" valor={`${fmt(res.superficieM2)} m²/ud`} />
      </div>
      <TablaReparto reparto={res.reparto} />
      {res.notas.length > 0 && (
        <ul className="list-inside list-disc text-xs text-amber-700">
          {res.notas.map((n) => <li key={n}>{n}</li>)}
        </ul>
      )}
    </div>
  );
}
