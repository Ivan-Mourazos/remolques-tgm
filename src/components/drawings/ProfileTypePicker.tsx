"use client";

import { buildCrossSectionPath } from "@/components/drawings/cross-section-paths";
import {
  TRAILER_PROFILE_CATALOG,
  type TrailerProfileType,
} from "@/lib/drawings/trailer-profile-types";

function ProfileThumb({
  tipo,
  selected,
  onSelect,
}: {
  tipo: TrailerProfileType;
  selected: boolean;
  onSelect: () => void;
}) {
  const def = TRAILER_PROFILE_CATALOG.find((p) => p.id === tipo)!;
  const d = buildCrossSectionPath({ tipo });

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex flex-col items-center rounded-lg border-2 p-2 transition ${
        selected
          ? "border-slate-800 bg-slate-50 ring-2 ring-slate-800/20"
          : "border-slate-200 bg-white hover:border-slate-400"
      }`}
    >
      <svg viewBox="0 0 100 80" className="h-16 w-20" aria-hidden>
        <path
          d={d}
          fill="none"
          stroke="#1a1a1a"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {tipo === "tipo-04" && (
          <text x={50} y={44} textAnchor="middle" fontSize={8} fontWeight="bold">
            CHAFLAN
          </text>
        )}
      </svg>
      <span className="mt-1 text-xs font-bold text-slate-900">{def.label}</span>
      <span className="text-[10px] text-slate-500">{def.shortLabel}</span>
    </button>
  );
}

export function ProfileTypePicker({
  value,
  onChange,
}: {
  value: TrailerProfileType;
  onChange: (tipo: TrailerProfileType) => void;
}) {
  return (
    <fieldset className="sm:col-span-2">
      <legend className="mb-2 block text-sm font-medium text-slate-700">
        Tipo de perfil (corte transversal)
      </legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {TRAILER_PROFILE_CATALOG.map((p) => (
          <ProfileThumb
            key={p.id}
            tipo={p.id}
            selected={value === p.id}
            onSelect={() => onChange(p.id)}
          />
        ))}
      </div>
    </fieldset>
  );
}
