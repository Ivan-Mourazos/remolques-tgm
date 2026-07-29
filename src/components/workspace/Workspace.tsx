"use client";
import { FormularioLona } from "@/components/workspace/FormularioLona";
import { FormularioBaqueton } from "@/components/workspace/FormularioBaqueton";
import { ResultadosLona, ResultadosBaqueton } from "@/components/workspace/Resultados";
import { Escena3D } from "@/components/workspace/Escena3D";
import { ImportadorRps } from "@/components/workspace/ImportadorRps";
import { PedidoActivo } from "@/components/workspace/PedidoActivo";
import { useWorkspace } from "@/components/workspace/useWorkspace";
import { nombreElementoPedido } from "@/lib/pedidos/agrupar-pedido";
import type { EntradaInicial } from "@/lib/workspace/estado";

export type WorkspaceInicial = EntradaInicial;

export function Workspace({ inicial }: { inicial?: WorkspaceInicial }) {
  const ws = useWorkspace(inicial);
  const {
    tipo, lona, baqueton: baq, id, editorActivo,
    numeroPedido, cliente: clientePedido, registros: registrosPedido, cargandoPedido,
    rps, accion,
  } = ws.estado;
  const {
    materiales, params, input, resLona, resBaq, hayCambiosSinGuardar,
    erroresVisibles, medidasSuficientes, busy,
    pedidoRpsVisible, origenRpsActivo, estadoRpsVisible,
  } = ws;

  const panelRps = (
    <ImportadorRps
      estado={estadoRpsVisible}
      pedido={pedidoRpsVisible}
      error={rps.error}
      origen={origenRpsActivo}
      materialAplicado={ws.materialRpsAplicado}
      abierto={rps.selectorAbierto}
      onAbrir={ws.abrirSelectorRps}
      onAplicar={async (linea) => {
        if (pedidoRpsVisible && (
          origenRpsActivo?.idLinea === linea.idLinea || await ws.puedeCambiarElemento()
        )) ws.aplicarPedidoRps(pedidoRpsVisible, linea);
      }}
      onReintentar={ws.reintentarRps}
    />
  );

  return (
    <div className="space-y-3">
      <PedidoActivo
        numeroPedido={numeroPedido}
        cliente={clientePedido}
        registros={registrosPedido}
        cargando={cargandoPedido}
        idActivo={id}
        borrador={editorActivo && !id ? { tipo, version: input.cabecera.version } : undefined}
        rpsPanel={panelRps}
        accion={accion}
        errorPedido={erroresVisibles.numeroPedido}
        onNumeroPedidoChange={ws.cambiarNumeroPedido}
        onClienteChange={ws.cambiarClientePedido}
        onSeleccionar={ws.seleccionarRegistro}
        onNuevo={ws.nuevoElemento}
        onPreview={ws.previsualizarPdf}
        onGenerar={ws.generarPdf}
      />

      {editorActivo ? (
        <div className="grid gap-3 2xl:grid-cols-[500px_minmax(0,1fr)]">
          <div>
            <div className="mb-2.5 flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5 shadow-sm">
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-gold-2">Editando dentro de {numeroPedido}</p>
                <h2 className="mt-0.5 text-[16px] font-extrabold tracking-[-0.025em] text-ink">
                  {nombreElementoPedido(input.cabecera.version, tipo)}
                </h2>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide ${hayCambiosSinGuardar ? "bg-gold/12 text-gold-2" : "bg-deep/8 text-deep"}`}>
                {hayCambiosSinGuardar ? "Cambios sin guardar" : "Guardado"}
              </span>
            </div>
            {tipo === "lona" ? (
              <FormularioLona input={lona} materiales={materiales} params={params} errores={erroresVisibles}
                onChange={ws.cambiarInput} />
            ) : (
              <FormularioBaqueton input={baq} materiales={materiales} params={params} errores={erroresVisibles}
                onChange={ws.cambiarInput} />
            )}
            <button
              onClick={ws.guardar}
              disabled={busy}
              className="mt-2.5 w-full rounded-xl bg-deep px-4 py-2.5 text-[13px] font-extrabold text-white shadow-[0_7px_20px_rgb(9_39_44/0.20)] transition-[transform,background-color,box-shadow] hover:-translate-y-px hover:bg-deep-2 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-deep-2/20 disabled:cursor-wait disabled:opacity-50"
            >
              {accion === "guardar" ? "Guardando…" : `Guardar ${nombreElementoPedido(input.cabecera.version, tipo).toLocaleLowerCase("es-ES")}`}
            </button>
          </div>
          <div className="flex flex-col gap-4">
            {tipo === "lona" ? (
              <Escena3D modo="lona" largo={lona.largo} ancho={lona.ancho} anchoAtras={lona.anchoAtras}
                altoDelante={lona.altoDelante} altoAtras={lona.altoAtras}
                aguas={lona.aguas} radioCumbrera={lona.radioCumbrera} radioHombro={lona.radioHombro}
                radioEsquina={lona.radioEsquina} chaflan={lona.chaflan}
                ollaos={resLona.reparto}
                recogeDelante={lona.recogeDelante} recogeAtras={lona.recogeAtras}
                bastillaEnfundar={lona.bastillaEnfundar}
                tipoPerfil={lona.tipoPerfil} ventana={lona.ventana}
                ventanaAncho={lona.ventanaAncho} ventanaAlto={lona.ventanaAlto}
                material={lona.material}
                observaciones={lona.observaciones}
                onObservacionesChange={(observaciones) => ws.cambiarInput({ ...lona, observaciones })}
                onSnapshotReady={ws.registrarSnapshot} />
            ) : (
              <Escena3D modo="baqueton" largo={baq.largo} ancho={baq.ancho}
                altoDelante={0} altoAtras={0} tipoPerfil="TIPO 01"
                baqueton={baq.baqueton} material={baq.material}
                ollaos={resBaq.reparto}
                observaciones={baq.observaciones}
                onObservacionesChange={(observaciones) => ws.cambiarInput({ ...baq, observaciones })}
                onSnapshotReady={ws.registrarSnapshot} />
            )}
            {medidasSuficientes && tipo === "lona"
              ? <ResultadosLona
                  res={resLona}
                  modoOllaos={lona.modoOllaos}
                  primerOllao={lona.primerOllao ?? params.primerOllao}
                  errorOllaos={erroresVisibles.ollaosManuales}
                  onOllaosChange={(ollaosManuales) => ws.cambiarInput({ ...lona, ollaosManuales })}
                />
              : medidasSuficientes && tipo === "baqueton" ? <ResultadosBaqueton
                  res={resBaq}
                  modoOllaos={baq.modoOllaos}
                  primerOllao={baq.primerOllao ?? params.primerOllao}
                  errorOllaos={erroresVisibles.ollaosManuales}
                  onOllaosChange={(ollaosManuales) => ws.cambiarInput({ ...baq, ollaosManuales })}
                /> : (
                  <div className="rounded-xl border border-dashed border-line-2 bg-surface/65 px-4 py-5 text-center text-xs font-semibold text-muted">
                    Completa las medidas necesarias para calcular los paños y el reparto de ollaos.
                  </div>
                )}
          </div>
        </div>
      ) : (
        <section className="grid min-h-[210px] place-items-center rounded-[22px] border border-dashed border-line-2 bg-surface/55 p-6 text-center shadow-inner">
          <div className="max-w-md">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-gold/25 bg-gold/10 text-[24px] font-light text-gold-2">+</div>
            <h2 className="mt-3 text-xl font-extrabold tracking-[-0.035em] text-ink">
              {numeroPedido.trim() ? "Añade el primer elemento del pedido" : "Abre un pedido para empezar"}
            </h2>
            <p className="mt-1.5 text-sm font-medium leading-6 text-muted">
              {numeroPedido.trim()
                ? "Usa los botones Añadir remolque o Añadir baquetón. Cada uno quedará visible dentro de este pedido."
                : "Introduce arriba el número de pedido. Si existe en RPS, cargaremos sus líneas automáticamente."}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
