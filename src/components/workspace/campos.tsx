"use client";
import { useId, type ReactNode } from "react";
import type { Material } from "@/lib/calc/materiales-seed";

const control = "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[15px] font-medium text-slate-900 shadow-[0_1px_2px_rgb(15_23_42/0.04)] transition-[border-color,box-shadow,background-color] hover:border-slate-300 focus-visible:border-amber-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/10";

export function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-2xl border border-slate-200/90 bg-white/85 p-4 shadow-[0_8px_24px_rgb(15_23_42/0.035)] backdrop-blur-sm">
      <legend className="px-1.5 text-xs font-extrabold uppercase tracking-[0.1em] text-slate-500">{titulo}</legend>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </fieldset>
  );
}

export function CampoNum(props: {
  label: string; value: number; onChange: (v: number) => void; ancho?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-1.5 text-[13px] ${props.ancho ? "col-span-2" : ""}`}>
      <span className="font-semibold text-slate-600">{props.label}</span>
      <input
        type="number" inputMode="decimal" step="0.1"
        className={`${control} tabular-nums`}
        value={props.value === 0 ? "" : props.value}
        onChange={(e) => props.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      />
    </label>
  );
}

export function CampoTexto(props: {
  label: string; value: string; onChange: (v: string) => void; ancho?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-1.5 text-[13px] ${props.ancho ? "col-span-2" : ""}`}>
      <span className="font-semibold text-slate-600">{props.label}</span>
      <input
        className={control}
        value={props.value} onChange={(e) => props.onChange(e.target.value)}
      />
    </label>
  );
}

export function CampoSelect(props: {
  label: string; value: string; opciones: string[]; onChange: (v: string) => void; ancho?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-1.5 text-[13px] ${props.ancho ? "col-span-2" : ""}`}>
      <span className="font-semibold text-slate-600">{props.label}</span>
      <select
        className={control}
        value={props.value} onChange={(e) => props.onChange(e.target.value)}
      >
        {props.opciones.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

export function CampoMaterial(props: {
  value: string; opciones: Material[]; onChange: (v: string) => void;
}) {
  const listId = useId();
  const material = props.opciones.find((opcion) => opcion.nombre === props.value);
  return (
    <label className="col-span-2 flex min-w-0 flex-col gap-1.5 text-[13px]">
      <span className="font-semibold text-slate-600">Material</span>
      <input
        className={`${control} w-full`}
        list={listId}
        name="material"
        autoComplete="off"
        placeholder="Escribe para buscar o introducir otra lona…"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
      <datalist id={listId}>
        {props.opciones.map((material) => (
          <option
            key={material.codigoBobina}
            value={material.nombre}
            label={`${material.codigoBobina}${material.stockArzua == null ? "" : ` · stock ${material.stockArzua}`}`}
          />
        ))}
      </datalist>
      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-500">PVC 580/650 de RPS · admite texto manual</span>
        {material ? (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 font-bold text-amber-800 ring-1 ring-amber-200/80">
            Bobina {material.codigoBobina} · Stock Arzúa {material.stockArzua == null ? "sin dato" : material.stockArzua}
          </span>
        ) : props.value ? (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
            Lona manual · sin dato de stock
          </span>
        ) : null}
      </div>
    </label>
  );
}

export function CampoCheck(props: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2.5 rounded-xl px-1 py-2 text-sm font-medium text-slate-700">
      <input className="h-4 w-4 accent-amber-500" type="checkbox" checked={props.value} onChange={(e) => props.onChange(e.target.checked)} />
      {props.label}
    </label>
  );
}

export function PosicionesManuales({
  label, valores, onChange,
}: { label: string; valores: number[]; onChange: (v: number[]) => void }) {
  return (
    <CampoTexto
      label={`${label} — separadas por guion`} ancho
      value={valores.join(" - ")}
      onChange={(txt) =>
        onChange(
          txt.split("-").map((s) => Number(s.replace(",", ".").trim())).filter((n) => Number.isFinite(n) && n > 0).slice(0, 12),
        )
      }
    />
  );
}
