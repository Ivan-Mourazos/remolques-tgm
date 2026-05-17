"use client";

import { ProfileTypePicker } from "@/components/drawings/ProfileTypePicker";
import {
  profileNeedsChaflan,
  profileNeedsCornerRadius,
  profileNeedsPeak,
} from "@/components/drawings/cross-section-paths";
import { textareaClass } from "@/components/ui/FormField";
import {
  excelInputClass,
  excelReadonlyClass,
  excelSelectClass,
  FormExcelRow,
  FormExcelSection,
  SiNoSelect,
} from "@/components/ui/FormExcelRow";
import { getProfileDefinition } from "@/lib/drawings/trailer-profile-types";
import type { AppSettings, LonaFormInput } from "@/lib/types";

type Props = {
  input: LonaFormInput;
  settings: AppSettings;
  materials: string[];
  fieldWarnings?: Record<string, string>;
  onChange: (next: LonaFormInput) => void;
};

function aguasLabel(tipo: LonaFormInput["tipoPerfil"]) {
  const def = getProfileDefinition(tipo ?? "tipo-01");
  if (def.shortLabel.toLowerCase().includes("aguas")) return def.shortLabel.toUpperCase();
  return "—";
}

export function LonaForm({ input, settings, materials, fieldWarnings = {}, onChange }: Props) {
  const set = <K extends keyof LonaFormInput>(key: K, value: LonaFormInput[K]) =>
    onChange({ ...input, [key]: value });

  const setPerfil = (tipo: LonaFormInput["tipoPerfil"]) =>
    onChange({
      ...input,
      tipoPerfil: tipo,
      tieneCurva: profileNeedsCornerRadius(tipo),
    });

  const setContornoScad = (value: number) =>
    onChange({
      ...input,
      contornoCad: value,
      contornoManual: value,
      contornoManualEnabled: value > 0,
    });

  const tipo = input.tipoPerfil ?? "tipo-01";
  const needsChaflan = profileNeedsChaflan(tipo);
  const needsRadius = profileNeedsCornerRadius(tipo);
  const needsPeak = profileNeedsPeak(tipo);
  const w = fieldWarnings;

  return (
    <form
      className="overflow-hidden rounded border border-slate-300 bg-white"
      onSubmit={(e) => e.preventDefault()}
    >
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
      <FormExcelRow label="Alto delante" tone="medida" warn={w.altoDelantero}>
        <input
          type="number"
          step="0.1"
          className={excelInputClass}
          value={input.altoDelantero || ""}
          onChange={(e) => set("altoDelantero", Number(e.target.value))}
        />
      </FormExcelRow>
      <FormExcelRow label="Alto detrás" tone="medida" warn={w.altoTrasero}>
        <input
          type="number"
          step="0.1"
          className={excelInputClass}
          value={input.altoTrasero || ""}
          onChange={(e) => set("altoTrasero", Number(e.target.value))}
        />
      </FormExcelRow>

      {needsChaflan && (
        <FormExcelRow label="Chaflán" tone="medida">
          <input
            type="number"
            step="0.1"
            min={0}
            className={excelInputClass}
            value={input.chaflanCm || ""}
            onChange={(e) => set("chaflanCm", Number(e.target.value))}
          />
        </FormExcelRow>
      )}
      {needsRadius && (
        <FormExcelRow label="Radio curva" tone="medida" warn={w.radioCurva}>
          <input
            type="number"
            step="0.1"
            min={0}
            className={excelInputClass}
            value={input.radioCurva || ""}
            onChange={(e) => set("radioCurva", Number(e.target.value))}
          />
        </FormExcelRow>
      )}
      {needsPeak && (
        <FormExcelRow label="Cumbrera" tone="medida">
          <input
            type="number"
            step="0.1"
            min={0}
            className={excelInputClass}
            value={input.alturaCumbrera || ""}
            onChange={(e) => set("alturaCumbrera", Number(e.target.value))}
          />
        </FormExcelRow>
      )}

      <FormExcelRow label="Aguas" tone="tecnico">
        <input className={excelReadonlyClass} readOnly value={aguasLabel(tipo)} />
      </FormExcelRow>
      <FormExcelRow label="Reparto ollaos" tone="tecnico">
        <select
          className={excelSelectClass}
          value={input.colocacionOllaos}
          onChange={(e) =>
            set(
              "colocacionOllaos",
              e.target.value as LonaFormInput["colocacionOllaos"],
            )
          }
        >
          <option value="repartidos">REPARTIDOS</option>
          <option value="a-la-medida">A LA MEDIDA</option>
        </select>
      </FormExcelRow>
      <FormExcelRow label="Recoge delante" tone="tecnico">
        <select
          className={excelSelectClass}
          value={input.recogeDelante}
          onChange={(e) => set("recogeDelante", e.target.value)}
        >
          {settings.recogidaTypes.map((t) => (
            <option key={t.nombre} value={t.nombre}>
              {t.nombre}
            </option>
          ))}
        </select>
      </FormExcelRow>
      <FormExcelRow label="Recoge atrás" tone="tecnico">
        <select
          className={excelSelectClass}
          value={input.recogeAtras}
          onChange={(e) => set("recogeAtras", e.target.value)}
        >
          {settings.recogidaTypes.map((t) => (
            <option key={t.nombre} value={t.nombre}>
              {t.nombre}
            </option>
          ))}
        </select>
      </FormExcelRow>
      <FormExcelRow label="Bastilla enfundar" tone="tecnico">
        <select
          className={excelSelectClass}
          value={input.bastilla === "enfundar" ? "si" : "no"}
          onChange={(e) =>
            set("bastilla", e.target.value === "si" ? "enfundar" : "normal")
          }
        >
          <option value="no">NO</option>
          <option value="si">SÍ</option>
        </select>
      </FormExcelRow>
      <FormExcelRow label="Ventana" tone="tecnico">
        <SiNoSelect value={input.ventana} onChange={(v) => set("ventana", v)} />
      </FormExcelRow>
      <FormExcelRow label="Texto rotulac." tone="tecnico">
        <SiNoSelect
          value={input.rotulacion}
          onChange={(v) => set("rotulacion", v)}
        />
      </FormExcelRow>

      <FormExcelRow label="Perfil" tone="tecnico">
        <ProfileTypePicker value={tipo} onChange={setPerfil} />
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
      <FormExcelRow label="Contorno SCAD" tone="calculo" warn={w.contornoCad}>
        <input
          type="number"
          step="0.1"
          className={excelInputClass}
          value={input.contornoCad || ""}
          onChange={(e) => setContornoScad(Number(e.target.value))}
          placeholder="cm"
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
          Observaciones
        </summary>
        <div className="p-2">
          <textarea
            className={textareaClass}
            rows={2}
            value={input.observaciones}
            onChange={(e) => set("observaciones", e.target.value)}
          />
        </div>
      </details>
    </form>
  );
}
