import {
  formatBoolean,
  formatCm,
  formatDate,
  formatDimension,
  formatM2,
} from "@/lib/format/number";
import { OllaosRepartoGrid } from "@/components/ollaos/OllaosRepartoGrid";
import { parseOllaoText } from "@/lib/print/parse-ollaos";
import type {
  AppSettings,
  BaquetonCalculationResult,
  BaquetonFormInput,
} from "@/lib/types";

function LogoMark() {
  return (
    <div className="flex h-full min-h-[18mm] flex-col items-center justify-center bg-white">
      <div className="text-[24px] font-black italic leading-none text-amber-500">
        TGM
      </div>
      <div className="mt-0.5 text-[6.5px] font-black uppercase tracking-tight text-slate-700">
        Toldos Gómez
      </div>
    </div>
  );
}

function BaquetonHeader({ input }: { input: BaquetonFormInput }) {
  const labelClass = "border-r border-black bg-zinc-100 px-1 font-bold italic";
  const valueClass = "px-1 font-bold";

  return (
    <header className="grid grid-cols-[68px_1fr_160px] overflow-hidden rounded-sm border-2 border-slate-900 text-[8px] leading-tight shadow-[0_1px_0_rgba(15,23,42,0.18)]">
      <section className="row-span-3 border-r-2 border-slate-900 bg-amber-50">
        <LogoMark />
      </section>
      <section className="grid grid-cols-[90px_1fr] border-b border-slate-900">
        <span className={labelClass}>CLIENTE:</span>
        <span className={valueClass}>
          {input.cliente || "—"}
          {input.clienteEspecifico ? ` · ${input.clienteEspecifico}` : ""}
        </span>
      </section>
      <section className="grid grid-cols-[70px_1fr] border-b border-slate-900">
        <span className={labelClass}>Nº PEDIDO:</span>
        <span className={`${valueClass} text-right`}>{input.numeroPedido || "—"}</span>
      </section>
      <section className="grid grid-cols-[90px_1fr] border-b border-slate-900">
        <span className={labelClass}>REVISIÓN:</span>
        <span className={valueClass}>{input.revision || "—"}</span>
      </section>
      <section className="grid grid-cols-[70px_1fr] border-b border-slate-900">
        <span className={labelClass}>O.F.:</span>
        <span className={`${valueClass} text-right`}>{input.ordenFabricacion || "—"}</span>
      </section>
      <section className="grid grid-cols-[90px_1fr]">
        <span className={labelClass}>REALIZADO</span>
        <span className={valueClass}>{input.realizadoPor || "—"}</span>
      </section>
      <section className="grid grid-cols-[1fr_70px]">
        <span className={`${valueClass} text-right`}>{input.numeroPedido || "—"}</span>
        <span className={`${valueClass} border-l border-slate-900 text-right`}>
          {formatDate(input.fechaSalida)}
        </span>
      </section>
      <section className="col-span-2 border-t-2 border-slate-900 bg-slate-900 py-[3mm] text-center text-[9px] font-black tracking-[0.24em] text-white">
        REMOLQUES
      </section>
    </header>
  );
}

function DataLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="grid grid-cols-[32mm_1fr] gap-[3mm] leading-[1.2]">
      <span className="font-black uppercase text-slate-700 underline decoration-amber-500 decoration-[1.2px] underline-offset-2">
        {label}
      </span>
      <span className="font-bold uppercase text-slate-950">{value || "—"}</span>
    </p>
  );
}

function BaquetonShape({
  result,
}: {
  result: BaquetonCalculationResult;
}) {
  const x = 42;
  const y = 36;
  const w = 420;
  const h = 236;
  const notchW = 44;
  const notchH = 32;
  const d = [
    `M ${x + notchW} ${y}`,
    `L ${x + w - notchW} ${y}`,
    `L ${x + w - notchW} ${y + notchH}`,
    `L ${x + w} ${y + notchH}`,
    `L ${x + w} ${y + h - notchH}`,
    `L ${x + w - notchW} ${y + h - notchH}`,
    `L ${x + w - notchW} ${y + h}`,
    `L ${x + notchW} ${y + h}`,
    `L ${x + notchW} ${y + h - notchH}`,
    `L ${x} ${y + h - notchH}`,
    `L ${x} ${y + notchH}`,
    `L ${x + notchW} ${y + notchH}`,
    "Z",
  ].join(" ");

  return (
    <svg viewBox="0 0 560 330" className="h-full min-h-[118mm] w-full" role="img" aria-label="Dibujo baquetón">
      <rect width="560" height="330" rx="4" fill="#f8fafc" />
      <rect x="8" y="8" width="544" height="314" rx="3" fill="#fff" stroke="#cbd5e1" />
      <path d={d} fill="#f3f4f6" stroke="#111827" strokeWidth="1.5" />
      <line x1={x + notchW} y1={y - 22} x2={x + w - notchW} y2={y - 22} stroke="#111827" strokeWidth="1.2" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
      <line x1={x + w + 34} y1={y + notchH} x2={x + w + 34} y2={y + h - notchH} stroke="#111827" strokeWidth="1.2" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M 0 0 L 8 4 L 0 8 z" fill="#111827" />
        </marker>
      </defs>
      <text x={x + w / 2} y={y - 29} textAnchor="middle" fontSize="10" fontWeight="800" fill="#111827">
        {formatCm(result.panoUnico.largo)}
      </text>
      <text x={x + w + 48} y={y + h / 2} textAnchor="middle" fontSize="10" fontWeight="800" fill="#111827" transform={`rotate(-90 ${x + w + 48} ${y + h / 2})`}>
        PARTE DELANTERA · {formatCm(result.panoUnico.ancho)}
      </text>
      {[0, 1].map((i) => (
        <g key={i}>
          <text x={x + 24 + i * (w - 48)} y={y - 4} textAnchor="middle" fontSize="9" fontWeight="800"> {formatCm(result.baquetonCostura)} </text>
          <text x={x - 18 + i * (w + 36)} y={y + 24} textAnchor="middle" fontSize="9" fontWeight="800" transform={`rotate(-90 ${x - 18 + i * (w + 36)} ${y + 24})`}>{formatCm(result.baquetonCostura)}</text>
          <text x={x + 24 + i * (w - 48)} y={y + h + 16} textAnchor="middle" fontSize="9" fontWeight="800">{formatCm(result.baquetonCostura)}</text>
          <text x={x - 18 + i * (w + 36)} y={y + h - 24} textAnchor="middle" fontSize="9" fontWeight="800" transform={`rotate(-90 ${x - 18 + i * (w + 36)} ${y + h - 24})`}>{formatCm(result.baquetonCostura)}</text>
        </g>
      ))}
      <text x={x + w / 2} y={306} textAnchor="middle" fontSize="8" fontWeight="700" fill="#475569">
        PAÑO ÚNICO BAQUETÓN · REMOLQUE HECHO {formatDimension(result.medidasRemolqueHecho.largo, result.medidasRemolqueHecho.ancho)}
      </text>
    </svg>
  );
}

export function PrintableBaquetonPlan({
  input,
  result,
  settings,
}: {
  input: BaquetonFormInput;
  result: BaquetonCalculationResult;
  settings: AppSettings;
}) {
  const profile =
    settings.baquetonProfiles.find((p) => p.id === input.perfilCalculoId) ??
    settings.baquetonProfiles[0];
  const superficieTotal = result.superficieM2 * input.cantidad;
  const latRows = parseOllaoText(input.ollaosLaterales);
  const atrRows = parseOllaoText(input.ollaosAtras);
  const delRows = parseOllaoText(input.ollaosDelante);
  const ollaoHeader =
    input.colocacionOllaos === "a-la-medida" ? "A LA MEDIDA" : "REPARTIDOS";

  return (
    <section className="workshop-plan print-break-avoid flex min-h-[194mm] flex-1 flex-col rounded-sm border-2 border-slate-900 bg-white p-[4mm] text-slate-950 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.10)]">
      <BaquetonHeader input={input} />
      <section className="mt-[3mm] grid min-h-0 flex-1 grid-cols-[minmax(70mm,24%)_minmax(0,1fr)_minmax(26mm,11%)] items-stretch gap-[3mm] text-[8px] leading-tight">
        <section className="flex flex-col justify-between gap-[0.8mm] rounded-sm border border-slate-200 bg-slate-50/70 p-[2mm]">
          <div className="space-y-[0.8mm]">
            <DataLine
              label="Paños a cortar"
              value={`1 PAÑO DE ${formatDimension(result.panoUnico.largo, result.panoUnico.ancho)}`}
            />
            <DataLine label="Material" value={input.material} />
            <DataLine
              label="Ollaos"
              value={
                latRows.length || atrRows.length || delRows.length
                  ? "SEGÚN SE INDICA"
                  : input.colocacionOllaos === "a-la-medida"
                    ? "A LA MEDIDA"
                    : "REPARTIDOS"
              }
            />
            <DataLine label="Rotulación" value={formatBoolean(input.rotulacion)} />
            <DataLine
              label="Superficie de tele"
              value={
                input.cantidad > 1
                  ? `${formatM2(superficieTotal)} m² total`
                  : `${formatM2(result.superficieM2)} m² / unidad`
              }
            />
          </div>
          <div className="space-y-[0.8mm] border-t border-slate-200 pt-[1mm]">
            <DataLine label="Largo hecho" value={formatCm(result.medidasRemolqueHecho.largo)} />
            <DataLine label="Ancho hecho" value={formatCm(result.medidasRemolqueHecho.ancho)} />
            <DataLine label="Baquetón" value={`${formatCm(input.baqueton)} EN LÍNEA`} />
            <DataLine label="Baquetón costura" value={formatCm(result.baquetonCostura)} />
            <DataLine label="Perfil" value={profile?.nombre ?? "—"} />
          </div>
        </section>

        <section className="flex min-h-0 items-stretch justify-center">
          <BaquetonShape result={result} />
        </section>

        <section className="flex flex-col justify-between rounded-sm border border-slate-200 bg-amber-50/80 p-[2mm] text-right font-bold">
          <div>
            <span className="font-black italic text-slate-700">FECHA SALIDA:</span>
            <span className="ml-1 inline-block min-w-[18mm] border-b-2 border-amber-500 text-slate-950">
              {formatDate(input.fechaSalida)}
            </span>
          </div>
          {result.notasAutomaticas.length > 0 && (
            <p className="text-left text-[7px] font-bold uppercase leading-snug text-slate-800">
              {result.notasAutomaticas.join(" · ")}
            </p>
          )}
        </section>
      </section>

      <section className="mt-auto hidden pt-[3mm] print:block">
        <OllaosRepartoGrid
          laterales={input.ollaosLaterales}
          atras={input.ollaosAtras}
          delante={input.ollaosDelante}
          headerLabel={ollaoHeader}
        />
      </section>

      {result.observaciones.trim() && (
        <section className="mt-[2mm] grid grid-cols-[31mm_1fr] gap-[3mm] rounded-sm bg-slate-50 px-[2mm] py-[1.5mm] text-[8px]">
          <span className="font-black uppercase text-slate-700 underline decoration-amber-500 decoration-[1.2px] underline-offset-2">Observaciones</span>
          <span className="whitespace-pre-wrap font-bold text-slate-950">{result.observaciones}</span>
        </section>
      )}
    </section>
  );
}
