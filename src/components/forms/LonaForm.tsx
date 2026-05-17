"use client";

import { ProfileTypePicker } from "@/components/drawings/ProfileTypePicker";
import {
  profileNeedsChaflan,
  profileNeedsCornerRadius,
  profileNeedsPeak,
} from "@/components/drawings/cross-section-paths";
import { FormField, inputClass, selectClass, textareaClass } from "@/components/ui/FormField";
import { calculateTrailerContour } from "@/lib/calculations/trailer-contour";
import { formatCm } from "@/lib/format/number";
import type { AppSettings, LonaFormInput } from "@/lib/types";

type Props = {
  input: LonaFormInput;
  settings: AppSettings;
  materials: string[];
  onChange: (next: LonaFormInput) => void;
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

export function LonaForm({ input, settings, materials, onChange }: Props) {
  const set = <K extends keyof LonaFormInput>(key: K, value: LonaFormInput[K]) =>
    onChange({ ...input, [key]: value });
  const setAlto = (value: number) =>
    onChange({ ...input, altoDelantero: value, altoTrasero: value });
  const setPerfil = (tipo: LonaFormInput["tipoPerfil"]) =>
    onChange({
      ...input,
      tipoPerfil: tipo,
      tieneCurva: profileNeedsCornerRadius(tipo),
    });

  const contour = calculateTrailerContour(input, settings);
  const needsChaflan = profileNeedsChaflan(input.tipoPerfil ?? "tipo-01");
  const needsRadius = profileNeedsCornerRadius(input.tipoPerfil ?? "tipo-01");
  const needsPeak = profileNeedsPeak(input.tipoPerfil ?? "tipo-01");
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
          <ProfileTypePicker
            value={input.tipoPerfil ?? "tipo-01"}
            onChange={setPerfil}
          />
          <FormField label="Largo (cm)">
            <input type="number" step="0.1" className={inputClass} value={input.largoPedido || ""} onChange={(e) => set("largoPedido", Number(e.target.value))} />
          </FormField>
          <FormField label="Ancho (cm)">
            <input type="number" step="0.1" className={inputClass} value={input.anchoPedido || ""} onChange={(e) => set("anchoPedido", Number(e.target.value))} />
          </FormField>
          <FormField label="Alto (cm)">
            <input type="number" step="0.1" className={inputClass} value={input.altoDelantero || ""} onChange={(e) => setAlto(Number(e.target.value))} />
          </FormField>
          {needsChaflan && (
            <FormField label="Chaflán cm">
              <input type="number" step="0.1" min={0} className={inputClass} value={input.chaflanCm || ""} onChange={(e) => set("chaflanCm", Number(e.target.value))} />
            </FormField>
          )}
          {needsRadius && (
            <FormField label="Radio curva cm">
              <input type="number" step="0.1" min={0} className={inputClass} value={input.radioCurva || ""} onChange={(e) => set("radioCurva", Number(e.target.value))} />
            </FormField>
          )}
          {needsPeak && (
            <FormField label="Altura cumbrera">
              <input type="number" step="0.1" min={0} className={inputClass} value={input.alturaCumbrera || ""} onChange={(e) => set("alturaCumbrera", Number(e.target.value))} />
            </FormField>
          )}
          <FormField label="Contorno calculado">
            <input
              className={`${inputClass} bg-slate-100 font-semibold`}
              readOnly
              value={contour.value == null ? contour.warning ?? "No se pudo calcular" : `${formatCm(contour.value)} cm`}
            />
          </FormField>
          <FormField label="Recoge delante">
            <select className={selectClass} value={input.recogeDelante} onChange={(e) => set("recogeDelante", e.target.value)}>
              {settings.recogidaTypes.map((t) => (
                <option key={t.nombre} value={t.nombre}>{t.nombre}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Recoge detrás">
            <select className={selectClass} value={input.recogeAtras} onChange={(e) => set("recogeAtras", e.target.value)}>
              {settings.recogidaTypes.map((t) => (
                <option key={t.nombre} value={t.nombre}>{t.nombre}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Bastilla de enfundar">
            <select className={selectClass} value={input.bastilla === "enfundar" ? "si" : "no"} onChange={(e) => set("bastilla", e.target.value === "si" ? "enfundar" : "normal")}>
              <option value="no">No</option>
              <option value="si">Sí</option>
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
          <FormField label="Colocación ollaos">
            <select className={selectClass} value={input.colocacionOllaos} onChange={(e) => set("colocacionOllaos", e.target.value as LonaFormInput["colocacionOllaos"])}>
              <option value="repartidos">REPARTIDOS</option>
              <option value="a-la-medida">A LA MEDIDA</option>
            </select>
          </FormField>
        </div>
      </section>

      {showManualOllaos && (
        <section className="sm:col-span-2 grid gap-4 sm:grid-cols-3">
          <FormField label="Ollaos laterales">
            <input className={inputClass} value={input.ollaosLaterales} onChange={(e) => set("ollaosLaterales", e.target.value)} />
          </FormField>
          <FormField label="Ollaos atrás">
            <input className={inputClass} value={input.ollaosAtras} onChange={(e) => set("ollaosAtras", e.target.value)} />
          </FormField>
          <FormField label="Ollaos delante">
            <input className={inputClass} value={input.ollaosDelante} onChange={(e) => set("ollaosDelante", e.target.value)} />
          </FormField>
        </section>
      )}

      <AdvancedSection>
        <FormField label="Cantidad">
          <input type="number" min={1} className={inputClass} value={input.cantidad} onChange={(e) => set("cantidad", Number(e.target.value))} />
        </FormField>
        <FormField label="Sobrescribir contorno manualmente">
          <select className={selectClass} value={input.contornoManualEnabled ? "si" : "no"} onChange={(e) => set("contornoManualEnabled", e.target.value === "si")}>
            <option value="no">No</option>
            <option value="si">Sí</option>
          </select>
        </FormField>
        {input.contornoManualEnabled && (
          <FormField label="Contorno manual (cm)">
            <input type="number" step="0.1" className={inputClass} value={input.contornoManual || ""} onChange={(e) => set("contornoManual", Number(e.target.value))} />
          </FormField>
        )}
        <FormField label="Alto delantero (cm)">
          <input type="number" step="0.1" className={inputClass} value={input.altoDelantero || ""} onChange={(e) => set("altoDelantero", Number(e.target.value))} />
        </FormField>
        <FormField label="Alto trasero (cm)">
          <input type="number" step="0.1" className={inputClass} value={input.altoTrasero || ""} onChange={(e) => set("altoTrasero", Number(e.target.value))} />
        </FormField>
        <FormField label="Observaciones técnicas internas" className="sm:col-span-2">
          <textarea className={textareaClass} rows={3} value={input.observaciones} onChange={(e) => set("observaciones", e.target.value)} />
        </FormField>
      </AdvancedSection>
    </form>
  );
}
