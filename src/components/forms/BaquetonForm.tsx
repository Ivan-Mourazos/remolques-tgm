"use client";

import { useMemo } from "react";
import { calculateBaqueton } from "@/lib/calculations/baqueton";
import { formatCm } from "@/lib/format/number";
import { textareaClass } from "@/components/ui/FormField";
import {
  excelInputClass,
  excelReadonlyClass,
  excelSelectClass,
  FormExcelRow,
  FormExcelSection,
  SiNoSelect,
} from "@/components/ui/FormExcelRow";
import type { AppSettings, BaquetonFormInput } from "@/lib/types";

type Props = {
  input: BaquetonFormInput;
  settings: AppSettings;
  materials: string[];
  fieldWarnings?: Record<string, string>;
  onChange: (next: BaquetonFormInput) => void;
};

export function BaquetonForm({
  input,
  settings,
  materials,
  fieldWarnings = {},
  onChange,
}: Props) {
  const set = <K extends keyof BaquetonFormInput>(key: K, value: BaquetonFormInput[K]) =>
    onChange({ ...input, [key]: value });

  const w = fieldWarnings;
  const calculado = useMemo(
    () => calculateBaqueton(input, settings),
    [input, settings],
  );

  return (
    <form
      className="overflow-hidden rounded border border-slate-300 bg-white"
      onSubmit={(e) => e.preventDefault()}
    >
      <p className="border-b border-slate-300 bg-slate-800 px-2 py-1 text-center text-xs font-black uppercase tracking-wider text-white">
        Baquetón
      </p>

      <FormExcelRow label="Nº pedido" tone="pedido" warn={w.numeroPedido}>
        <input
          className={excelInputClass}
          value={input.numeroPedido}
          onChange={(e) => set("numeroPedido", e.target.value)}
        />
      </FormExcelRow>
      <FormExcelRow label="Cliente general" tone="pedido" warn={w.cliente}>
        <input
          className={excelInputClass}
          value={input.cliente}
          onChange={(e) => set("cliente", e.target.value)}
        />
      </FormExcelRow>
      <FormExcelRow label="Cliente específico" tone="pedido">
        <input
          className={excelInputClass}
          value={input.clienteEspecifico}
          onChange={(e) => set("clienteEspecifico", e.target.value)}
        />
      </FormExcelRow>
      <FormExcelRow label="Revisión" tone="pedido">
        <input
          className={excelInputClass}
          value={input.revision}
          onChange={(e) => set("revision", e.target.value)}
        />
      </FormExcelRow>
      <FormExcelRow label="O.F." tone="pedido">
        <input
          className={excelInputClass}
          value={input.ordenFabricacion}
          onChange={(e) => set("ordenFabricacion", e.target.value)}
        />
      </FormExcelRow>
      <FormExcelRow label="Realizado por" tone="pedido">
        <input
          className={excelInputClass}
          value={input.realizadoPor}
          onChange={(e) => set("realizadoPor", e.target.value)}
        />
      </FormExcelRow>
      <FormExcelRow label="Fecha" tone="pedido">
        <input
          type="date"
          className={excelInputClass}
          value={input.fecha}
          onChange={(e) => set("fecha", e.target.value)}
        />
      </FormExcelRow>

      <FormExcelRow label="Cantidad" tone="medida">
        <input
          type="number"
          min={1}
          className={excelInputClass}
          value={input.cantidad}
          onChange={(e) => set("cantidad", Number(e.target.value))}
        />
      </FormExcelRow>
      <FormExcelRow label="Largo" tone="medida" warn={w.largoPedido}>
        <input
          type="number"
          step="0.1"
          className={excelInputClass}
          value={input.largoPedido || ""}
          onChange={(e) => set("largoPedido", Number(e.target.value))}
        />
      </FormExcelRow>
      <FormExcelRow label="Ancho" tone="medida" warn={w.anchoPedido}>
        <input
          type="number"
          step="0.1"
          className={excelInputClass}
          value={input.anchoPedido || ""}
          onChange={(e) => set("anchoPedido", Number(e.target.value))}
        />
      </FormExcelRow>
      <FormExcelRow label="Baquetón" tone="medida" warn={w.baqueton}>
        <input
          type="number"
          step="0.1"
          className={excelInputClass}
          value={input.baqueton || ""}
          onChange={(e) => set("baqueton", Number(e.target.value))}
        />
      </FormExcelRow>

      <FormExcelRow label="Ollaos" tone="tecnico">
        <input
          className={excelInputClass}
          value={input.tipoOllaos}
          onChange={(e) => set("tipoOllaos", e.target.value)}
        />
      </FormExcelRow>
      <FormExcelRow label="Delante" tone="tecnico">
        <input
          className={excelInputClass}
          value={input.ollaosDescDelante}
          onChange={(e) => set("ollaosDescDelante", e.target.value)}
        />
      </FormExcelRow>
      <FormExcelRow label="Lados" tone="tecnico">
        <input
          className={excelInputClass}
          value={input.ollaosDescLados}
          onChange={(e) => set("ollaosDescLados", e.target.value)}
        />
      </FormExcelRow>
      <FormExcelRow label="Atrás" tone="tecnico">
        <input
          className={excelInputClass}
          value={input.ollaosDescAtras}
          onChange={(e) => set("ollaosDescAtras", e.target.value)}
        />
      </FormExcelRow>
      <FormExcelRow label="Rotulación" tone="tecnico">
        <SiNoSelect
          value={input.rotulacion}
          onChange={(v) => set("rotulacion", v)}
        />
      </FormExcelRow>
      <FormExcelRow label="Texto rotulac." tone="tecnico">
        <input
          className={excelInputClass}
          value={input.textoRotulacion}
          onChange={(e) => set("textoRotulacion", e.target.value)}
        />
      </FormExcelRow>
      <FormExcelRow label="Reparto ollaos" tone="tecnico">
        <select
          className={excelSelectClass}
          value={input.colocacionOllaos}
          onChange={(e) =>
            set(
              "colocacionOllaos",
              e.target.value as BaquetonFormInput["colocacionOllaos"],
            )
          }
        >
          <option value="repartidos">REPARTIDOS</option>
          <option value="a-la-medida">A LA MEDIDA</option>
        </select>
      </FormExcelRow>

      <FormExcelRow label="Fecha salida" tone="tecnico">
        <input
          type="date"
          className={excelInputClass}
          value={input.fechaSalida}
          onChange={(e) => set("fechaSalida", e.target.value)}
        />
      </FormExcelRow>

      <FormExcelSection title="Cálculo" />
      <FormExcelRow label="Baquetón" tone="calculo">
        <input
          className={excelReadonlyClass}
          readOnly
          value={
            calculado.baquetonCostura > 0
              ? `${formatCm(calculado.baquetonCostura)} cm`
              : "—"
          }
        />
      </FormExcelRow>
      <FormExcelRow label="Check específico" tone="calculo">
        <input
          className={excelInputClass}
          value={input.checkEspecifico}
          onChange={(e) => set("checkEspecifico", e.target.value)}
        />
      </FormExcelRow>

      <FormExcelSection title="Material" />
      <FormExcelRow label="Lona" tone="material" warn={w.material}>
        <select
          className={`${excelSelectClass} font-semibold`}
          value={input.material}
          onChange={(e) => set("material", e.target.value)}
        >
          {materials.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </FormExcelRow>

      <details className="border-t border-slate-200 text-xs">
        <summary className="cursor-pointer bg-slate-50 px-2 py-1.5 font-semibold text-slate-600">
          Más opciones
        </summary>
        <div className="space-y-0 border-t border-slate-200">
          <FormExcelRow label="Perfil cálculo" tone="tecnico">
            <select
              className={excelSelectClass}
              value={input.perfilCalculoId}
              onChange={(e) => set("perfilCalculoId", e.target.value)}
            >
              {settings.baquetonProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </FormExcelRow>
          <div className="p-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Observaciones
            </label>
            <textarea
              className={textareaClass}
              rows={2}
              value={input.observaciones}
              onChange={(e) => set("observaciones", e.target.value)}
            />
          </div>
        </div>
      </details>
    </form>
  );
}
