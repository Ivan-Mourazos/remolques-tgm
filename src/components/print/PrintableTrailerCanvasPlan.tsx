import { CrossSectionProfile } from "@/components/drawings/CrossSectionProfile";
import { profileNeedsCornerRadius } from "@/components/drawings/cross-section-paths";
import {
  formatBoolean,
  formatCm,
  formatDate,
  formatDimension,
} from "@/lib/format/number";
import { getProfileDefinition } from "@/lib/drawings/trailer-profile-types";
import { parseOllaoText, type OllaoRow } from "@/lib/print/parse-ollaos";
import type { AppSettings, LonaCalculationResult, LonaFormInput } from "@/lib/types";

function panoObsDelante(input: LonaFormInput): string {
  const parts: string[] = [];
  if (input.ventana) parts.push("Ventana");
  if (input.recogeDelante === "GOMA") parts.push("Orejas goma");
  return parts.length ? parts.join(" · ") : "—";
}

function panoObsTrasero(result: LonaCalculationResult): string {
  return result.tipoRecogidaAtras === "GOMA" ? "Orejas goma" : "—";
}

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

function ExcelHeader({ input }: { input: LonaFormInput }) {
  const labelClass = "border-r border-black bg-zinc-100 px-1 font-bold italic";
  const valueClass = "px-1 font-bold";

  return (
    <header className="grid grid-cols-[68px_1fr_160px] overflow-hidden rounded-sm border-2 border-slate-900 text-[8px] leading-tight shadow-[0_1px_0_rgba(15,23,42,0.18)]">
      <section className="row-span-3 border-r-2 border-slate-900 bg-amber-50">
        <LogoMark />
      </section>
      <section className="grid grid-cols-[90px_1fr] border-b border-slate-900">
        <span className={labelClass}>CLIENTE:</span>
        <span className={valueClass}>{input.cliente || "—"}</span>
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
    <p className="grid grid-cols-[31mm_1fr] gap-[3mm] leading-[1.2]">
      <span className="font-black uppercase text-slate-700 underline decoration-amber-500 decoration-[1.2px] underline-offset-2">
        {label}
      </span>
      <span className="font-bold uppercase text-slate-950">{value || "—"}</span>
    </p>
  );
}

function ExcelProfileDrawing({
  input,
  result,
}: {
  input: LonaFormInput;
  result: LonaCalculationResult;
}) {
  const tipoPerfil = input.tipoPerfil ?? "tipo-01";
  const radioEsquina =
    profileNeedsCornerRadius(tipoPerfil) && input.radioCurva > 0
      ? input.radioCurva
      : 10;

  return (
    <svg viewBox="0 0 360 210" className="h-[93mm] w-full" role="img" aria-label="Perfil remolque">
      <rect width="360" height="210" rx="4" fill="#f8fafc" />
      <rect x="8" y="8" width="344" height="194" rx="3" fill="#fff" stroke="#cbd5e1" />
      <CrossSectionProfile
        x={42}
        y={26}
        width={276}
        height={150}
        tipo={tipoPerfil}
        chaflanCm={input.chaflanCm}
        radioEsquinaCm={radioEsquina}
        anchoCm={input.anchoPedido}
        altoCm={Math.max(result.altoDelantero, result.altoTrasero)}
        stroke="#050505"
        strokeWidth={4}
        showChaflanLabel={tipoPerfil === "tipo-04"}
      />
      <text x="180" y="190" textAnchor="middle" fontSize="8" fontWeight="700" fill="#475569">
        PERFIL DEL REMOLQUE
      </text>
    </svg>
  );
}

function OllaosGrid({
  sections,
}: {
  sections: { title: string; rows: OllaoRow[] }[];
}) {
  const maxCols = 12;

  return (
    <table className="w-full table-fixed border-collapse overflow-hidden rounded-sm text-[7px] leading-tight shadow-[0_0_0_1px_#1f2937]">
      <thead>
        <tr>
          <th className="w-[82mm] border border-slate-800 bg-slate-800 px-1 text-left font-black text-white">
            REPARTIDOS
          </th>
          {Array.from({ length: maxCols }, (_, i) => (
            <th key={i} className="border border-slate-800 bg-slate-700 text-center font-black text-white">
              {i + 1}
            </th>
          ))}
          <th className="w-[12mm] border border-slate-800 bg-amber-400 text-center font-black text-slate-950">TOTAL</th>
        </tr>
      </thead>
      <tbody>
        {sections.map((section, sectionIndex) => {
          const values = section.rows.map((row) =>
            row.detalle === row.posicion ? row.detalle : `${row.posicion} ${row.detalle}`,
          );
          return (
            <tr key={section.title} className={sectionIndex % 2 === 0 ? "bg-white" : "bg-slate-50"}>
              <td className="border border-slate-800 bg-blue-50 px-1 font-black uppercase text-slate-900">{section.title}</td>
              {Array.from({ length: maxCols }, (_, i) => (
                <td key={i} className="border border-slate-800 px-0.5 text-center font-bold text-slate-950">
                  {values[i] ?? ""}
                </td>
              ))}
              <td className="border border-slate-800 bg-amber-50 text-center font-black text-slate-950">
                {values.length || ""}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function PrintableTrailerCanvasPlan({
  input,
  result,
  settings,
}: {
  input: LonaFormInput;
  result: LonaCalculationResult;
  settings: AppSettings;
}) {
  const tipoPerfil = input.tipoPerfil ?? "tipo-01";
  const profileDef = getProfileDefinition(tipoPerfil);
  const latRows = parseOllaoText(result.ollaos.laterales);
  const atrRows = parseOllaoText(result.ollaos.atras);
  const delRows = parseOllaoText(result.ollaos.delante);
  const panoContorno = result.panos.contorno
    ? `1 PAÑO DE ${formatDimension(result.panos.contorno.ancho, result.panos.contorno.largo)}`
    : null;
  const recogeAtras =
    result.tipoRecogidaAtras === "GOMA"
      ? "RECOGE ATRÁS CON GOMA"
      : result.tipoRecogidaAtras;

  return (
    <section className="workshop-plan print-break-avoid flex flex-col rounded-sm border-2 border-slate-900 bg-white p-[4mm] text-slate-950 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.10)]">
      <ExcelHeader input={input} />
      <section className="mt-[5mm] grid flex-1 grid-cols-[78mm_1fr_34mm] gap-[6mm] text-[8px] leading-tight">
        <section className="space-y-[1.2mm] rounded-sm border border-slate-200 bg-slate-50/70 p-[2mm]">
          <div className="grid grid-cols-[31mm_1fr] gap-[3mm]">
            <span className="font-black uppercase text-slate-700 underline decoration-amber-500 decoration-[1.2px] underline-offset-2">
              PAÑOS A CORTAR:
            </span>
            <span className="space-y-0.5 font-black uppercase text-slate-950">
              <span className="block">
                1 PAÑO DE {formatDimension(result.panos.delantero.ancho, result.panos.delantero.alto)}
                {panoObsDelante(input) !== "—" ? ` · ${panoObsDelante(input)}` : ""}
              </span>
              <span className="block">
                1 PAÑO DE {formatDimension(result.panos.trasero.ancho, result.panos.trasero.alto)}
                {panoObsTrasero(result) !== "—" ? ` · ${panoObsTrasero(result)}` : ""}
              </span>
              {panoContorno && <span className="block">{panoContorno}</span>}
            </span>
          </div>
          <DataLine
            label="Medida lona hecha"
            value={formatDimension(result.medidaLonaHecha.largo, result.medidaLonaHecha.ancho)}
          />
          <DataLine
            label="Alto"
            value={
              result.altoDelantero === result.altoTrasero
                ? formatCm(result.altoDelantero)
                : `${formatCm(result.altoDelantero)} / ${formatCm(result.altoTrasero)}`
            }
          />
          <DataLine
            label={result.contornoOrigen === "manual" ? "Contorno manual" : "Contorno calculado"}
            value={result.contornoAjustado > 0 ? `${formatCm(result.contornoAjustado)} cm` : result.contornoAviso ?? "—"}
          />
          <DataLine label="Arco" value={input.cliente || "—"} />
          <DataLine label="Recoge delante" value={result.tipoRecogidaDelante} />
          <DataLine label="Recoge atrás" value={recogeAtras} />
          <DataLine label="Ventana" value={formatBoolean(result.ventana)} />
          <DataLine label="Rotulación" value={formatBoolean(input.rotulacion)} />
          <DataLine
            label="Ollaos"
            value={latRows.length || atrRows.length || delRows.length ? "SEGÚN SE INDICA" : "SIN INDICAR"}
          />
          <DataLine label="Material" value={result.material} />
          <DataLine label="Perfil" value={`${profileDef.label} ${profileDef.shortLabel}`} />
          {input.tieneCurva && (
            <DataLine
              label="Curva"
              value={`Contorno CAD + curva · Radio ${formatCm(input.radioCurva)}`}
            />
          )}
        </section>

        <section className="flex items-center justify-center">
          <ExcelProfileDrawing input={input} result={result} />
        </section>

        <section className="rounded-sm border border-slate-200 bg-amber-50/80 p-[2mm] pt-[10mm] text-right font-bold">
          <span className="font-black italic text-slate-700">FECHA SALIDA:</span>
          <span className="ml-1 inline-block min-w-[22mm] border-b-2 border-amber-500 text-slate-950">
            {formatDate(input.fechaSalida)}
          </span>
          <p className="mt-[18mm] text-left text-[7px] font-bold uppercase leading-snug text-slate-800">
            {settings.lonaParams.medidaOrejaGoma && result.notasAutomaticas.join(" · ")}
          </p>
        </section>
      </section>

      <section className="mt-[4mm]">
        <OllaosGrid
          sections={[
            { title: "Ollaos laterales de atrás a adelante", rows: latRows },
            { title: "Ollaos atrás de izquierda a derecha", rows: atrRows },
            { title: "Ollaos delante de izquierda a derecha", rows: delRows },
          ]}
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
