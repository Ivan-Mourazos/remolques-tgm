import type { BaquetonCalculationResult, BaquetonFormInput } from "@/lib/types";

function fmt(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");
}

export function BaquetonResult({
  input,
  result,
}: {
  input: BaquetonFormInput;
  result: BaquetonCalculationResult;
}) {
  return (
    <article className="print-area rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-6 border-b border-slate-200 pb-4">
        <h2 className="text-xl font-bold text-slate-900">Planteamiento — Baquetón</h2>
        <p className="mt-1 text-sm text-slate-600">
          Pedido {input.numeroPedido || "—"} · {input.cliente || "—"} · Rev.{" "}
          {input.revision || "—"}
        </p>
        <p className="text-sm text-slate-600">
          {input.realizadoPor || "—"} · Salida {input.fechaSalida || "—"} · Cant.{" "}
          {input.cantidad}
        </p>
      </header>

      <table className="w-full text-sm">
        <tbody>
          <Row
            label="Medidas remolque hecho"
            value={`${fmt(result.medidasRemolqueHecho.largo)} × ${fmt(result.medidasRemolqueHecho.ancho)}`}
          />
          <Row label="Baquetón costura" value={fmt(result.baquetonCostura)} />
          <Row
            label="Paño único"
            value={`${fmt(result.panoUnico.largo)} × ${fmt(result.panoUnico.ancho)}`}
          />
          <Row
            label="Superficie"
            value={`${result.superficieM2.toFixed(4).replace(".", ",")} m²`}
          />
          <Row label="Material" value={result.material || "—"} />
          <Row label="Ollaos" value={result.ollaos || "—"} />
          <Row label="Observaciones" value={result.observaciones || "—"} />
        </tbody>
      </table>
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-slate-100">
      <th className="py-2 pr-4 text-left font-medium text-slate-600">{label}</th>
      <td className="py-2 font-semibold text-slate-900">{value}</td>
    </tr>
  );
}
