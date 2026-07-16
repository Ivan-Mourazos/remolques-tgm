"use client";

import type { LonaResult } from "@/lib/calc/lona";
import type { BaquetonResult } from "@/lib/calc/baqueton";

export interface RepartoOllaos {
  laterales: number[];
  atras: number[];
  delante: number[];
}

type ClaveReparto = keyof RepartoOllaos;

const fmt = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 2 });

const filas: Array<{ clave: ClaveReparto; nombre: string }> = [
  { clave: "laterales", nombre: "LATERALES · ATRÁS A ADELANTE" },
  { clave: "atras", nombre: "ATRÁS · IZQUIERDA A DERECHA" },
  { clave: "delante", nombre: "DELANTE · IZQUIERDA A DERECHA" },
];

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-line bg-[linear-gradient(145deg,#fdfefd,#f5f8f7)] px-2 py-1.5 shadow-[0_2px_8px_rgb(14_45_49/0.04)]">
      <div className="text-[9px] font-extrabold uppercase leading-[1.15] tracking-[0.045em] text-muted">{label}</div>
      <div className="mt-1 break-words text-[12px] font-extrabold leading-[1.15] tabular-nums text-ink">{valor}</div>
    </div>
  );
}

function Resumen({ columnas, children }: { columnas: number; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto pb-0.5">
      <div
        className="grid gap-1.5"
        style={{
          gridTemplateColumns: `repeat(${columnas}, minmax(94px, 1fr))`,
          minWidth: `${columnas * 100}px`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function CabeceraTabla() {
  return (
    <thead>
      <tr className="bg-surface-3 text-muted">
        <th className="min-w-44 px-3 py-1.5 text-left text-[10px] font-extrabold uppercase tracking-wide">Reparto de ollaos</th>
        {Array.from({ length: 12 }, (_, i) => (
          <th key={i} className="min-w-[38px] px-1 py-1.5 text-center text-[10px] font-extrabold">{i + 1}</th>
        ))}
        <th className="min-w-14 px-2 py-1.5 text-center text-[10px] font-extrabold">TOTAL</th>
      </tr>
    </thead>
  );
}

function ColumnasTabla() {
  return (
    <colgroup>
      <col className="w-44" />
      {Array.from({ length: 12 }, (_, indice) => <col key={indice} className="w-[38px]" />)}
      <col className="w-14" />
    </colgroup>
  );
}

function TablaReparto({ reparto }: { reparto: RepartoOllaos }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-[0_2px_10px_rgb(14_45_49/0.035)]">
      <table className="w-full min-w-[688px] table-fixed text-[11px] tabular-nums">
        <ColumnasTabla />
        <CabeceraTabla />
        <tbody>
          {filas.map(({ clave, nombre }) => {
            const posiciones = reparto[clave];
            return (
              <tr key={clave} className="border-b border-line last:border-b-0">
                <td className="px-2 py-1.5 text-[10px] font-bold leading-tight text-ink-2">{nombre}</td>
                {Array.from({ length: 12 }, (_, i) => (
                  <td key={i} className="px-1 py-1.5 text-center">{posiciones[i] != null ? fmt(posiciones[i]) : "–"}</td>
                ))}
                <td className="px-2 py-1.5 text-center font-extrabold text-ink">{posiciones.length}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EditorOllaos({
  reparto, onChange,
}: {
  reparto: RepartoOllaos;
  onChange: (reparto: RepartoOllaos) => void;
}) {
  const cambiar = (clave: ClaveReparto, indice: number, texto: string) => {
    const siguiente = [...reparto[clave]];
    if (texto === "") {
      if (indice < siguiente.length) siguiente.splice(indice, 1);
    } else {
      const valor = Number(texto);
      if (!Number.isFinite(valor) || valor <= 0 || indice > siguiente.length) return;
      siguiente[indice] = valor;
    }
    onChange({ ...reparto, [clave]: siguiente.slice(0, 12) });
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-line-2 bg-surface shadow-[0_3px_14px_rgb(14_45_49/0.05)]">
      <div className="flex items-center justify-between border-b border-line bg-surface-2 px-3 py-2">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink-2">Ollaos según se indica</p>
        <p className="text-[10px] font-semibold text-muted-2">Una medida por casilla · cm</p>
      </div>
      <table className="w-full min-w-[688px] table-fixed text-[11px] tabular-nums">
        <ColumnasTabla />
        <CabeceraTabla />
        <tbody>
          {filas.map(({ clave, nombre }) => {
            const posiciones = reparto[clave];
            return (
              <tr key={clave} className="border-b border-line last:border-b-0">
                <td className="px-2 py-1.5 text-[10px] font-bold leading-tight text-ink-2">{nombre}</td>
                {Array.from({ length: 12 }, (_, indice) => (
                  <td key={indice} className="p-0.5">
                    <input
                      aria-label={`${nombre}, ollao ${indice + 1}`}
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min="0"
                      disabled={indice > posiciones.length}
                      className="h-7 w-full min-w-9 rounded-md border border-line bg-white px-1 text-center text-[11px] font-bold text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/15 disabled:cursor-not-allowed disabled:bg-surface-3"
                      value={posiciones[indice] ?? ""}
                      onChange={(event) => cambiar(clave, indice, event.target.value)}
                    />
                  </td>
                ))}
                <td className="px-2 py-1.5 text-center font-extrabold text-ink">{posiciones.length}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Ollaos({
  modo, reparto, onChange,
}: {
  modo: "REPARTIDOS" | "SEGUN SE INDICA";
  reparto: RepartoOllaos;
  onChange: (reparto: RepartoOllaos) => void;
}) {
  return modo === "SEGUN SE INDICA"
    ? <EditorOllaos reparto={reparto} onChange={onChange} />
    : <TablaReparto reparto={reparto} />;
}

export function ResultadosLona({
  res, modoOllaos, onOllaosChange,
}: {
  res: LonaResult;
  modoOllaos: "REPARTIDOS" | "SEGUN SE INDICA";
  onOllaosChange: (reparto: RepartoOllaos) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Resumen columnas={7}>
        <Dato label="Lona hecha" valor={`${fmt(res.lonaHecha.largo)} × ${fmt(res.lonaHecha.ancho)}`} />
        <Dato label={`Contorno corte (+${fmt(res.ajusteContorno)})`} valor={res.contornoAjustado ? fmt(res.contornoAjustado) : "—"} />
        <Dato label="Paño delantero" valor={`${fmt(res.panoDelantero.ancho)} × ${fmt(res.panoDelantero.alto)}`} />
        <Dato label="Paño trasero" valor={`${fmt(res.panoTrasero.ancho)} × ${fmt(res.panoTrasero.alto)}`} />
        <Dato label="Paño contorno" valor={res.panoContorno ? `${fmt(res.panoContorno.ancho)} × ${fmt(res.panoContorno.alto)}` : "—"} />
        <Dato label="Recoge delante" valor={res.recogeDelanteTexto} />
        <Dato label="Recoge atrás" valor={res.recogeAtrasTexto} />
      </Resumen>
      <Ollaos modo={modoOllaos} reparto={res.reparto} onChange={onOllaosChange} />
      {res.notas.length > 0 && (
        <ul className="list-inside list-disc text-[11px] font-semibold text-gold-2">
          {res.notas.map((n) => <li key={n}>{n}</li>)}
        </ul>
      )}
    </div>
  );
}

export function ResultadosBaqueton({
  res, modoOllaos, onOllaosChange,
}: {
  res: BaquetonResult;
  modoOllaos: "REPARTIDOS" | "SEGUN SE INDICA";
  onOllaosChange: (reparto: RepartoOllaos) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Resumen columnas={6}>
        <Dato label="Paño único" valor={`${fmt(res.panoUnico.largo)} × ${fmt(res.panoUnico.ancho)}`} />
        <Dato label="Remolque hecho" valor={`${fmt(res.remolqueHecho.largo)} × ${fmt(res.remolqueHecho.ancho)}`} />
        <Dato label="Baquetón + costura" valor={fmt(res.baquetonCostura)} />
        <Dato label="Esquinas del./tras." valor={`${fmt(res.esquinaDelante)} / ${fmt(res.esquinaDetras)}`} />
        <Dato label="Baquetón" valor={res.baquetonTrasero ? `Trasero ${fmt(res.baquetonTrasero)}` : "EN LÍNEA"} />
        <Dato label="Superficie" valor={`${fmt(res.superficieM2)} m²/ud`} />
      </Resumen>
      <Ollaos modo={modoOllaos} reparto={res.reparto} onChange={onOllaosChange} />
      {res.notas.length > 0 && (
        <ul className="list-inside list-disc text-[11px] font-semibold text-gold-2">
          {res.notas.map((n) => <li key={n}>{n}</li>)}
        </ul>
      )}
    </div>
  );
}
