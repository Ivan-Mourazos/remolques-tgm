import { FieldWarn } from "@/components/ui/FieldWarn";

export function FormField({
  label,
  children,
  className = "",
  compact = false,
  warn,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
  warn?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span
        className={`mb-0.5 block font-medium text-slate-600 ${
          compact ? "text-xs" : "text-sm text-slate-700"
        }`}
      >
        {label}
      </span>
      <div className="flex items-center gap-0.5">
        <div className="min-w-0 flex-1">{children}</div>
        <FieldWarn message={warn} />
      </div>
    </label>
  );
}
export const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

export const selectClass = inputClass;

export const textareaClass =
  "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";
