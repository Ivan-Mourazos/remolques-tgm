"use client";
import type { LonaInput } from "@/lib/calc/lona";
import type { Material } from "@/lib/calc/materiales-seed";
import { DEFAULT_PARAMS, TIPOS_PERFIL, type CalcParams } from "@/lib/calc/params";
import { CampoCheck, CampoMaterial, CampoNum, CampoSelect, CampoTexto, Grupo, PosicionesManuales } from "@/components/workspace/campos";

export function FormularioLona({
  input, materiales, params, onChange,
}: {
  input: LonaInput; materiales: Material[]; params?: CalcParams; onChange: (i: LonaInput) => void;
}) {
  const RECOGIDAS = (params ?? DEFAULT_PARAMS).recogidas.map((r) => r.nombre);
  const set = <K extends keyof LonaInput>(k: K, v: LonaInput[K]) => onChange({ ...input, [k]: v });
  const setCab = (k: keyof LonaInput["cabecera"], v: string) =>
    onChange({ ...input, cabecera: { ...input.cabecera, [k]: v } });

  return (
    <div className="flex flex-col gap-3">
      <Grupo titulo="Pedido">
        <CampoTexto label="Nº pedido" value={input.cabecera.numeroPedido} onChange={(v) => setCab("numeroPedido", v)} />
        <CampoTexto label="Versión" value={input.cabecera.version} onChange={(v) => setCab("version", v)} />
        <CampoTexto label="Cliente" ancho value={input.cabecera.cliente} onChange={(v) => setCab("cliente", v)} />
        <CampoTexto label="Revisión" value={input.cabecera.revision} onChange={(v) => setCab("revision", v)} />
        <CampoTexto label="Realizado por" value={input.cabecera.realizadoPor} onChange={(v) => setCab("realizadoPor", v)} />
      </Grupo>
      <Grupo titulo="Medidas (cm)">
        <CampoNum label="Cantidad" value={input.cantidad} onChange={(v) => set("cantidad", v)} />
        <CampoNum label="Largo" value={input.largo} onChange={(v) => set("largo", v)} />
        <CampoNum label="Ancho" value={input.ancho} onChange={(v) => set("ancho", v)} />
        <CampoNum label="Alto delante" value={input.altoDelante} onChange={(v) => set("altoDelante", v)} />
        <CampoNum label="Alto detrás" value={input.altoAtras} onChange={(v) => set("altoAtras", v)} />
        <CampoNum label="Aguas" value={input.aguas ?? 0} onChange={(v) => set("aguas", v)} />
        <CampoNum label="Contorno SCAD" value={input.contornoScad} onChange={(v) => set("contornoScad", v)} />
        <CampoCheck label="Lleva curva (+1,5 al contorno)" value={input.llevaCurva} onChange={(v) => set("llevaCurva", v)} />
      </Grupo>
      <Grupo titulo="Configuración">
        <CampoSelect label="Perfil" value={input.tipoPerfil} opciones={[...TIPOS_PERFIL]}
          onChange={(v) => set("tipoPerfil", v as LonaInput["tipoPerfil"])} />
        <CampoSelect label="Recoge delante" value={input.recogeDelante} opciones={RECOGIDAS}
          onChange={(v) => set("recogeDelante", v)} />
        <CampoSelect label="Recoge atrás" value={input.recogeAtras} opciones={RECOGIDAS}
          onChange={(v) => set("recogeAtras", v)} />
        <CampoCheck label="Bastilla de enfundar" value={input.bastillaEnfundar} onChange={(v) => set("bastillaEnfundar", v)} />
        <CampoCheck label="Ventana" value={input.ventana} onChange={(v) => set("ventana", v)} />
        <CampoCheck label="Rotulación" value={input.rotulacion} onChange={(v) => set("rotulacion", v)} />
        {input.rotulacion && (
          <CampoTexto label="Texto rotulación" ancho value={input.textoRotulacion} onChange={(v) => set("textoRotulacion", v)} />
        )}
      </Grupo>
      <Grupo titulo="Ollaos">
        <CampoSelect label="Modo" value={input.modoOllaos} opciones={["REPARTIDOS", "SEGUN SE INDICA"]}
          onChange={(v) => set("modoOllaos", v as LonaInput["modoOllaos"])} />
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
      </Grupo>
      <Grupo titulo="Material y observaciones">
        <CampoMaterial value={input.material} opciones={materiales}
          onChange={(v) => set("material", v)} />
        <CampoTexto label="Observaciones" ancho value={input.observaciones} onChange={(v) => set("observaciones", v)} />
      </Grupo>
    </div>
  );
}
