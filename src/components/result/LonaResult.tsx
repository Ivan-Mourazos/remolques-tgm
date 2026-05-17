import type { LonaCalculationResult, LonaFormInput } from "@/lib/types";

function fmt(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");
}

export function LonaResult({
  input,
  result,
}: {
  input: LonaFormInput;
  result: LonaCalculationResult;
}) {
  return (
    <article className="print-area rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-6 border-b border-slate-200 pb-4">
        <h2 className="text-xl font-bold text-slate-900">
          Planteamiento — Lona remolque alto
        </h2>
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
            label="Medida lona hecha"
            value={`${fmt(result.medidaLonaHecha.largo)} × ${fmt(result.medidaLonaHecha.ancho)}`}
          />
          <Row label="Alto delantero" value={fmt(result.altoDelantero)} />
          <Row label="Alto trasero" value={fmt(result.altoTrasero)} />
          <Row
            label="Paño delantero"
            value={`${fmt(result.panos.delantero.ancho)} × ${fmt(result.panos.delantero.alto)}`}
          />
          <Row
            label="Paño trasero"
            value={`${fmt(result.panos.trasero.ancho)} × ${fmt(result.panos.trasero.alto)}`}
          />
          {result.panos.contorno && (
            <Row
              label="Paño contorno"
              value={`${fmt(result.panos.contorno.ancho)} × ${fmt(result.panos.contorno.largo)}`}
            />
          )}
          <Row label="Recogida delante" value={result.tipoRecogidaDelante} />
          <Row label="Recogida atrás" value={result.tipoRecogidaAtras} />
          <Row label="Ventana" value={result.ventana ? "Sí" : "No"} />
          <Row label="Material" value={result.material || "—"} />
          <Row label="Ollaos laterales" value={result.ollaos.laterales || "—"} />
          <Row label="Ollaos delante" value={result.ollaos.delante || "—"} />
          <Row label="Ollaos atrás" value={result.ollaos.atras || "—"} />
          <Row label="Observaciones" value={result.observaciones || "—"} />
        </tbody>
      </table>

      {result.notasAutomaticas.length > 0 && (
        <section className="mt-6">
          <h3 className="mb-2 text-sm font-semibold uppercase text-slate-500">
            Notas automáticas
          </h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            {result.notasAutomaticas.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>
      )}
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
