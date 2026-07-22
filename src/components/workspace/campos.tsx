"use client";
import { useId, useMemo, useState, type ReactNode } from "react";
import type { Material } from "@/lib/calc/materiales-seed";

const control = "min-h-8 rounded-lg border border-line bg-surface px-2.5 py-1 text-sm font-semibold text-ink shadow-[0_1px_2px_rgb(13_42_47/0.045)] transition-[border-color,box-shadow,background-color] hover:border-line-2 focus-visible:border-gold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/15";
const controlError = "border-red-500/70 bg-red-50/40 focus-visible:border-red-600 focus-visible:ring-red-500/20";

function MensajeError({ id, mensaje }: { id: string; mensaje?: string }) {
  return mensaje ? <span id={id} className="text-[10px] font-bold leading-4 text-red-700">{mensaje}</span> : null;
}

function columna(ancho?: boolean, span?: 1 | 2 | 3): string {
  if (span === 1) return "";
  if (span === 3) return "col-span-3";
  if (span === 2 || ancho) return "col-span-2";
  return "";
}

export function Grupo({
  titulo, children, columnas = 2, compacto = false,
}: {
  titulo: string; children: ReactNode; columnas?: 2 | 3 | 4; compacto?: boolean;
}) {
  const cols = columnas === 4
    ? "grid-cols-2 sm:grid-cols-4"
    : columnas === 3
      ? "grid-cols-1 sm:grid-cols-3"
      : "grid-cols-1 sm:grid-cols-2";
  return (
    <fieldset className={`relative border border-line bg-surface/95 shadow-[0_10px_28px_rgb(14_45_49/0.045)] backdrop-blur-sm focus-within:z-50 ${compacto ? "rounded-xl p-2.5" : "rounded-2xl p-4"}`}>
      <legend className="px-1.5 text-[11px] font-extrabold uppercase tracking-[0.11em] text-muted">{titulo}</legend>
      <div className={`grid ${cols} ${compacto ? "gap-1.5" : "gap-3"}`}>{children}</div>
    </fieldset>
  );
}

export function PasoFormulario({
  numero, titulo, children, ultimo = false, columnas = 3,
}: {
  numero: number; titulo: string; children: ReactNode; ultimo?: boolean; columnas?: 3 | 4;
}) {
  return (
    <section className={ultimo ? "" : "border-b border-line pb-2.5"}>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-deep-2 text-[10px] font-extrabold text-white shadow-sm">{numero}</span>
        <h3 className="text-[11px] font-extrabold uppercase tracking-[0.11em] text-muted">{titulo}</h3>
      </div>
      <div className={`grid ${columnas === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-1 sm:grid-cols-3"} gap-2`}>{children}</div>
    </section>
  );
}

export function CampoNum(props: {
  label: string; value: number; onChange: (v: number) => void; ancho?: boolean; span?: 1 | 2 | 3;
  name?: string; error?: string;
}) {
  const errorId = useId();
  return (
    <label className={`flex min-w-0 flex-col gap-1 text-[12px] ${columna(props.ancho, props.span)}`}>
      <span className="font-bold text-muted">{props.label}</span>
      <input
        name={props.name}
        data-campo={props.name}
        aria-invalid={Boolean(props.error)}
        aria-describedby={props.error ? errorId : undefined}
        type="number" inputMode="decimal" step="0.1" min="0"
        className={`${control} tabular-nums ${props.error ? controlError : ""}`}
        value={props.value === 0 ? "" : props.value}
        onChange={(e) => props.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      />
      <MensajeError id={errorId} mensaje={props.error} />
    </label>
  );
}

export function CampoTexto(props: {
  label: string; value: string; onChange: (v: string) => void; ancho?: boolean; span?: 1 | 2 | 3;
  name?: string; error?: string;
}) {
  const errorId = useId();
  return (
    <label className={`flex min-w-0 flex-col gap-1 text-[12px] ${columna(props.ancho, props.span)}`}>
      <span className="font-bold text-muted">{props.label}</span>
      <input
        name={props.name}
        data-campo={props.name}
        autoComplete="off"
        aria-invalid={Boolean(props.error)}
        aria-describedby={props.error ? errorId : undefined}
        className={`${control} ${props.error ? controlError : ""}`}
        value={props.value} onChange={(e) => props.onChange(e.target.value)}
      />
      <MensajeError id={errorId} mensaje={props.error} />
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
  name?: string;
  error?: string;
}) {
  const listId = useId();
  const labelId = useId();
  const [abierto, setAbierto] = useState(false);
  const errorId = useId();
  const opciones = props.opciones.map((opcion) => (
    typeof opcion === "string" ? { value: opcion, label: opcion } : opcion
  ));
  const opcionActual = opciones.find((opcion) => opcion.value === props.value)
    ?? (props.value ? { value: props.value, label: props.value } : opciones[0]);
  const indiceActual = Math.max(opciones.findIndex((opcion) => opcion.value === props.value), 0);
  const [indiceActivo, setIndiceActivo] = useState(indiceActual);

  const abrir = () => {
    setIndiceActivo(indiceActual);
    setAbierto(true);
  };

  const elegir = (value: string) => {
    props.onChange(value);
    setAbierto(false);
  };

  return (
    <div
      className={`relative flex min-w-0 flex-col gap-1 text-[12px] ${columna(props.ancho, props.span)}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setAbierto(false);
      }}
    >
      <span id={labelId} className="font-bold text-muted">{props.label}</span>
      <button
        data-campo={props.name}
        data-invalid={props.error ? "true" : undefined}
        type="button"
        aria-labelledby={`${labelId} ${listId}-value`}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={listId}
        aria-describedby={props.error ? errorId : undefined}
        onClick={() => abierto ? setAbierto(false) : abrir()}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setAbierto(false);
            return;
          }
          if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            if (!abierto) abrir();
            if (event.key === "ArrowDown") setIndiceActivo((actual) => Math.min(actual + 1, opciones.length - 1));
            if (event.key === "ArrowUp") setIndiceActivo((actual) => Math.max(actual - 1, 0));
            if (event.key === "Home") setIndiceActivo(0);
            if (event.key === "End") setIndiceActivo(Math.max(opciones.length - 1, 0));
          }
          if (event.key === "Enter" && abierto && opciones[indiceActivo]) {
            event.preventDefault();
            elegir(opciones[indiceActivo].value);
          }
        }}
        className={`${control} ${props.error ? controlError : ""} flex w-full items-center justify-between gap-2 text-left`}
      >
        <span id={`${listId}-value`} className="min-w-0 truncate">{opcionActual?.label ?? ""}</span>
        <span aria-hidden className={`shrink-0 text-[10px] font-black text-muted transition-transform ${abierto ? "rotate-180 text-gold-2" : ""}`}>⌄</span>
      </button>

      {abierto && (
        <div
          id={listId}
          role="listbox"
          aria-labelledby={labelId}
          className="absolute left-0 top-[52px] z-50 max-h-64 w-full min-w-0 overflow-y-auto rounded-xl border border-line-2 bg-surface/98 p-1 shadow-[0_16px_38px_rgb(8_35_40/0.20)] backdrop-blur-xl"
        >
          {opciones.map((opcion, index) => {
            const seleccionada = opcion.value === props.value;
            return (
              <button
                type="button"
                role="option"
                aria-selected={seleccionada}
                key={opcion.value}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setIndiceActivo(index)}
                onClick={() => elegir(opcion.value)}
                className={`flex min-h-8 w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-semibold leading-4 transition ${
                  index === indiceActivo ? "bg-surface-3 text-ink" : "text-ink-2 hover:bg-surface-2"
                } ${seleccionada ? "shadow-[inset_3px_0_0_var(--color-gold)]" : ""}`}
              >
                <span className="min-w-0 whitespace-normal">{opcion.label}</span>
                {seleccionada && <span aria-hidden className="shrink-0 font-black text-gold-2">✓</span>}
              </button>
            );
          })}
        </div>
      )}
      <MensajeError id={errorId} mensaje={props.error} />
    </div>
  );
}

export function CampoMaterial(props: {
  value: string; opciones: Material[]; onChange: (v: string) => void; span?: 1 | 2 | 3; compacto?: boolean;
  error?: string;
}) {
  const listId = useId();
  const inputId = useId();
  const errorId = useId();
  const [abierto, setAbierto] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState(0);
  const material = props.opciones.find((opcion) => opcion.nombre === props.value);
  const opcionesVisibles = useMemo(() => {
    const normalizar = (value: string) => value
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLocaleUpperCase("es-ES");
    // Al abrir una bobina ya seleccionada mostramos el catálogo completo para
    // que cambiarla sea inmediato; al escribir, filtramos por todos los tokens.
    const consulta = material ? "" : normalizar(props.value).trim();
    const tokens = consulta.split(/\s+/).filter(Boolean);
    return [...props.opciones]
      .filter((opcion) => {
        const texto = normalizar(`${opcion.nombre} ${opcion.codigoBobina}`);
        return tokens.every((token) => texto.includes(token));
      })
      .sort((a, b) => {
        const stockA = a.stockArzua == null ? Number.NEGATIVE_INFINITY : Number(a.stockArzua);
        const stockB = b.stockArzua == null ? Number.NEGATIVE_INFINITY : Number(b.stockArzua);
        return stockB - stockA || a.nombre.localeCompare(b.nombre, "es");
      })
      .slice(0, 10);
  }, [material, props.opciones, props.value]);

  const elegir = (opcion: Material) => {
    props.onChange(opcion.nombre);
    setAbierto(false);
    setIndiceActivo(0);
  };

  return (
    <div
      className={`${columna(true, props.span)} relative flex min-w-0 flex-col gap-1 text-[12px]`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setAbierto(false);
      }}
    >
      <label htmlFor={inputId} className="font-bold text-muted">Material</label>
      <div className="relative">
        <input
          id={inputId}
          data-campo="material"
          aria-invalid={Boolean(props.error)}
          aria-describedby={props.error ? errorId : undefined}
          className={`${control} ${props.error ? controlError : ""} w-full pr-8`}
          style={props.compacto ? { fontSize: "11px" } : undefined}
          name="material"
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={abierto}
          aria-controls={listId}
          aria-activedescendant={abierto && opcionesVisibles[indiceActivo] ? `${listId}-${indiceActivo}` : undefined}
          placeholder={props.compacto ? "Buscar color, RAL o bobina…" : "Buscar color, RAL, gramaje o código…"}
          value={props.value}
          onFocus={() => setAbierto(true)}
          onChange={(event) => {
            props.onChange(event.target.value);
            setIndiceActivo(0);
            setAbierto(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setAbierto(false);
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setAbierto(true);
              setIndiceActivo((actual) => Math.min(actual + 1, opcionesVisibles.length - 1));
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setIndiceActivo((actual) => Math.max(actual - 1, 0));
            }
            if (event.key === "Enter" && abierto && opcionesVisibles[indiceActivo]) {
              event.preventDefault();
              elegir(opcionesVisibles[indiceActivo]);
            }
          }}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={abierto ? "Cerrar catálogo de lonas" : "Abrir catálogo de lonas"}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setAbierto((actual) => !actual)}
          className="absolute inset-y-0 right-0 flex w-8 items-center justify-center text-sm font-black text-muted transition hover:text-gold-2"
        >
          {abierto ? "⌃" : "⌄"}
        </button>
      </div>

      {abierto && (
        <div
          id={listId}
          role="listbox"
          className="absolute right-0 top-[52px] z-50 max-h-64 w-[min(460px,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-line-2 bg-surface/98 p-1.5 shadow-[0_18px_48px_rgb(8_35_40/0.20)] backdrop-blur-xl"
        >
          <div className="mb-1 flex items-center justify-between px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.13em] text-muted-2">
            <span>Bobinas RPS</span>
            <span>Mayor stock primero</span>
          </div>
          {opcionesVisibles.length > 0 ? opcionesVisibles.map((opcion, index) => {
            const seleccionada = opcion.nombre === props.value;
            const sinStock = opcion.stockArzua != null && opcion.stockArzua <= 0;
            return (
              <button
                id={`${listId}-${index}`}
                type="button"
                role="option"
                aria-selected={seleccionada}
                key={opcion.codigoBobina}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setIndiceActivo(index)}
                onClick={() => elegir(opcion)}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left transition ${
                  index === indiceActivo ? "bg-surface-3" : "hover:bg-surface-2"
                } ${seleccionada ? "shadow-[inset_3px_0_0_var(--color-gold)]" : ""}`}
              >
                <span className="min-w-0">
                  <span className="block whitespace-normal text-[11px] font-bold leading-4 text-ink">{opcion.nombre}</span>
                  <span className="mt-0.5 block font-mono text-[9px] font-bold text-muted">{opcion.codigoBobina}</span>
                </span>
                <span className={`shrink-0 rounded-md px-2 py-1 text-[9px] font-extrabold tabular-nums ${
                  opcion.stockArzua == null
                    ? "bg-surface-3 text-muted"
                    : sinStock
                      ? "bg-red-500/10 text-red-700"
                      : "bg-gold/15 text-gold-2"
                }`}>
                  {opcion.stockArzua == null ? "Sin dato" : `Stock · ${Number(opcion.stockArzua).toLocaleString("es-ES", { maximumFractionDigits: 1 })}`}
                </span>
              </button>
            );
          }) : (
            <p className="px-2.5 py-3 text-[11px] font-semibold text-muted">
              Sin coincidencias en RPS. Puedes conservar el texto como material manual.
            </p>
          )}
        </div>
      )}

      <MensajeError id={errorId} mensaje={props.error} />

      {props.compacto ? (
        <span className="break-words text-[10px] font-bold leading-tight text-gold-2" title={props.value}>
          {material
            ? `Stock ${material.stockArzua == null ? "sin dato" : material.stockArzua} · ${material.codigoBobina}`
            : props.value ? "Lona manual · sin stock" : "PVC 580/650 RPS"}
        </span>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] leading-4">
          <span className="text-muted">PVC 580/650 RPS · admite texto manual</span>
          {material ? (
            <span className="rounded-full bg-gold/15 px-2 py-0.5 font-bold text-gold-2 ring-1 ring-gold/40">
              Bobina {material.codigoBobina} · Stock Arzúa {material.stockArzua == null ? "sin dato" : material.stockArzua}
            </span>
          ) : props.value ? (
            <span className="rounded-full bg-surface-3 px-2 py-0.5 font-semibold text-muted">
              Lona manual · sin dato de stock
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function CampoCheck(props: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label
      className={`flex min-h-8 w-full cursor-pointer select-none items-center gap-2 self-end rounded-lg border px-2.5 py-1 text-[12px] font-bold transition-colors ${
        props.value
          ? "border-gold/60 bg-gold/10 text-ink"
          : "border-line bg-surface text-ink-2 hover:border-line-2"
      }`}
    >
      <input className="h-4 w-4 accent-gold" type="checkbox" checked={props.value} onChange={(e) => props.onChange(e.target.checked)} />
      {props.label}
    </label>
  );
}
