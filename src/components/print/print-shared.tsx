import type { ValidationIssue } from "@/lib/validation/planteamiento";
import type { OllaoRow } from "@/lib/print/parse-ollaos";

export function PrintWarnings({ issues }: { issues: ValidationIssue[] }) {
  if (issues.length === 0) return null;
  return (
    <ul className="print-break-avoid mb-4 list-none rounded border border-amber-400 bg-amber-50 p-3 text-sm text-amber-950">
      {issues.map((issue) => (
        <li key={issue.message} className="flex gap-2 py-0.5">
          <span className="font-bold">⚠</span>
          <span>{issue.message}</span>
        </li>
      ))}
    </ul>
  );
}

export function PrintSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="print-break-avoid mb-5">
      <h3 className="mb-2 border-b border-black/20 pb-1 text-xs font-bold uppercase tracking-wide text-black">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function PrintDataGrid({
  rows,
}: {
  rows: { label: string; value: string }[];
}) {
  return (
    <table className="w-full border-collapse text-sm text-black">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="border-b border-black/10">
            <th className="w-[42%] py-1.5 pr-3 text-left font-medium text-black/70">
              {row.label}
            </th>
            <td className="py-1.5 font-semibold">{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function PrintTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <table className="w-full border-collapse text-sm text-black">
      <thead>
        <tr className="border-b-2 border-black">
          {headers.map((h) => (
            <th
              key={h}
              className="px-2 py-2 text-left text-xs font-bold uppercase"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-black/15">
            {row.map((cell, j) => (
              <td key={j} className="px-2 py-2 align-top">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function OllaoBlock({
  title,
  rows,
}: {
  title: string;
  rows: OllaoRow[];
}) {
  return (
    <div className="print-break-avoid mb-4">
      <h4 className="mb-1 text-sm font-bold text-black">{title}</h4>
      {rows.length === 0 ? (
        <p className="text-sm italic text-black/60">Sin indicar</p>
      ) : (
        <PrintTable
          headers={["Pos.", "Detalle"]}
          rows={rows.map((r) => [r.posicion, r.detalle])}
        />
      )}
    </div>
  );
}

export function PrintHeaderMeta({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="print-break-avoid mb-6 border-b-2 border-black pb-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-black/50">
        Remolques TGM — Planteamiento
      </p>
      <h1 className="mt-1 text-2xl font-bold text-black">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-black/70">{subtitle}</p>}
    </header>
  );
}
