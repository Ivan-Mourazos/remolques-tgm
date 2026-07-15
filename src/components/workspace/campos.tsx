"use client";
import { useId, type ReactNode } from "react";
import type { Material } from "@/lib/calc/materiales-seed";

const control = "min-h-8 rounded-lg border border-[#d3dfdb] bg-[#fcfdfc] px-2.5 py-1 text-sm font-semibold text-[#122d32] shadow-[0_1px_2px_rgb(13_42_47/0.045)] transition-[border-color,box-shadow,background-color] hover:border-[#b8cbc5] focus-visible:border-[#c59420] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#d3a024]/15";

function columna(ancho?: boolean, span?: 1 | 2 | 3): string {
  if (span === 1) return "";
  if (span === 3) return "col-span-3";
  if (span === 2 || ancho) return "col-span-2";
  return "";
}

export function Grupo({
  titulo, children, columnas = 2, compacto = false,
}: {
  titulo: string; children: ReactNode; columnas?: 2 | 3; compacto?: boolean;
}) {
  return (
    <fieldset className={`border border-[#d4dfdb] bg-[#fbfcfb]/95 shadow-[0_10px_28px_rgb(14_45_49/0.045)] backdrop-blur-sm ${compacto ? "rounded-xl p-2.5" : "rounded-2xl p-4"}`}>
      <legend className="px-1.5 text-[11px] font-extrabold uppercase tracking-[0.11em] text-[#587278]">{titulo}</legend>
      <div className={`grid ${columnas === 3 ? "grid-cols-3" : "grid-cols-2"} ${compacto ? "gap-1.5" : "gap-3"}`}>{children}</div>
    </fieldset>
  );
}

export function PasoFormulario({
  numero, titulo, children, ultimo = false, columnas = 3,
}: {
  numero: number; titulo: string; children: ReactNode; ultimo?: boolean; columnas?: 3 | 4;
}) {
  return (
    <section className={ultimo ? "" : "border-b border-[#dbe4e1] pb-2.5"}>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#12343a] text-[10px] font-extrabold text-white shadow-sm">{numero}</span>
        <h3 className="text-[11px] font-extrabold uppercase tracking-[0.11em] text-[#587278]">{titulo}</h3>
      </div>
      <div className={`grid ${columnas === 4 ? "grid-cols-4" : "grid-cols-3"} gap-2`}>{children}</div>
    </section>
  );
}

export function CampoNum(props: {
  label: string; value: number; onChange: (v: number) => void; ancho?: boolean; span?: 1 | 2 | 3;
}) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 text-[12px] ${columna(props.ancho, props.span)}`}>
      <span className="font-bold text-[#536d72]">{props.label}</span>
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
  label: string; value: string; onChange: (v: string) => void; ancho?: boolean; span?: 1 | 2 | 3;
}) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 text-[12px] ${columna(props.ancho, props.span)}`}>
      <span className="font-bold text-[#536d72]">{props.label}</span>
      <input
        className={control}
        value={props.value} onChange={(e) => props.onChange(e.target.value)}
      />
    </label>
  );
}

export function CampoSelect(props: {
  label: string;
  value: string;
  opciones: Array<string | { value: string; label: string }>;
  onChange: (v: string) => void;
  ancho?: boolean;
  span?: 1 | 2 | 3;
}) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 text-[12px] ${columna(props.ancho, props.span)}`}>
      <span className="font-bold text-[#536d72]">{props.label}</span>
      <select
        className={control}
        value={props.value} onChange={(e) => props.onChange(e.target.value)}
      >
        {props.opciones.map((opcion) => {
          const value = typeof opcion === "string" ? opcion : opcion.value;
          const label = typeof opcion === "string" ? opcion : opcion.label;
          return <option key={value} value={value}>{label}</option>;
        })}
      </select>
    </label>
  );
}

export function CampoMaterial(props: {
  value: string; opciones: Material[]; onChange: (v: string) => void; span?: 1 | 2 | 3; compacto?: boolean;
}) {
  const listId = useId();
  const material = props.opciones.find((opcion) => opcion.nombre === props.value);
  return (
    <label className={`${columna(true, props.span)} flex min-w-0 flex-col gap-1 text-[12px]`}>
      <span className="font-bold text-[#536d72]">Material</span>
      <input
        className={`${control} w-full`}
        style={props.compacto ? { fontSize: "11px" } : undefined}
        list={listId}
        name="material"
        autoComplete="off"
        placeholder={props.compacto ? "Buscar lona…" : "Escribe para buscar o introducir otra lona…"}
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
      {props.compacto ? (
        <span className="break-words text-[9px] font-bold leading-tight text-[#8a6410]" title={props.value}>
          {material
            ? `Stock ${material.stockArzua == null ? "sin dato" : material.stockArzua} · ${material.codigoBobina}`
            : props.value ? "Lona manual · sin stock" : "PVC 580/650 RPS"}
        </span>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] leading-4">
          <span className="text-[#6d8286]">PVC 580/650 RPS · admite texto manual</span>
          {material ? (
            <span className="rounded-full bg-[#f8edcd] px-2 py-0.5 font-bold text-[#76540a] ring-1 ring-[#e7ce89]">
              Bobina {material.codigoBobina} · Stock Arzúa {material.stockArzua == null ? "sin dato" : material.stockArzua}
            </span>
          ) : props.value ? (
            <span className="rounded-full bg-[#e8eeec] px-2 py-0.5 font-semibold text-[#587075]">
              Lona manual · sin dato de stock
            </span>
          ) : null}
        </div>
      )}
    </label>
  );
}

export function CampoCheck(props: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-8 items-center gap-2 rounded-lg px-2 py-0.5 text-[13px] font-bold text-[#425f64] transition-colors hover:bg-[#edf2f0]">
      <input className="h-4 w-4 accent-[#c99821]" type="checkbox" checked={props.value} onChange={(e) => props.onChange(e.target.checked)} />
      {props.label}
    </label>
  );
}
