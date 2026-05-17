export type RoundingMode = "normal" | "up" | "down";

export type BastillaType = "normal" | "enfundar";

export type PlanteamientoType = "lona-remolque" | "baqueton";

export type { TrailerProfileType } from "@/lib/drawings/trailer-profile-types";
import type { TrailerProfileType } from "@/lib/drawings/trailer-profile-types";

export interface LonaParams {
  demasiaLargoAnchoLonaHecha: number;
  demasiaAlto: number;
  demasiaLargoContornoNormal: number;
  demasiaLargoContornoEnfundar: number;
  aumentoCurvaContorno: number;
  inicioOrejaSinCurva: number;
  medidaOrejaGoma: number;
  decimales: number;
  redondeo: RoundingMode;
}

export interface RecogidaType {
  nombre: string;
  delante: number;
  atras: number;
  lateralSoloAtras?: number;
  lateralSoloDelante?: number;
}

export interface BaquetonProfile {
  id: string;
  nombre: string;
  demasiaLargoPiezaFinal: number;
  demasiaAnchoPiezaFinal: number;
  demasiaBaquetonPicostura: number;
  demasiaBaquetonEnLargoDelante: number;
  demasiaBaquetonEnLargoDetras: number;
  demasiaAnchoExtra: number;
}

export interface MaterialItem {
  id: string;
  nombre: string;
  activo: boolean;
}

export interface OllaoTemplate {
  id: string;
  nombre: string;
  laterales: string;
  delante: string;
  atras: string;
}

export interface AppSettings {
  lonaParams: LonaParams;
  recogidaTypes: RecogidaType[];
  baquetonProfiles: BaquetonProfile[];
  defaultBaquetonProfileId: string;
}

export interface LonaFormInput {
  numeroPedido: string;
  cliente: string;
  revision: string;
  realizadoPor: string;
  fechaSalida: string;
  cantidad: number;
  material: string;
  largoPedido: number;
  anchoPedido: number;
  altoDelantero: number;
  altoTrasero: number;
  contornoCad: number;
  tipoPerfil: TrailerProfileType;
  chaflanCm: number;
  tieneCurva: boolean;
  radioCurva: number;
  recogeDelante: string;
  recogeAtras: string;
  bastilla: BastillaType;
  ventana: boolean;
  rotulacion: boolean;
  observaciones: string;
  ollaosLaterales: string;
  ollaosDelante: string;
  ollaosAtras: string;
}

export const PLANTEAMIENTO_SCHEMA_VERSION = "1.0";

export interface LonaCalculationResult {
  medidaLonaHecha: { largo: number; ancho: number };
  altoDelantero: number;
  altoTrasero: number;
  contornoCad: number;
  contornoAjustado: number;
  panos: {
    contorno: { ancho: number; largo: number } | null;
    delantero: { ancho: number; alto: number };
    trasero: { ancho: number; alto: number };
  };
  tipoRecogidaDelante: string;
  tipoRecogidaAtras: string;
  ventana: boolean;
  material: string;
  ollaos: { laterales: string; delante: string; atras: string };
  observaciones: string;
  notasAutomaticas: string[];
}

export interface BaquetonFormInput {
  numeroPedido: string;
  cliente: string;
  revision: string;
  realizadoPor: string;
  fechaSalida: string;
  cantidad: number;
  material: string;
  largoPedido: number;
  anchoPedido: number;
  baqueton: number;
  perfilCalculoId: string;
  tipoOllaos: string;
  ollaosManuales: string;
  rotulacion: boolean;
  observaciones: string;
}

export interface BaquetonCalculationResult {
  medidasRemolqueHecho: { largo: number; ancho: number };
  baquetonCostura: number;
  panoUnico: { largo: number; ancho: number };
  superficieM2: number;
  material: string;
  ollaos: string;
  observaciones: string;
  notasAutomaticas: string[];
}

export interface SavedPlanteamiento<TInput, TResult> {
  id: string;
  type: PlanteamientoType;
  schemaVersion: string;
  createdAt: string;
  updatedAt: string;
  input: TInput;
  result: TResult;
  settingsSnapshot: AppSettings;
}

export type SavedLona = SavedPlanteamiento<LonaFormInput, LonaCalculationResult>;
export type SavedBaqueton = SavedPlanteamiento<BaquetonFormInput, BaquetonCalculationResult>;
export type SavedItem = SavedLona | SavedBaqueton;
