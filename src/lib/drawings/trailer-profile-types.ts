export type TrailerProfileType =
  | "tipo-01"
  | "tipo-02"
  | "tipo-03"
  | "tipo-04"
  | "tipo-05";

export interface TrailerProfileDefinition {
  id: TrailerProfileType;
  label: string;
  shortLabel: string;
  description: string;
}

export const TRAILER_PROFILE_CATALOG: TrailerProfileDefinition[] = [
  {
    id: "tipo-01",
    label: "TIPO 01",
    shortLabel: "Recto",
    description: "Perfil rectangular, esquinas a 90°",
  },
  {
    id: "tipo-02",
    label: "TIPO 02",
    shortLabel: "Dos aguas",
    description: "Cumbrera central, esquinas vivas",
  },
  {
    id: "tipo-03",
    label: "TIPO 03",
    shortLabel: "Dos aguas redondeado",
    description: "Cumbrera con esquinas redondeadas",
  },
  {
    id: "tipo-04",
    label: "TIPO 04",
    shortLabel: "Chaflán",
    description: "Techo plano con chaflán en esquinas",
  },
  {
    id: "tipo-05",
    label: "TIPO 05",
    shortLabel: "Esquinas redondeadas",
    description: "Techo plano con filetes",
  },
];

export function getProfileDefinition(id: TrailerProfileType): TrailerProfileDefinition {
  return TRAILER_PROFILE_CATALOG.find((p) => p.id === id) ?? TRAILER_PROFILE_CATALOG[0];
}
