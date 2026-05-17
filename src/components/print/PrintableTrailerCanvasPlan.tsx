import { TrailerCanvasTechnicalDrawing } from "@/components/drawings/TrailerCanvasTechnicalDrawing";
import {
  CompactOllaoTables,
  CompactOrderHeader,
  CompactPanoTable,
  LandscapePlanLayout,
  SidebarBlock,
} from "@/components/print/print-landscape-layout";
import {
  formatBoolean,
  formatCm,
  formatDimension,
} from "@/lib/format/number";
import { getProfileDefinition } from "@/lib/drawings/trailer-profile-types";
import { parseOllaoText } from "@/lib/print/parse-ollaos";
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

export function PrintableTrailerCanvasPlan({
  input,
  result,
  settings,
}: {
  input: LonaFormInput;
  result: LonaCalculationResult;
  settings: AppSettings;
}) {
  const panoRows: string[][] = [];
  if (result.panos.contorno) {
    panoRows.push([
      "PAÑO CONTORNO",
      "1",
      formatDimension(result.panos.contorno.ancho, result.panos.contorno.largo),
      input.tieneCurva ? `Curva R ${formatCm(input.radioCurva)}` : "—",
    ]);
  }
  panoRows.push(
    [
      "PAÑO DELANTERO",
      "1",
      formatDimension(result.panos.delantero.ancho, result.panos.delantero.alto),
      panoObsDelante(input),
    ],
    [
      "PAÑO TRASERO",
      "1",
      formatDimension(result.panos.trasero.ancho, result.panos.trasero.alto),
      panoObsTrasero(result),
    ],
  );

  const latRows = parseOllaoText(result.ollaos.laterales).map((r) => [
    r.posicion,
    r.detalle,
  ]);
  const atrRows = parseOllaoText(result.ollaos.atras).map((r) => [
    r.posicion,
    r.detalle,
  ]);
  const delRows = parseOllaoText(result.ollaos.delante).map((r) => [
    r.posicion,
    r.detalle,
  ]);

  const tipoPerfil = input.tipoPerfil ?? "tipo-01";
  const profileDef = getProfileDefinition(tipoPerfil);

  const mainData = [
    ["Tipo perfil", `${profileDef.label} — ${profileDef.shortLabel}`],
    ["Lona hecha", formatDimension(result.medidaLonaHecha.largo, result.medidaLonaHecha.ancho)],
    ["Altos", `${formatCm(result.altoDelantero)} / ${formatCm(result.altoTrasero)}`],
    ["Contorno CAD", formatCm(result.contornoCad)],
    ["Contorno ajust.", formatCm(result.contornoAjustado)],
    ["Curva", formatBoolean(input.tieneCurva)],
    ["Recoge", `${result.tipoRecogidaDelante} / ${result.tipoRecogidaAtras}`],
    ["Bastilla", input.bastilla],
  ];

  return (
    <LandscapePlanLayout
      header={
        <CompactOrderHeader
          title="Lona remolque alto"
          fields={{
            numeroPedido: input.numeroPedido,
            cliente: input.cliente,
            revision: input.revision,
            realizadoPor: input.realizadoPor,
            fechaSalida: input.fechaSalida,
            material: input.material,
            cantidad: input.cantidad,
          }}
        />
      }
      drawing={
        <TrailerCanvasTechnicalDrawing
          input={input}
          result={result}
          settings={settings}
        />
      }
      sidebar={
        <>
          <SidebarBlock title="Datos principales">
            <table className="w-full text-[9px]">
              <tbody>
                {mainData.map(([k, v]) => (
                  <tr key={k} className="border-b border-black/10">
                    <th className="py-0.5 pr-2 text-left font-medium text-black/60">{k}</th>
                    <td className="py-0.5 font-semibold">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SidebarBlock>
          <SidebarBlock title="Paños a cortar">
            <CompactPanoTable
              headers={["Pieza", "Cant.", "Medida (cm)", "Obs."]}
              rows={panoRows}
            />
          </SidebarBlock>
          {result.notasAutomaticas.length > 0 && (
            <SidebarBlock title="Notas automáticas">
              <ul className="list-disc space-y-0.5 pl-3 text-[8px]">
                {result.notasAutomaticas.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </SidebarBlock>
          )}
        </>
      }
      footer={
        <>
          <section className="print-break-avoid">
            <h3 className="mb-1 text-[9px] font-bold uppercase">Ollaos</h3>
            <CompactOllaoTables
              sections={[
                { title: "Laterales (atrás → adelante)", rows: latRows },
                { title: "Atrás (izq. → der.)", rows: atrRows },
                { title: "Delante (izq. → der.)", rows: delRows },
              ]}
            />
          </section>
          <section className="print-break-avoid">
            <h3 className="mb-0.5 text-[9px] font-bold uppercase">Observaciones</h3>
            <p className="whitespace-pre-wrap text-[9px]">
              {result.observaciones.trim() || "—"}
            </p>
          </section>
        </>
      }
    />
  );
}
