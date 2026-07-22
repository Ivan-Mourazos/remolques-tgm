"use client";
import type { ReactNode } from "react";
import type { LonaInput } from "@/lib/calc/lona";
import type { Material } from "@/lib/calc/materiales-seed";
import { ajusteContorno, DEFAULT_PARAMS, PERFILES, type CalcParams } from "@/lib/calc/params";
import { contornoCalculado } from "@/lib/geometry/contorno";
import { excelRound } from "@/lib/calc/redondeo";
import { CampoCheck, CampoMaterial, CampoNum, CampoSelect, CampoTexto, Grupo, PasoFormulario } from "@/components/workspace/campos";
import { MODOS_OLLAOS, opcionesConEtiqueta, TECNICOS } from "@/components/workspace/opciones-formulario";

const fmt = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 1 });
const PERFILES_VISIBLES = PERFILES.map((perfil) => ({
  value: perfil.value,
  label: perfil.label.replace(/ · ([a-záéíóúüñ])/u, (_, letra: string) => ` · ${letra.toLocaleUpperCase("es-ES")}`),
}));

export function FormularioLona({
  input, materiales, params, onChange, rpsPanel,
}: {
  input: LonaInput; materiales: Material[]; params?: CalcParams; onChange: (i: LonaInput) => void;
  rpsPanel?: ReactNode;
}) {
  const RECOGIDAS = opcionesConEtiqueta((params ?? DEFAULT_PARAMS).recogidas.map((r) => r.nombre));
  const ajuste = ajusteContorno(params ?? DEFAULT_PARAMS, input.tipoPerfil);
  const contornoVisible = input.contorno
    ?? Math.max((input.contornoScad ?? 0) - ajuste, 0);
  // El contorno se desarrolla sobre la LONA HECHA (ancho + demasía), no sobre
  // el remolque pedido: validado contra la línea rosa del CAD de oficina técnica.
  const calculado = contornoCalculado(input.tipoPerfil, {
    ancho: input.ancho + (params ?? DEFAULT_PARAMS).demasiaLonaHecha,
    alto: input.altoDelante,
    aguas: input.aguas,
    radioCumbrera: input.radioCumbrera,
    radioHombro: input.radioHombro,
    radioEsquina: input.radioEsquina,
    chaflan: input.chaflan,
  });
  const contornoExacto = calculado == null ? null : excelRound(calculado, 1);
  const faltaDato = input.tipoPerfil === "TIPO 04" && !(input.chaflan ?? 0)
    ? "chaflán"
    : input.tipoPerfil === "TIPO 05" && !(input.radioEsquina ?? 0)
      ? "radio"
      : null;
  const set = <K extends keyof LonaInput>(k: K, v: LonaInput[K]) => onChange({ ...input, [k]: v });
  const setCab = (k: keyof LonaInput["cabecera"], v: string) =>
    onChange({ ...input, cabecera: { ...input.cabecera, [k]: v } });

  return (
    <div className="flex flex-col gap-2.5">
      <Grupo titulo="Pedido" columnas={3} compacto>
        <CampoTexto label="Nº pedido" value={input.cabecera.numeroPedido} onChange={(v) => setCab("numeroPedido", v)} />
        <CampoTexto label="O.F." value={input.cabecera.ordenFabricacion ?? ""} onChange={(v) => setCab("ordenFabricacion", v)} />
        <CampoSelect label="Realizado por" value={input.cabecera.realizadoPor} opciones={TECNICOS} onChange={(v) => setCab("realizadoPor", v)} />
        <CampoTexto label="Cliente" span={2} value={input.cabecera.cliente} onChange={(v) => setCab("cliente", v)} />
        <CampoSelect label="Revisión" value={input.cabecera.revision} opciones={TECNICOS} onChange={(v) => setCab("revision", v)} />
      </Grupo>
      {rpsPanel}

      <div className="space-y-2 rounded-2xl border border-line bg-surface/95 p-2.5 shadow-[0_12px_32px_rgb(14_45_49/0.055)] backdrop-blur-sm">
        <PasoFormulario numero={1} titulo="Forma del remolque" columnas={4}>
          <CampoSelect label="Tipo" span={2} value={input.tipoPerfil} opciones={PERFILES_VISIBLES}
            onChange={(v) => set("tipoPerfil", v as LonaInput["tipoPerfil"])} />
          <CampoMaterial compacto span={2} value={input.material} opciones={materiales}
            onChange={(v) => set("material", v)} />
        </PasoFormulario>
        <PasoFormulario numero={2} titulo="Recogidas">
          <CampoSelect label="Delante" value={input.recogeDelante} opciones={RECOGIDAS}
            onChange={(v) => set("recogeDelante", v)} />
          <CampoSelect label="Atrás" value={input.recogeAtras} opciones={RECOGIDAS}
            onChange={(v) => set("recogeAtras", v)} />
          <CampoCheck label="Bastilla enfundar" value={input.bastillaEnfundar} onChange={(v) => set("bastillaEnfundar", v)} />
        </PasoFormulario>
        <PasoFormulario numero={3} titulo="Medidas · cm" columnas={4}>
          <CampoNum label="Cantidad" value={input.cantidad} onChange={(v) => set("cantidad", v)} />
          <CampoNum label="Largo" value={input.largo} onChange={(v) => set("largo", v)} />
          <CampoNum label="Ancho" value={input.ancho} onChange={(v) => set("ancho", v)} />
          <CampoNum label="Ancho detrás" value={input.anchoAtras ?? 0} onChange={(v) => set("anchoAtras", v)} />
          <CampoNum label="Alto delante" value={input.altoDelante} onChange={(v) => set("altoDelante", v)} />
          <CampoNum label="Alto detrás" value={input.altoAtras} onChange={(v) => set("altoAtras", v)} />
          {["TIPO 02", "TIPO 03"].includes(input.tipoPerfil) && (
            <CampoNum label="Aguas" value={input.aguas ?? 0} onChange={(v) => set("aguas", v)} />
          )}
          {input.tipoPerfil === "TIPO 03" && (
            <>
              <CampoNum label="Radio cumbrera" value={input.radioCumbrera ?? 0} onChange={(v) => set("radioCumbrera", v)} />
              <CampoNum label="Radio hombro" value={input.radioHombro ?? 0} onChange={(v) => set("radioHombro", v)} />
            </>
          )}
          {input.tipoPerfil === "TIPO 04" && (
            <CampoNum label="Chaflán esquina" value={input.chaflan ?? 0} onChange={(v) => set("chaflan", v)} />
          )}
          {input.tipoPerfil === "TIPO 05" && (
            <CampoNum label="Radio esquina" value={input.radioEsquina ?? 0} onChange={(v) => set("radioEsquina", v)} />
          )}
          <div className="flex min-w-0 flex-col">
            <CampoNum label="Contorno" value={contornoVisible}
              onChange={(v) => onChange({ ...input, contorno: v, contornoScad: undefined })} />
            {faltaDato ? (
              <p className="mt-0.5 text-[10px] font-bold leading-tight text-gold-2">
                Introduce el {faltaDato} para calcularlo
              </p>
            ) : contornoExacto != null && Math.abs(contornoVisible - contornoExacto) > 0.05 ? (
              <button
                type="button"
                onClick={() => onChange({ ...input, contorno: contornoExacto, contornoScad: undefined })}
                className="mt-0.5 self-start rounded text-[10px] font-extrabold leading-tight text-gold-2 underline decoration-gold/50 underline-offset-2 transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/30"
              >
                Usar calculado: {fmt(contornoExacto)}
              </button>
            ) : null}
          </div>
        </PasoFormulario>
        <PasoFormulario numero={4} titulo="Ajustes finales" columnas={4} ultimo>
          <div className="col-span-4 grid grid-cols-4 gap-2 rounded-xl border border-line bg-surface-2/55 p-2">
            <CampoSelect label="Distribución de ollaos" span={2} value={input.modoOllaos} opciones={MODOS_OLLAOS}
              onChange={(v) => set("modoOllaos", v as LonaInput["modoOllaos"])} />
            {input.modoOllaos === "REPARTIDOS" ? (
              <>
              <CampoNum label="Paso" value={input.pasoOllaos} onChange={(v) => set("pasoOllaos", v)} />
              <CampoNum label="Primer ollao" value={input.primerOllao ?? DEFAULT_PARAMS.primerOllao}
                onChange={(v) => set("primerOllao", v)} />
              </>
            ) : (
              <p className="col-span-2 self-end rounded-lg border border-gold/25 bg-gold/8 px-2.5 py-2 text-[10px] font-semibold leading-4 text-ink-2">
                Introduce las posiciones exactas en el apartado de ollaos del resultado.
              </p>
            )}
          </div>
          <div className="col-span-2">
            <CampoCheck label="Ventana" value={input.ventana} onChange={(v) => set("ventana", v)} />
          </div>
          <div className="col-span-2">
            <CampoCheck label="Rotulación" value={input.rotulacion} onChange={(v) => set("rotulacion", v)} />
          </div>
        </PasoFormulario>
      </div>
    </div>
  );
}
