export interface ColoresLona {
  techoClaro: string;
  techo: string;
  lateralClaro: string;
  lateral: string;
}

const COLORES_RAL: Record<string, string> = {
  "1003": "#f2a900",
  "1013": "#e9e5ce",
  "1014": "#ded09f",
  "1018": "#f3e03b",
  "2004": "#e25303",
  "3002": "#a72920",
  "5015": "#2874b2",
  "6024": "#008351",
  "6026": "#005f4e",
  "7037": "#7a888e",
  "7038": "#b5b8b1",
  "9005": "#1d2025",
  "9010": "#f4f4f0",
};

const COLORES_NOMBRE: Array<[RegExp, string]> = [
  [/AZUL EUROPA/, "#24466f"],
  [/AZUL CLARO|AZUL/, "#2874b2"],
  [/AMARILLO/, "#f2b705"],
  [/BURDEOS/, "#702f43"],
  [/ARENA/, "#c7ad7f"],
  [/CREMA|MARFIL/, "#e5d9b6"],
  [/MARR[OÓ]N/, "#704a2f"],
  [/NARANJA/, "#e85d04"],
  [/NEGRO/, "#252a31"],
  [/PLATA/, "#aab2ba"],
  [/ROJO/, "#b82b2f"],
  [/VERDE/, "#147a52"],
  [/GRIS.*OSCURO/, "#657079"],
  [/GRIS/, "#aeb4b2"],
  [/BLANCO/, "#f4f4f0"],
];

const NEUTRO = "#9aa8b5";

function mezcla(hex: string, destino: string, proporcion: number): string {
  const canal = (color: string, offset: number) => Number.parseInt(color.slice(offset, offset + 2), 16);
  const componentes = [1, 3, 5].map((offset) =>
    Math.round(canal(hex, offset) * (1 - proporcion) + canal(destino, offset) * proporcion),
  );
  return `#${componentes.map((valor) => valor.toString(16).padStart(2, "0")).join("")}`;
}

export function colorBaseMaterial(material: string): string {
  const texto = material.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  const ral = Object.keys(COLORES_RAL).find((codigo) => texto.includes(codigo));
  if (ral) return COLORES_RAL[ral];
  return COLORES_NOMBRE.find(([patron]) => patron.test(texto))?.[1] ?? NEUTRO;
}

export function coloresMaterial(material: string): ColoresLona {
  const base = colorBaseMaterial(material);
  return {
    techoClaro: mezcla(base, "#ffffff", 0.28),
    techo: mezcla(base, "#ffffff", 0.08),
    lateralClaro: mezcla(base, "#ffffff", 0.06),
    lateral: mezcla(base, "#0f172a", 0.2),
  };
}
