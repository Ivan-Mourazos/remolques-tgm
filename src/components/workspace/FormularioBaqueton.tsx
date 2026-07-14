"use client";
import type { BaquetonInput } from "@/lib/calc/baqueton";
import type { Material } from "@/lib/calc/materiales-seed";
import { DEFAULT_PARAMS, type CalcParams } from "@/lib/calc/params";
import { CampoCheck, CampoMaterial, CampoNum, CampoSelect, CampoTexto, Grupo, PosicionesManuales } from "@/components/workspace/campos";

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
    <div className="flex flex-col gap-3">
      <Grupo titulo="Pedido">
        <CampoTexto label="Nº pedido" value={input.cabecera.numeroPedido} onChange={(v) => setCab("numeroPedido", v)} />
        <CampoTexto label="O.F." value={input.cabecera.ordenFabricacion ?? ""} onChange={(v) => setCab("ordenFabricacion", v)} />
        <CampoTexto label="Cliente" ancho value={input.cabecera.cliente} onChange={(v) => setCab("cliente", v)} />
        <CampoSelect label="Cliente específico" ancho value={input.clienteEspecifico} opciones={CLIENTES}
          onChange={(v) => set("clienteEspecifico", v)} />
        <CampoTexto label="Revisión" value={input.cabecera.revision} onChange={(v) => setCab("revision", v)} />
        <CampoTexto label="Realizado por" ancho value={input.cabecera.realizadoPor} onChange={(v) => setCab("realizadoPor", v)} />
      </Grupo>
      <Grupo titulo="Medidas (cm)">
        <CampoNum label="Cantidad" value={input.cantidad} onChange={(v) => set("cantidad", v)} />
        <CampoNum label="Largo" value={input.largo} onChange={(v) => set("largo", v)} />
        <CampoNum label="Ancho" value={input.ancho} onChange={(v) => set("ancho", v)} />
        <CampoNum label="Baquetón" value={input.baqueton} onChange={(v) => set("baqueton", v)} />
      </Grupo>
      <Grupo titulo="Ollaos y rotulación">
        <CampoSelect label="Modo ollaos" value={input.modoOllaos} opciones={["REPARTIDOS", "SEGUN SE INDICA"]}
          onChange={(v) => set("modoOllaos", v as BaquetonInput["modoOllaos"])} />
        <CampoNum label="Paso" value={input.pasoOllaos} onChange={(v) => set("pasoOllaos", v)} />
        {input.modoOllaos === "SEGUN SE INDICA" && (
          <>
            <PosicionesManuales label="Laterales (atrás→delante)" valores={input.ollaosManuales.laterales}
              onChange={(v) => set("ollaosManuales", { ...input.ollaosManuales, laterales: v })} />
            <PosicionesManuales label="Atrás (izq→dcha)" valores={input.ollaosManuales.atras}
              onChange={(v) => set("ollaosManuales", { ...input.ollaosManuales, atras: v })} />
            <PosicionesManuales label="Delante (izq→dcha)" valores={input.ollaosManuales.delante}
              onChange={(v) => set("ollaosManuales", { ...input.ollaosManuales, delante: v })} />
          </>
        )}
        <CampoCheck label="Rotulación" value={input.rotulacion} onChange={(v) => set("rotulacion", v)} />
        {input.rotulacion && (
          <CampoTexto label="Texto rotulación" ancho value={input.textoRotulacion} onChange={(v) => set("textoRotulacion", v)} />
        )}
      </Grupo>
      <Grupo titulo="Material y observaciones">
        <CampoMaterial value={input.material} opciones={materiales}
          onChange={(v) => set("material", v)} />
        <CampoTexto label="Observaciones" ancho value={input.observaciones} onChange={(v) => set("observaciones", v)} />
      </Grupo>
    </div>
  );
}
