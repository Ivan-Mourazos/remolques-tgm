import { FieldWarn } from "@/components/ui/FieldWarn";
import { inputClass, selectClass } from "@/components/ui/FormField";

export const excelInputClass = `${inputClass} border-slate-200 bg-white py-1 shadow-none`;
export const excelSelectClass = `${selectClass} border-slate-200 bg-white py-1 shadow-none`;
export const excelReadonlyClass = `${excelInputClass} bg-slate-50 text-slate-800`;

type RowTone = "pedido" | "medida" | "tecnico" | "calculo" | "material";

const toneClass: Record<RowTone, string> = {
  pedido: "bg-orange-50",
  medida: "bg-orange-50",
  tecnico: "bg-orange-50",
  calculo: "bg-white",
  material: "bg-amber-100",
};

export function FormExcelSection({ title }: { title?: string }) {
  if (!title) return null;
  return (
    <p className="mt-2 border-b border-slate-300 pb-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
      {title}
    </p>
  );
}

export function FormExcelRow({
  label,
  children,
  tone = "pedido",
  warn,
}: {
  label: string;
  children: React.ReactNode;
  tone?: RowTone;
  warn?: string;
}) {
  return (
    <div
      className={`grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] items-center gap-1 border-b border-slate-200/80 text-[11px] ${toneClass[tone]}`}
    >
      <span className="px-1.5 py-1 font-semibold uppercase leading-tight text-slate-700">
        {label}
      </span>
      <div className="flex min-w-0 items-center gap-0.5 px-1 py-0.5">
        <div className="min-w-0 flex-1">{children}</div>
        <FieldWarn message={warn} />
      </div>
    </div>
  );
}

export function SiNoSelect({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <select
      className={excelSelectClass}
      value={value ? "si" : "no"}
      onChange={(e) => onChange(e.target.value === "si")}
    >
      <option value="no">NO</option>
      <option value="si">SÍ</option>
    </select>
  );
}
