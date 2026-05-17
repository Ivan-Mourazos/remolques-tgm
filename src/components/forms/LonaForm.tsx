"use client";

import { FormField, inputClass, selectClass, textareaClass } from "@/components/ui/FormField";
import type { AppSettings, LonaFormInput } from "@/lib/types";

type Props = {
  input: LonaFormInput;
  settings: AppSettings;
  materials: string[];
  onChange: (next: LonaFormInput) => void;
};

export function LonaForm({ input, settings, materials, onChange }: Props) {
  const set = <K extends keyof LonaFormInput>(key: K, value: LonaFormInput[K]) =>
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
      <FormField label="Alto delantero (cm)">
        <input type="number" step="0.1" className={inputClass} value={input.altoDelantero || ""} onChange={(e) => set("altoDelantero", Number(e.target.value))} />
      </FormField>
      <FormField label="Alto trasero (cm)">
        <input type="number" step="0.1" className={inputClass} value={input.altoTrasero || ""} onChange={(e) => set("altoTrasero", Number(e.target.value))} />
      </FormField>
      <FormField label="Contorno CAD (cm)">
        <input type="number" step="0.1" className={inputClass} value={input.contornoCad || ""} onChange={(e) => set("contornoCad", Number(e.target.value))} />
      </FormField>
      <FormField label="Tiene curva">
        <select className={selectClass} value={input.tieneCurva ? "si" : "no"} onChange={(e) => set("tieneCurva", e.target.value === "si")}>
          <option value="no">No</option>
          <option value="si">Sí</option>
        </select>
      </FormField>
      {input.tieneCurva && (
        <FormField label="Radio curva (cm)">
          <input type="number" step="0.1" className={inputClass} value={input.radioCurva || ""} onChange={(e) => set("radioCurva", Number(e.target.value))} />
        </FormField>
      )}
      <FormField label="Recoge delante">
        <select className={selectClass} value={input.recogeDelante} onChange={(e) => set("recogeDelante", e.target.value)}>
          {settings.recogidaTypes.map((t) => (
            <option key={t.nombre} value={t.nombre}>{t.nombre}</option>
          ))}
        </select>
      </FormField>
      <FormField label="Recoge atrás">
        <select className={selectClass} value={input.recogeAtras} onChange={(e) => set("recogeAtras", e.target.value)}>
          {settings.recogidaTypes.map((t) => (
            <option key={t.nombre} value={t.nombre}>{t.nombre}</option>
          ))}
        </select>
      </FormField>
      <FormField label="Bastilla">
        <select className={selectClass} value={input.bastilla} onChange={(e) => set("bastilla", e.target.value as LonaFormInput["bastilla"])}>
          <option value="normal">Normal</option>
          <option value="enfundar">Enfundar</option>
          <option value="personalizada">Personalizada</option>
        </select>
      </FormField>
      <FormField label="Ventana">
        <select className={selectClass} value={input.ventana ? "si" : "no"} onChange={(e) => set("ventana", e.target.value === "si")}>
          <option value="no">No</option>
          <option value="si">Sí</option>
        </select>
      </FormField>
      <FormField label="Rotulación">
        <select className={selectClass} value={input.rotulacion ? "si" : "no"} onChange={(e) => set("rotulacion", e.target.value === "si")}>
          <option value="no">No</option>
          <option value="si">Sí</option>
        </select>
      </FormField>
      <FormField label="Ollaos laterales" className="sm:col-span-2">
        <textarea className={textareaClass} rows={2} value={input.ollaosLaterales} onChange={(e) => set("ollaosLaterales", e.target.value)} />
      </FormField>
      <FormField label="Ollaos delante">
        <input className={inputClass} value={input.ollaosDelante} onChange={(e) => set("ollaosDelante", e.target.value)} />
      </FormField>
      <FormField label="Ollaos atrás">
        <input className={inputClass} value={input.ollaosAtras} onChange={(e) => set("ollaosAtras", e.target.value)} />
      </FormField>
      <FormField label="Observaciones" className="sm:col-span-2">
        <textarea className={textareaClass} rows={3} value={input.observaciones} onChange={(e) => set("observaciones", e.target.value)} />
      </FormField>
    </form>
  );
}
