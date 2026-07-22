"use client";
import type { ReactNode } from "react";
import type { BaquetonInput } from "@/lib/calc/baqueton";
import type { Material } from "@/lib/calc/materiales-seed";
import { DEFAULT_PARAMS, type CalcParams } from "@/lib/calc/params";
import { CampoCheck, CampoMaterial, CampoNum, CampoSelect, CampoTexto, Grupo, PasoFormulario } from "@/components/workspace/campos";
import { MODOS_OLLAOS, opcionesConEtiqueta, TECNICOS } from "@/components/workspace/opciones-formulario";

export function FormularioBaqueton({
  input, materiales, params, onChange, rpsPanel,
}: {
  input: BaquetonInput; materiales: Material[]; params?: CalcParams; onChange: (i: BaquetonInput) => void;
  rpsPanel?: ReactNode;
}) {
  const CLIENTES = opcionesConEtiqueta((params ?? DEFAULT_PARAMS).clientesBaqueton.map((c) => c.nombre));
  const set = <K extends keyof BaquetonInput>(k: K, v: BaquetonInput[K]) => onChange({ ...input, [k]: v });
  const setCab = (k: keyof BaquetonInput["cabecera"], v: string) =>
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
        <PasoFormulario numero={1} titulo="Medidas · cm" columnas={4}>
          <CampoNum label="Cantidad" value={input.cantidad} onChange={(v) => set("cantidad", v)} />
          <CampoNum label="Largo" value={input.largo} onChange={(v) => set("largo", v)} />
          <CampoNum label="Ancho" value={input.ancho} onChange={(v) => set("ancho", v)} />
          <CampoNum label="Baquetón" value={input.baqueton} onChange={(v) => set("baqueton", v)} />
        </PasoFormulario>
        <PasoFormulario numero={2} titulo="Ajustes finales" columnas={4} ultimo>
          <CampoSelect label="Cliente específico" span={2} value={input.clienteEspecifico} opciones={CLIENTES}
            onChange={(v) => set("clienteEspecifico", v)} />
          <CampoMaterial compacto span={2} value={input.material} opciones={materiales}
            onChange={(v) => set("material", v)} />
          <div className="col-span-4 grid grid-cols-4 gap-2 rounded-xl border border-line bg-surface-2/55 p-2">
            <CampoSelect label="Distribución de ollaos" span={2} value={input.modoOllaos} opciones={MODOS_OLLAOS}
              onChange={(v) => set("modoOllaos", v as BaquetonInput["modoOllaos"])} />
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
            <CampoCheck label="Rotulación" value={input.rotulacion} onChange={(v) => set("rotulacion", v)} />
          </div>
        </PasoFormulario>
      </div>
    </div>
  );
}
