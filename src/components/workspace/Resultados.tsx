"use client";
import type { LonaResult } from "@/lib/calc/lona";
import type { BaquetonResult } from "@/lib/calc/baqueton";

const fmt = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 2 });

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-lg bg-neutral-50 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="text-sm font-semibold tabular-nums">{valor}</div>
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
    <div className="overflow-x-auto">
      <table className="w-full text-xs tabular-nums">
        <thead>
          <tr className="bg-neutral-100 text-neutral-600">
            <th className="p-1 text-left font-medium">Reparto</th>
            {Array.from({ length: 12 }, (_, i) => <th key={i} className="p-1 font-medium">{i + 1}</th>)}
            <th className="p-1 font-medium">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {filas.map(([nombre, pos]) => (
            <tr key={nombre} className="border-b border-neutral-100">
              <td className="p-1">{nombre}</td>
              {Array.from({ length: 12 }, (_, i) => (
                <td key={i} className="p-1 text-center">{pos[i] != null ? fmt(pos[i]) : "–"}</td>
              ))}
              <td className="p-1 text-center font-semibold">{pos.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ResultadosLona({ res, codigoBobina }: { res: LonaResult; codigoBobina?: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        <Dato label="Medida lona hecha" valor={`${fmt(res.lonaHecha.largo)} × ${fmt(res.lonaHecha.ancho)}`} />
        <Dato label="Contorno ajustado" valor={res.contornoAjustado ? fmt(res.contornoAjustado) : "—"} />
        <Dato label="Metros de tela" valor={res.metrosTela ? `${fmt(res.metrosTela)} m${codigoBobina ? ` · ${codigoBobina}` : ""}` : "—"} />
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

export function ResultadosBaqueton({ res, codigoBobina }: { res: BaquetonResult; codigoBobina?: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        <Dato label="Paño único" valor={`${fmt(res.panoUnico.largo)} × ${fmt(res.panoUnico.ancho)}`} />
        <Dato label="Remolque hecho" valor={`${fmt(res.remolqueHecho.largo)} × ${fmt(res.remolqueHecho.ancho)}`} />
        <Dato label="Baquetón + costura" valor={fmt(res.baquetonCostura)} />
        <Dato label="Esquinas (del./tras.)" valor={`${fmt(res.esquinaDelante)} / ${fmt(res.esquinaDetras)}`} />
        <Dato label="Baquetón" valor={res.baquetonTrasero ? `Trasero ${fmt(res.baquetonTrasero)} · NO EN LÍNEA` : "EN LÍNEA"} />
        <Dato label="Superficie" valor={`${fmt(res.superficieM2)} m²/ud`} />
        <Dato label="Metros de tela" valor={res.metrosTela ? `${fmt(res.metrosTela)} m${codigoBobina ? ` · ${codigoBobina}` : ""}` : "—"} />
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
