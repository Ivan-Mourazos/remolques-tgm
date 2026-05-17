import { BaquetonTechnicalDrawing } from "@/components/drawings/BaquetonTechnicalDrawing";
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
  formatM2,
} from "@/lib/format/number";
import { parseOllaoText } from "@/lib/print/parse-ollaos";
import type {
  AppSettings,
  BaquetonCalculationResult,
  BaquetonFormInput,
} from "@/lib/types";

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
  const obs =
    input.cantidad > 1
      ? `Superficie total ${formatM2(superficieTotal)} m²`
      : `Superficie ${formatM2(result.superficieM2)} m²`;

  const panoRows = [
    [
      "PAÑO ÚNICO",
      "1",
      formatDimension(result.panoUnico.largo, result.panoUnico.ancho),
      obs,
    ],
  ];

  const ollaoRows = parseOllaoText(input.ollaosManuales).map((r) => [
    r.posicion,
    r.detalle,
  ]);

  const mainData = [
    [
      "Remolque hecho",
      formatDimension(
        result.medidasRemolqueHecho.largo,
        result.medidasRemolqueHecho.ancho,
      ),
    ],
    ["Baquetón", formatCm(input.baqueton)],
    ["Baquetón costura", formatCm(result.baquetonCostura)],
    ["Perfil", profile?.nombre ?? "—"],
    ["Tipo ollaos", input.tipoOllaos || "—"],
    ["Rotulación", formatBoolean(input.rotulacion)],
  ];

  return (
    <LandscapePlanLayout
      header={
        <CompactOrderHeader
          title="Baquetón"
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
      drawing={<BaquetonTechnicalDrawing input={input} result={result} />}
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
              sections={[{ title: "Ollaos manuales", rows: ollaoRows }]}
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
