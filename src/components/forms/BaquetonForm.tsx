"use client";

import { FormField, inputClass, selectClass, textareaClass } from "@/components/ui/FormField";
import type { AppSettings, BaquetonFormInput } from "@/lib/types";

type Props = {
  input: BaquetonFormInput;
  settings: AppSettings;
  materials: string[];
  onChange: (next: BaquetonFormInput) => void;
};

export function BaquetonForm({ input, settings, materials, onChange }: Props) {
  const set = <K extends keyof BaquetonFormInput>(key: K, value: BaquetonFormInput[K]) =>
    onChange({ ...input, [key]: value });

  return (
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
      <FormField label="Nº pedido">
        <input className={inputClass} value={input.numeroPedido} onChange={(e) => set("numeroPedido", e.target.value)} />
      </FormField>
      <FormField label="Cliente">
        <input className={inputClass} value={input.cliente} onChange={(e) => set("cliente", e.target.value)} />
      </FormField>
      <FormField label="Revisión">
        <input className={inputClass} value={input.revision} onChange={(e) => set("revision", e.target.value)} />
      </FormField>
      <FormField label="Realizado por">
        <input className={inputClass} value={input.realizadoPor} onChange={(e) => set("realizadoPor", e.target.value)} />
      </FormField>
      <FormField label="Fecha salida">
        <input type="date" className={inputClass} value={input.fechaSalida} onChange={(e) => set("fechaSalida", e.target.value)} />
      </FormField>
      <FormField label="Cantidad">
        <input type="number" min={1} className={inputClass} value={input.cantidad} onChange={(e) => set("cantidad", Number(e.target.value))} />
      </FormField>
      <FormField label="Material">
        <select className={selectClass} value={input.material} onChange={(e) => set("material", e.target.value)}>
          {materials.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </FormField>
      <FormField label="Largo pedido (cm)">
        <input type="number" step="0.1" className={inputClass} value={input.largoPedido || ""} onChange={(e) => set("largoPedido", Number(e.target.value))} />
      </FormField>
      <FormField label="Ancho pedido (cm)">
        <input type="number" step="0.1" className={inputClass} value={input.anchoPedido || ""} onChange={(e) => set("anchoPedido", Number(e.target.value))} />
      </FormField>
      <FormField label="Baquetón (cm)">
        <input type="number" step="0.1" className={inputClass} value={input.baqueton || ""} onChange={(e) => set("baqueton", Number(e.target.value))} />
      </FormField>
      <FormField label="Perfil de cálculo">
        <select className={selectClass} value={input.perfilCalculoId} onChange={(e) => set("perfilCalculoId", e.target.value)}>
          {settings.baquetonProfiles.map((p) => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
      </FormField>
      <FormField label="Tipo de ollaos">
        <input className={inputClass} value={input.tipoOllaos} onChange={(e) => set("tipoOllaos", e.target.value)} />
      </FormField>
      <FormField label="Ollaos manuales" className="sm:col-span-2">
        <textarea className={textareaClass} rows={2} value={input.ollaosManuales} onChange={(e) => set("ollaosManuales", e.target.value)} />
      </FormField>
      <FormField label="Rotulación">
        <select className={selectClass} value={input.rotulacion ? "si" : "no"} onChange={(e) => set("rotulacion", e.target.value === "si")}>
          <option value="no">No</option>
          <option value="si">Sí</option>
        </select>
      </FormField>
      <FormField label="Observaciones" className="sm:col-span-2">
        <textarea className={textareaClass} rows={3} value={input.observaciones} onChange={(e) => set("observaciones", e.target.value)} />
      </FormField>
    </form>
  );
}
