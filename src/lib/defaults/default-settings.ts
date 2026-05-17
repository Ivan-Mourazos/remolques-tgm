import type { AppSettings, MaterialItem, OllaoTemplate } from "@/lib/types";

export const DEFAULT_LONA_PARAMS = {
  demasiaLargoAnchoLonaHecha: 1,
  demasiaAlto: 4.5,
  demasiaLargoContornoNormal: 3,
  demasiaLargoContornoEnfundar: 13,
  aumentoCurvaContorno: 1.5,
  inicioOrejaSinCurva: 5,
  medidaOrejaGoma: 10,
  decimales: 1,
  redondeo: "normal" as const,
};

export const DEFAULT_RECOGIDA_TYPES = [
  { nombre: "NO", delante: 3, atras: 3 },
  { nombre: "GOMA", delante: 27, atras: 27 },
  { nombre: "CREMALLERA", delante: 3, atras: 3 },
  { nombre: "VELCRO", delante: 27, atras: 27 },
  {
    nombre: "PUENTES ESVA",
    delante: 21,
    atras: 21,
    lateralSoloAtras: 19,
    lateralSoloDelante: 19,
  },
  {
    nombre: "PUENTES LATERALES",
    delante: 41,
    atras: 21,
    lateralSoloAtras: 9,
    lateralSoloDelante: 9,
  },
  {
    nombre: "PUENTES HIJOS DE PEDRO LÓPEZ",
    delante: 42.5,
    atras: 42.5,
    lateralSoloAtras: 11.5,
    lateralSoloDelante: 9,
  },
];

export const DEFAULT_BAQUETON_PROFILES = [
  {
    id: "estandar",
    nombre: "Estándar",
    demasiaLargoPiezaFinal: 1,
    demasiaAnchoPiezaFinal: 1,
    demasiaBaquetonPicostura: 2,
    demasiaBaquetonEnLargoDelante: 1,
    demasiaBaquetonEnLargoDetras: 1,
    demasiaAnchoExtra: 2,
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  lonaParams: DEFAULT_LONA_PARAMS,
  recogidaTypes: DEFAULT_RECOGIDA_TYPES,
  baquetonProfiles: DEFAULT_BAQUETON_PROFILES,
  defaultBaquetonProfileId: "estandar",
};

export const DEFAULT_MATERIALS: MaterialItem[] = [
  { id: "mat-1", nombre: "PVC 900", activo: true },
  { id: "mat-2", nombre: "PVC 1100", activo: true },
  { id: "mat-3", nombre: "Tela técnica", activo: true },
];

export const DEFAULT_OLLAO_TEMPLATES: OllaoTemplate[] = [
  {
    id: "oll-1",
    nombre: "Estándar lateral",
    laterales: "Cada 50 cm",
    delante: "—",
    atras: "—",
  },
];

export function createEmptyLonaInput(): import("@/lib/types").LonaFormInput {
  return {
    numeroPedido: "",
    cliente: "",
    revision: "",
    realizadoPor: "",
    fechaSalida: new Date().toISOString().slice(0, 10),
    cantidad: 1,
    material: DEFAULT_MATERIALS[0]?.nombre ?? "",
    largoPedido: 0,
    anchoPedido: 0,
    altoDelantero: 0,
    altoTrasero: 0,
    contornoCad: 0,
    tieneCurva: false,
    radioCurva: 0,
    recogeDelante: "NO",
    recogeAtras: "NO",
    bastilla: "normal",
    ventana: false,
    rotulacion: false,
    observaciones: "",
    ollaosLaterales: "",
    ollaosDelante: "",
    ollaosAtras: "",
  };
}

export function createEmptyBaquetonInput(
  settings: AppSettings = DEFAULT_SETTINGS,
): import("@/lib/types").BaquetonFormInput {
  return {
    numeroPedido: "",
    cliente: "",
    revision: "",
    realizadoPor: "",
    fechaSalida: new Date().toISOString().slice(0, 10),
    cantidad: 1,
    material: DEFAULT_MATERIALS[0]?.nombre ?? "",
    largoPedido: 0,
    anchoPedido: 0,
    baqueton: 0,
    perfilCalculoId: settings.defaultBaquetonProfileId,
    tipoOllaos: "",
    ollaosManuales: "",
    rotulacion: false,
    observaciones: "",
  };
}
