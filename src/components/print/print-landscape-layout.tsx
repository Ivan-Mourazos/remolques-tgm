import { PrintTable } from "@/components/print/print-shared";
import { formatDate } from "@/lib/format/number";

export function CompactOrderHeader({
  fields,
  title,
}: {
  title: string;
  fields: {
    numeroPedido: string;
    cliente: string;
    of?: string;
    revision: string;
    realizadoPor: string;
    fechaSalida: string;
    material: string;
    cantidad: number;
  };
}) {
  const cells = [
    { label: "Nº pedido", value: fields.numeroPedido || "—" },
    { label: "Cliente", value: fields.cliente || "—" },
    { label: "O.F.", value: fields.of || "—" },
    { label: "Revisión", value: fields.revision || "—" },
    { label: "Realizado por", value: fields.realizadoPor || "—" },
    { label: "Fecha salida", value: formatDate(fields.fechaSalida) },
    { label: "Material", value: fields.material || "—" },
    { label: "Cantidad", value: String(fields.cantidad) },
  ];

  return (
    <header className="print-break-avoid border-b-2 border-black pb-2">
      <p className="mb-1 flex items-baseline justify-between text-[10px]">
        <span className="font-bold uppercase tracking-widest text-black/50">
          Remolques TGM
        </span>
        <span className="text-xs font-bold text-black">{title}</span>
      </p>
      <table className="w-full border-collapse text-[10px] text-black">
        <tbody>
          <tr>
            {cells.map((c) => (
              <td key={c.label} className="border border-black/15 px-2 py-1 align-top">
                <span className="block text-[8px] font-semibold uppercase text-black/55">
                  {c.label}
                </span>
                <span className="font-bold">{c.value}</span>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </header>
  );
}

export function LandscapePlanLayout({
  header,
  drawing,
  sidebar,
  footer,
}: {
  header: React.ReactNode;
  drawing: React.ReactNode;
  sidebar: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <section className="landscape-plan-layout flex flex-col gap-2 text-black">
      {header}
      <section className="print-break-avoid grid grid-cols-[minmax(0,65%)_minmax(0,35%)] gap-3">
        <section className="min-h-[180px] rounded border border-black/10 bg-white p-1">
          {drawing}
        </section>
        <section className="space-y-2 text-[10px]">{sidebar}</section>
      </section>
      <section className="print-break-avoid space-y-2 border-t border-black/15 pt-2 text-[10px]">
        {footer}
      </section>
    </section>
  );
}

export function SidebarBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="print-break-avoid">
      <h3 className="mb-1 border-b border-black/20 text-[9px] font-bold uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function CompactPanoTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <section className="compact-pano-table text-[9px]">
      <PrintTable headers={headers} rows={rows} />
    </section>
  );
}

export function CompactOllaoTables({
  sections,
}: {
  sections: { title: string; rows: string[][] }[];
}) {
  return (
    <section className="grid grid-cols-3 gap-2">
      {sections.map((s) => (
        <section key={s.title} className="print-break-avoid">
          <h4 className="mb-0.5 text-[8px] font-bold uppercase">{s.title}</h4>
          {s.rows.length === 0 ? (
            <p className="text-[9px] italic text-black/50">Sin indicar</p>
          ) : (
            <table className="w-full border-collapse text-[8px]">
              <tbody>
                {s.rows.map((row, i) => (
                  <tr key={i} className="border-b border-black/10">
                    <td className="py-0.5 pr-1">{row[0]}</td>
                    <td className="py-0.5">{row[1]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ))}
    </section>
  );
}
