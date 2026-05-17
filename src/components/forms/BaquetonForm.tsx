"use client";

import { FormField, inputClass, selectClass, textareaClass } from "@/components/ui/FormField";
import type { AppSettings, BaquetonFormInput } from "@/lib/types";

type Props = {
  input: BaquetonFormInput;
  settings: AppSettings;
  materials: string[];
  onChange: (next: BaquetonFormInput) => void;
};

function AdvancedSection({ children }: { children: React.ReactNode }) {
  return (
    <details className="sm:col-span-2 rounded-lg border border-slate-200 bg-slate-50">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-800">
        Opciones avanzadas
      </summary>
      <div className="grid gap-4 border-t border-slate-200 p-4 sm:grid-cols-2">
        {children}
      </div>
    </details>
  );
}

export function BaquetonForm({ input, settings, materials, onChange }: Props) {
  const set = <K extends keyof BaquetonFormInput>(key: K, value: BaquetonFormInput[K]) =>
    onChange({ ...input, [key]: value });
  const showManualOllaos = input.colocacionOllaos === "a-la-medida";

  return (
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
      <section className="sm:col-span-2">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
          Datos del planteamiento
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Pedido">
            <input className={inputClass} value={input.numeroPedido} onChange={(e) => set("numeroPedido", e.target.value)} />
          </FormField>
          <FormField label="O.F.">
            <input className={inputClass} value={input.ordenFabricacion} onChange={(e) => set("ordenFabricacion", e.target.value)} />
          </FormField>
          <FormField label="Cliente">
            <input className={inputClass} value={input.cliente} onChange={(e) => set("cliente", e.target.value)} />
          </FormField>
          <FormField label="Técnico">
            <input className={inputClass} value={input.realizadoPor} onChange={(e) => set("realizadoPor", e.target.value)} />
          </FormField>
          <FormField label="Revisión">
            <input className={inputClass} value={input.revision} onChange={(e) => set("revision", e.target.value)} />
          </FormField>
          <FormField label="Fecha planificación">
            <input type="date" className={inputClass} value={input.fechaSalida} onChange={(e) => set("fechaSalida", e.target.value)} />
          </FormField>
          <FormField label="Material" className="sm:col-span-3">
            <select className={selectClass} value={input.material} onChange={(e) => set("material", e.target.value)}>
              {materials.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </FormField>
        </div>
      </section>

      <section className="sm:col-span-2">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
          Datos técnicos
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Largo (cm)">
            <input type="number" step="0.1" className={inputClass} value={input.largoPedido || ""} onChange={(e) => set("largoPedido", Number(e.target.value))} />
          </FormField>
          <FormField label="Ancho (cm)">
            <input type="number" step="0.1" className={inputClass} value={input.anchoPedido || ""} onChange={(e) => set("anchoPedido", Number(e.target.value))} />
          </FormField>
          <FormField label="Baquetón (cm)">
            <input type="number" step="0.1" className={inputClass} value={input.baqueton || ""} onChange={(e) => set("baqueton", Number(e.target.value))} />
          </FormField>
          <FormField label="Colocación ollaos">
            <select className={selectClass} value={input.colocacionOllaos} onChange={(e) => set("colocacionOllaos", e.target.value as BaquetonFormInput["colocacionOllaos"])}>
              <option value="repartidos">REPARTIDOS</option>
              <option value="a-la-medida">A LA MEDIDA</option>
            </select>
          </FormField>
          <FormField label="Rotulación">
            <select className={selectClass} value={input.rotulacion ? "si" : "no"} onChange={(e) => set("rotulacion", e.target.value === "si")}>
              <option value="no">No</option>
              <option value="si">Sí</option>
            </select>
          </FormField>
        </div>
      </section>

      {showManualOllaos && (
        <FormField label="Ollaos manuales" className="sm:col-span-2">
          <textarea className={textareaClass} rows={2} value={input.ollaosManuales} onChange={(e) => set("ollaosManuales", e.target.value)} />
        </FormField>
      )}

      <AdvancedSection>
        <FormField label="Cantidad">
          <input type="number" min={1} className={inputClass} value={input.cantidad} onChange={(e) => set("cantidad", Number(e.target.value))} />
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
        <FormField label="Observaciones" className="sm:col-span-2">
          <textarea className={textareaClass} rows={3} value={input.observaciones} onChange={(e) => set("observaciones", e.target.value)} />
        </FormField>
      </AdvancedSection>
    </form>
  );
}
