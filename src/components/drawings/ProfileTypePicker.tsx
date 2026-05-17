"use client";

import { excelSelectClass } from "@/components/ui/FormExcelRow";
import {
  TRAILER_PROFILE_CATALOG,
  type TrailerProfileType,
} from "@/lib/drawings/trailer-profile-types";

export function ProfileTypePicker({
  value,
  onChange,
  className = excelSelectClass,
}: {
  value: TrailerProfileType;
  onChange: (tipo: TrailerProfileType) => void;
  className?: string;
}) {
  return (
    <select
      className={className}
      value={value}
      onChange={(e) => onChange(e.target.value as TrailerProfileType)}
      aria-label="Tipo de perfil"
    >
      {TRAILER_PROFILE_CATALOG.map((profile) => (
        <option key={profile.id} value={profile.id}>
          {profile.label} — {profile.shortLabel}
        </option>
      ))}
    </select>
  );
}
