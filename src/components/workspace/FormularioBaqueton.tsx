"use client";
import type { BaquetonInput } from "@/lib/calc/baqueton";
import type { Material } from "@/lib/calc/materiales-seed";
import { DEFAULT_PARAMS, type CalcParams } from "@/lib/calc/params";
import { CampoCheck, CampoMaterial, CampoNum, CampoSelect, CampoTexto, Grupo, PasoFormulario } from "@/components/workspace/campos";

export function FormularioBaqueton({
  input, materiales, params, onChange,
}: {
  input: BaquetonInput; materiales: Material[]; params?: CalcParams; onChange: (i: BaquetonInput) => void;
}) {
  const CLIENTES = (params ?? DEFAULT_PARAMS).clientesBaqueton.map((c) => c.nombre);
  const set = <K extends keyof BaquetonInput>(k: K, v: BaquetonInput[K]) => onChange({ ...input, [k]: v });
  const setCab = (k: keyof BaquetonInput["cabecera"], v: string) =>
    onChange({ ...input, cabecera: { ...input.cabecera, [k]: v } });

  return (
    <div className="flex flex-col gap-2.5">
      <Grupo titulo="Pedido" columnas={3} compacto>
        <CampoTexto label="Nº pedido" value={input.cabecera.numeroPedido} onChange={(v) => setCab("numeroPedido", v)} />
        <CampoTexto label="O.F." value={input.cabecera.ordenFabricacion ?? ""} onChange={(v) => setCab("ordenFabricacion", v)} />
        <CampoTexto label="Realizado por" value={input.cabecera.realizadoPor} onChange={(v) => setCab("realizadoPor", v)} />
        <CampoTexto label="Cliente" span={2} value={input.cabecera.cliente} onChange={(v) => setCab("cliente", v)} />
        <CampoTexto label="Revisión" value={input.cabecera.revision} onChange={(v) => setCab("revision", v)} />
      </Grupo>
      <div className="space-y-2 rounded-2xl border border-[#d4dfdb] bg-[#fbfcfb]/95 p-2.5 shadow-[0_12px_32px_rgb(14_45_49/0.055)] backdrop-blur-sm">
        <PasoFormulario numero={1} titulo="Medidas · cm" columnas={4}>
          <CampoNum label="Cantidad" value={input.cantidad} onChange={(v) => set("cantidad", v)} />
          <CampoNum label="Largo" value={input.largo} onChange={(v) => set("largo", v)} />
          <CampoNum label="Ancho" value={input.ancho} onChange={(v) => set("ancho", v)} />
          <CampoNum label="Baquetón" value={input.baqueton} onChange={(v) => set("baqueton", v)} />
        </PasoFormulario>
        <PasoFormulario numero={2} titulo="Ajustes finales" ultimo>
          <CampoSelect label="Cliente específico" span={2} value={input.clienteEspecifico} opciones={CLIENTES}
            onChange={(v) => set("clienteEspecifico", v)} />
          <CampoMaterial compacto span={1} value={input.material} opciones={materiales}
            onChange={(v) => set("material", v)} />
          <CampoSelect label="Ollaos" value={input.modoOllaos} opciones={["REPARTIDOS", "SEGUN SE INDICA"]}
            onChange={(v) => set("modoOllaos", v as BaquetonInput["modoOllaos"])} />
          <CampoNum label="Paso" value={input.pasoOllaos} onChange={(v) => set("pasoOllaos", v)} />
          <CampoCheck label="Rotulación" value={input.rotulacion} onChange={(v) => set("rotulacion", v)} />
          {input.rotulacion && (
            <CampoTexto label="Texto rotulación" span={3} value={input.textoRotulacion} onChange={(v) => set("textoRotulacion", v)} />
          )}
        </PasoFormulario>
      </div>
    </div>
  );
}
