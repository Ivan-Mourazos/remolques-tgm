import type { LonaInput } from "@/lib/calc/lona";

const fmt = (n: number | null | undefined) => Number(n ?? 0).toLocaleString("es-ES", {
  maximumFractionDigits: 1,
});

export function datosGeometriaPdf(input: LonaInput): string[] {
  switch (input.tipoPerfil) {
    case "TIPO 01":
      return ["PERFIL RECTO"];
    case "TIPO 02":
      return [`AGUAS ${fmt(input.aguas)} CM`];
    case "TIPO 03":
      return [
        `AGUAS ${fmt(input.aguas)} CM`,
        `RADIO CUMBRERA ${fmt(input.radioCumbrera)} CM`,
        `RADIO HOMBRO ${fmt(input.radioHombro)} CM`,
      ];
    case "TIPO 04": {
      const lineas = [`CHAFLÁN ${fmt(input.chaflan)} CM`];
      if ((input.radioChaflanAbajo ?? 0) > 0 || (input.radioChaflanArriba ?? 0) > 0) {
        lineas.push(`RADIOS ${fmt(input.radioChaflanAbajo)} / ${fmt(input.radioChaflanArriba)} CM`);
      }
      return lineas;
    }
    case "TIPO 05":
      return [`RADIO ESQUINA ${fmt(input.radioEsquina)} CM`];
  }
}
