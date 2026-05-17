export type RoundingMode = "normal" | "up" | "down";

export type BastillaType = "normal" | "enfundar";

export type PlanteamientoType = "lona-remolque" | "baqueton";
export type OllaoPlacement = "repartidos" | "a-la-medida";

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
  demasiaBaquetonEnAnchoDelante: number;
  demasiaBaquetonEnAnchoDetras: number;
  demasiaAnchoExtra?: number;
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
  ordenFabricacion: string;
  cliente: string;
  revision: string;
  realizadoPor: string;
  fecha: string;
  fechaSalida: string;
  cantidad: number;
  material: string;
  largoPedido: number;
  anchoPedido: number;
  altoDelantero: number;
  altoTrasero: number;
  contornoCad: number;
  contornoManualEnabled: boolean;
  contornoManual: number;
  tipoPerfil: TrailerProfileType;
  chaflanCm: number;
  alturaCumbrera: number;
  tieneCurva: boolean;
  radioCurva: number;
  recogeDelante: string;
  recogeAtras: string;
  bastilla: BastillaType;
  ventana: boolean;
  rotulacion: boolean;
  colocacionOllaos: OllaoPlacement;
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
  contornoOrigen: "calculado" | "manual" | "pendiente";
  contornoAviso?: string;
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
  ordenFabricacion: string;
  cliente: string;
  clienteEspecifico: string;
  revision: string;
  realizadoPor: string;
  fecha: string;
  fechaSalida: string;
  cantidad: number;
  material: string;
  largoPedido: number;
  anchoPedido: number;
  baqueton: number;
  perfilCalculoId: string;
  colocacionOllaos: OllaoPlacement;
  tipoOllaos: string;
  ollaosDescDelante: string;
  ollaosDescLados: string;
  ollaosDescAtras: string;
  ollaosManuales: string;
  ollaosLaterales: string;
  ollaosDelante: string;
  ollaosAtras: string;
  rotulacion: boolean;
  textoRotulacion: string;
  checkEspecifico: string;
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
