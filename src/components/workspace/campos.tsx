"use client";
import { useId, type ReactNode } from "react";
import type { Material } from "@/lib/calc/materiales-seed";

const control = "rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm transition-colors hover:border-neutral-400 focus-visible:border-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700/15";

export function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-neutral-200 p-3">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">{titulo}</legend>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </fieldset>
  );
}

export function CampoNum(props: {
  label: string; value: number; onChange: (v: number) => void; ancho?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-0.5 text-xs ${props.ancho ? "col-span-2" : ""}`}>
      <span className="text-neutral-600">{props.label}</span>
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
    <label className={`flex flex-col gap-0.5 text-xs ${props.ancho ? "col-span-2" : ""}`}>
      <span className="text-neutral-600">{props.label}</span>
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
    <label className={`flex flex-col gap-0.5 text-xs ${props.ancho ? "col-span-2" : ""}`}>
      <span className="text-neutral-600">{props.label}</span>
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
  return (
    <label className="col-span-2 flex min-w-0 flex-col gap-0.5 text-xs">
      <span className="text-neutral-600">Material</span>
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
      <span className="mt-0.5 text-[11px] text-neutral-500">
        Lonas PVC 580/650 de RPS · se admite texto manual
      </span>
    </label>
  );
}

export function CampoCheck(props: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={props.value} onChange={(e) => props.onChange(e.target.checked)} />
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
