export interface Recogida {
  nombre: string;
  delante: number;
  atras: number;
  lateralSoloAtras: number;
  lateralSoloDelante: number;
}

export interface ClienteBaqueton {
  nombre: string;
  extraLargoCostura: number;
  extraAnchoCostura: number;
  extraBaquetonLargoDelante: number;
  extraBaquetonLargoDetras: number;
  extraLargoFinal: number;
  extraAnchoFinal: number;
  extraBaquetonTrasero: number;
  observaciones: string[];
}

export interface CalcParams {
  recogidas: Recogida[];
  demasiaAlto: number;
  demasiaContornoNormal: number;
  demasiaContornoEnfundar: number;
  demasiaLonaHecha: number;
  pasoOllaosDefecto: number;
  primerOllao: number;
  maxPosicionesOllaos: number;
  baquetonDemasiaLargoCostura: number;
  baquetonDemasiaAnchoCostura: number;
  baquetonDemasiaCostura: number;
  baquetonDemasiaFinal: number;
  clientesBaqueton: ClienteBaqueton[];
}

export const PERFILES = [
  { value: "TIPO 01", label: "TIPO 01 · Recto" },
  { value: "TIPO 02", label: "TIPO 02 · Dos aguas rectas" },
  { value: "TIPO 03", label: "TIPO 03 · Dos aguas curvas" },
  { value: "TIPO 04", label: "TIPO 04 · chaflanes" },
  { value: "TIPO 05", label: "TIPO 05 · esquinas curvas" },
] as const;
export type TipoPerfil = (typeof PERFILES)[number]["value"];
export const TIPOS_PERFIL: TipoPerfil[] = PERFILES.map((perfil) => perfil.value);

export function perfilTieneCurva(tipo: TipoPerfil): boolean {
  return tipo === "TIPO 03" || tipo === "TIPO 05";
}

export function nombrePerfil(tipo: TipoPerfil): string {
  return PERFILES.find((perfil) => perfil.value === tipo)?.label ?? tipo;
}

const r = (
  nombre: string, delante: number, atras: number,
  lateralSoloAtras = 0, lateralSoloDelante = 0,
): Recogida => ({ nombre, delante, atras, lateralSoloAtras, lateralSoloDelante });

export const DEFAULT_PARAMS: CalcParams = {
  recogidas: [
    r("NO", 3, 3),
    r("GOMA", 27, 27),
    r("CREMALLERA", 3, 3),
    r("VELCRO", 27, 27),
    r("PUENTES ESVA", 21, 21, 19, 19),
    r("PUENTES LATERALES", 41, 21, 9, 9),
    r("PUENTES HIJOS DE PEDRO LOPEZ", 42.5, 42.5, 11.5, 9),
  ],
  demasiaAlto: 4.5,
  demasiaContornoNormal: 3,
  demasiaContornoEnfundar: 13,
  demasiaLonaHecha: 1,
  pasoOllaosDefecto: 35,
  primerOllao: 2.5,
  maxPosicionesOllaos: 12,
  baquetonDemasiaLargoCostura: 7,
  baquetonDemasiaAnchoCostura: 7,
  baquetonDemasiaCostura: 2,
  baquetonDemasiaFinal: 1,
  clientesBaqueton: [
    {
      nombre: "GENERAL",
      extraLargoCostura: 0, extraAnchoCostura: 0,
      extraBaquetonLargoDelante: 0, extraBaquetonLargoDetras: 0,
      extraLargoFinal: 0, extraAnchoFinal: 0, extraBaquetonTrasero: 0,
      observaciones: [],
    },
    {
      nombre: "HIJOS DE PEDRO LOPEZ",
      extraLargoCostura: 11, extraAnchoCostura: 2,
      extraBaquetonLargoDelante: 1, extraBaquetonLargoDetras: 11,
      extraLargoFinal: 0, extraAnchoFinal: 0, extraBaquetonTrasero: 10,
      observaciones: ["ABIERTO EN LA PARTE TRASERA (REFORZAR)"],
    },
    {
      nombre: "AYALA",
      extraLargoCostura: 1, extraAnchoCostura: 1,
      extraBaquetonLargoDelante: 0, extraBaquetonLargoDetras: 0,
      extraLargoFinal: 1, extraAnchoFinal: 1, extraBaquetonTrasero: 0,
      observaciones: [],
    },
    {
      nombre: "GENERAL WOLDER",
      extraLargoCostura: -1, extraAnchoCostura: -1,
      extraBaquetonLargoDelante: -0.5, extraBaquetonLargoDetras: -0.5,
      extraLargoFinal: 0, extraAnchoFinal: 0, extraBaquetonTrasero: 0,
      observaciones: [
        "OLLAOS EN ALTA FRECUENCIA",
        "ETIQUETA EN I.D EN LA PARTE TRASERA ENTRE LOS 2 OLLAOS MÁS A LA DERECHA",
        "MANDAR GOMA SUELTA",
      ],
    },
  ],
};

export function findRecogida(params: CalcParams, nombre: string): Recogida {
  return (
    params.recogidas.find((x) => x.nombre === nombre) ??
    params.recogidas.find((x) => x.nombre === "NO")!
  );
}

export function findClienteBaqueton(params: CalcParams, nombre: string): ClienteBaqueton {
  return (
    params.clientesBaqueton.find((x) => x.nombre === nombre) ??
    params.clientesBaqueton.find((x) => x.nombre === "GENERAL")!
  );
}
