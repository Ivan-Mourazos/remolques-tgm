"use client";
import { FormularioLona } from "@/components/workspace/FormularioLona";
import { FormularioBaqueton } from "@/components/workspace/FormularioBaqueton";
import { ResultadosLona, ResultadosBaqueton } from "@/components/workspace/Resultados";
import { Escena3D } from "@/components/workspace/Escena3D";
import { ImportadorRps } from "@/components/workspace/ImportadorRps";
import { PedidoActivo } from "@/components/workspace/PedidoActivo";
import { useWorkspace } from "@/components/workspace/useWorkspace";
import { nombreLinea } from "@/lib/workspace/lineas";
import type { EntradaInicial } from "@/lib/workspace/estado";

export type WorkspaceInicial = EntradaInicial;

export function Workspace({ inicial }: { inicial?: WorkspaceInicial }) {
  const ws = useWorkspace(inicial);
  const {
    lineas, versionActiva,
    numeroPedido, cliente: clientePedido, cargandoPedido,
    rps, accion,
  } = ws.estado;
  const {
    materiales, params, lineaActiva, estadosLinea, lona, baq, resLona, resBaq,
    erroresVisibles, medidasSuficientes,
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
      onAplicar={(linea) => {
        if (pedidoRpsVisible) ws.aplicarPedidoRps(pedidoRpsVisible, linea);
      }}
      onReintentar={ws.reintentarRps}
    />
  );

  return (
    <div className="space-y-3">
      <PedidoActivo
        numeroPedido={numeroPedido}
        cliente={clientePedido}
        lineas={lineas}
        estadosLinea={estadosLinea}
        versionActiva={versionActiva}
        cargando={cargandoPedido}
        rpsPanel={panelRps}
        accion={accion}
        progresoPdf={ws.progresoPdf}
        errorPedido={erroresVisibles.numeroPedido}
        onNumeroPedidoChange={ws.cambiarNumeroPedido}
        onClienteChange={ws.cambiarClientePedido}
        onSeleccionar={ws.seleccionarLinea}
        onEliminar={ws.eliminarLinea}
        onNuevo={ws.nuevaLinea}
        onPreview={ws.previsualizarPdf}
        onGuardarRevision={ws.guardarParaRevision}
      />

      {lineaActiva ? (
        <div className="grid gap-3 2xl:grid-cols-[500px_minmax(0,1fr)]">
          {/* Lo que se teclee mientras se guarda no llega a la base de datos
              —`guardarTodas` ya se llevó la lista— y al terminar se limpian los
              borradores: el cambio se quedaría solo en memoria. `disabled` en el
              fieldset apaga de una vez todos los controles que contiene, y
              `contents` lo saca del layout para no alterar la rejilla. */}
          <fieldset disabled={accion !== null} className="contents">
          <div>
            <div className="mb-2.5 rounded-xl border border-line bg-surface px-3.5 py-2.5 shadow-sm">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-gold-2">Editando dentro de {numeroPedido}</p>
              <h2 className="mt-0.5 text-[16px] font-extrabold tracking-[-0.025em] text-ink">
                {nombreLinea(lineaActiva)}
              </h2>
            </div>
            {lineaActiva.tipo === "lona" ? (
              <FormularioLona input={lona} materiales={materiales} params={params} errores={erroresVisibles}
                onChange={ws.cambiarInput} onCampoTocado={ws.marcarCampoTocado} />
            ) : (
              <FormularioBaqueton input={baq} materiales={materiales} params={params} errores={erroresVisibles}
                onChange={ws.cambiarInput} onCampoTocado={ws.marcarCampoTocado} />
            )}
            {/* Ya no hay guardado por elemento: lo que importa es si la línea
                está lista para que el pedido se pueda completar. */}
            <p className={`mt-2.5 rounded-xl px-4 py-2.5 text-center text-[12px] font-extrabold ${
              estadosLinea[lineaActiva.version]?.lista
                ? "bg-deep/8 text-deep"
                : "bg-gold/12 text-gold-2"
            }`}>
              {estadosLinea[lineaActiva.version]?.lista
                ? "Listo. Se guardará al completar el pedido."
                : `Falta: ${estadosLinea[lineaActiva.version]?.falta}`}
            </p>
          </div>
          <div className="flex flex-col gap-4">
            {lineaActiva.tipo === "lona" ? (
              <Escena3D modo="lona" largo={lona.largo} ancho={lona.ancho} anchoAtras={lona.anchoAtras}
                altoDelante={lona.altoDelante} altoAtras={lona.altoAtras}
                aguas={lona.aguas} radioCumbrera={lona.radioCumbrera} radioHombro={lona.radioHombro}
                radioEsquina={lona.radioEsquina} chaflan={lona.chaflan}
                radioChaflanAbajo={lona.radioChaflanAbajo} radioChaflanArriba={lona.radioChaflanArriba}
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
            {medidasSuficientes && lineaActiva.tipo === "lona"
              ? <ResultadosLona
                  res={resLona}
                  modoOllaos={lona.modoOllaos}
                  primerOllao={lona.primerOllao ?? params.primerOllao}
                  errorOllaos={erroresVisibles.ollaosManuales}
                  onOllaosChange={(ollaosManuales) => ws.cambiarInput({ ...lona, ollaosManuales })}
                />
              : medidasSuficientes && lineaActiva.tipo === "baqueton" ? <ResultadosBaqueton
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
          </fieldset>
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
