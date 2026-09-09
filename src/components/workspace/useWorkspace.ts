"use client";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { calcLona, type LonaInput } from "@/lib/calc/lona";
import { calcBaqueton, type BaquetonInput } from "@/lib/calc/baqueton";
import type { Material } from "@/lib/calc/materiales-seed";
import type { PlanteamientoRecord, TipoPlanteamiento } from "@/lib/store/types";
import { rasterizarSvg } from "@/lib/svg/rasterizar";
import { orquestarPdf } from "@/lib/pdf/orquestar-pdf";
import { SALIDA_MONOCROMA } from "@/lib/pdf/salida";
import { emptyLona, emptyBaqueton } from "@/components/workspace/entradas-vacias";
import { crearInputDesdeRps } from "@/lib/rps/aplicar-linea";
import { materialPreferidoRps } from "@/lib/rps/material-rps";
import { normalizarNumeroPedidoRps } from "@/lib/rps/numero-pedido";
import type { LineaPedidoRps, PedidoRps } from "@/lib/rps/types";
import { erroresPlanteamiento } from "@/lib/pedidos/validar-planteamiento";
import { estadoInicial, reducirWorkspace, type EntradaInicial } from "@/lib/workspace/estado";
import {
  guardarBorradores, leerBorradores, limpiarBorradores,
} from "@/lib/workspace/borradores-locales";
import {
  estadoLinea, nombreLinea, siguienteVersion, type LineaPedido,
} from "@/lib/workspace/lineas";
import { impedimentosCompletar, mensajeImpedimentos } from "@/lib/workspace/completar-pedido";
import {
  erroresVisibles as calcularErroresVisibles,
  estadoRpsVisible as calcularEstadoRpsVisible,
  lineaActiva as calcularLineaActiva,
  medidasSuficientes as calcularMedidasSuficientes,
  origenRpsActivo as calcularOrigenRpsActivo,
  pedidoRpsVisible as calcularPedidoRpsVisible,
} from "@/lib/workspace/selectores";
import { useAvisos, useConfirmar } from "@/components/feedback/useFeedback";
import { useCatalogos } from "@/components/workspace/useCatalogos";
import { useRegistrosPedido } from "@/components/workspace/useRegistrosPedido";
import { useConsultaRps } from "@/components/workspace/useConsultaRps";

/** Pausa sin cambios tras la que se escriben los borradores en el navegador. */
const PAUSA_GUARDADO_MS = 600;

/**
 * Toda la lógica del workspace: estado, efectos, derivados y manejadores.
 * `Workspace.tsx` se limita a pintar lo que este hook devuelve.
 */
export function useWorkspace(inicial?: EntradaInicial) {
  const [estado, despachar] = useReducer(
    reducirWorkspace,
    undefined,
    () => estadoInicial(inicial),
  );
  const {
    numeroPedido, cliente: clientePedido, lineas, versionActiva,
    validacionIntentada, camposTocados, rps, accion, cargandoPedido,
  } = estado;
  const { materiales, params, materialesRef, setMateriales } = useCatalogos();
  const avisar = useAvisos();
  const confirmar = useConfirmar();
  const busy = accion !== null;
  const snapshotRef = useRef<(() => string | null) | null>(null);
  const reiniciarGuardaRps = useRef<(() => void) | null>(null);
  const almacen = typeof window === "undefined" ? null : window.localStorage;
  // Un pedido cuyos borradores ya se recuperaron; evita recuperarlos otra vez
  // por encima de lo que el usuario esté escribiendo.
  const recuperados = useRef<string>("");
  // Lo mismo, pero en estado: la persistencia no puede escribir hasta que la
  // recuperación de ese pedido haya aterrizado en el reducer. Con la ref no
  // valdría —cambia dentro del mismo commit— y el primer efecto correría con
  // `lineas` vacío, borrando la clave justo antes de recuperarla.
  const [pedidoRecuperado, setPedidoRecuperado] = useState<string>("");
  const avisoBorradores = useRef(false);
  // Escritura en cola: al completar el pedido hay que cancelarla, o dejaría
  // otra vez el borrador que se acaba de limpiar.
  const guardadoPendiente = useRef<number | null>(null);
  // Lo que esa escritura en cola va a escribir. La pausa abre tres agujeros por
  // los que lo tecleado no llegaría nunca al navegador —navegar a otra página,
  // cambiar de pedido y cerrar la pestaña—, así que se guarda aparte para poder
  // volcarlo de inmediato en los tres casos.
  const pendienteRef = useRef<{
    numeroPedido: string;
    lineas: LineaPedido[];
    versionActiva: string | null;
  } | null>(null);
  const clavePedido = normalizarNumeroPedidoRps(numeroPedido);
  // Presentación efímera de una acción en curso: no es estado del
  // planteamiento, así que no entra en el reducer.
  const [progresoPdf, setProgresoPdf] = useState<{ hecho: number; total: number } | null>(null);

  /**
   * Escribe ya lo que la pausa tenía en cola. Es idempotente: vacía
   * `pendienteRef` al escribir, así que llamarla dos veces no escribe dos veces.
   * Lee del ref, no de un closure, así que quien la llame no se rancia.
   */
  const volcar = useCallback(() => {
    const pendiente = pendienteRef.current;
    if (!pendiente) return;
    pendienteRef.current = null;
    guardarBorradores(
      almacen, pendiente.numeroPedido, pendiente.lineas, pendiente.versionActiva,
      new Date().toISOString(),
    );
  }, [almacen]);

  useEffect(() => {
    if (recuperados.current === clavePedido) return;
    recuperados.current = clavePedido;
    // Con el campo del número vacío no hay nada que recuperar, pero sí que
    // reiniciar el rastro: si no volviera a "", vaciar el campo de una vez y
    // reescribir el mismo número saltaría la recuperación y en cambio sí
    // correría la persistencia, con cero líneas, retirando la clave. El
    // borrador entero desaparecería sin aviso.
    const guardado = clavePedido
      ? leerBorradores(almacen, numeroPedido)
      : { lineas: [], versionActiva: null };
    if (guardado.lineas.length > 0) {
      despachar({ tipo: "BORRADORES_RECUPERADOS", lineas: guardado.lineas });
      // Quien cerró la pestaña editando la cuarta línea vuelve a la cuarta, no
      // a la primera. Si ya hay una línea abierta manda esa: los borradores
      // llegan de un efecto y no deben mover al usuario de sitio.
      if (guardado.versionActiva && !versionActiva) {
        despachar({ tipo: "LINEA_SELECCIONADA", version: guardado.versionActiva });
      }
    }
    setPedidoRecuperado(clavePedido);
    // `versionActiva` está en las dependencias por corrección, pero la guarda
    // de arriba hace que sus cambios no repitan la recuperación.
  }, [almacen, clavePedido, numeroPedido, versionActiva]);

  useEffect(() => {
    // Cambiar de pedido vacía las líneas y cambia el número en la misma acción:
    // la limpieza de abajo mata el temporizador del pedido anterior y nadie lo
    // reprograma, así que lo que quedó en cola se escribe aquí, antes de tocar
    // nada más. Solo si es otro pedido: con la misma clave es una tecla más y
    // la pausa tiene que cumplirse, o volveríamos a serializar en cada pulsación.
    const pendiente = pendienteRef.current;
    if (pendiente && normalizarNumeroPedidoRps(pendiente.numeroPedido) !== clavePedido) {
      volcar();
    }
    if (!clavePedido || pedidoRecuperado !== clavePedido) return;
    // `lineas` cambia de identidad en cada tecla y lleva dentro los SVG de
    // todas las vistas técnicas: serializarlo entero en cada pulsación bloquea
    // el hilo principal. Una pausa basta, porque lo que importa es que el
    // trabajo esté escrito antes de cerrar la pestaña, no en el mismo instante.
    pendienteRef.current = { numeroPedido, lineas, versionActiva };
    const temporizador = window.setTimeout(() => {
      guardadoPendiente.current = null;
      const guardado = guardarBorradores(
        almacen, numeroPedido, lineas, versionActiva, new Date().toISOString(),
      );
      pendienteRef.current = null;
      // Si el navegador no deja escribir —ni siquiera haciendo sitio— el
      // trabajo solo vive en memoria y hay que decirlo: es exactamente lo que
      // este bloque prometía evitar.
      if (!guardado && lineas.length > 0 && !avisoBorradores.current) {
        avisoBorradores.current = true;
        avisar("error", "No se han podido guardar los borradores en este navegador: no cierres la pestaña sin completar el pedido.");
      }
    }, PAUSA_GUARDADO_MS);
    guardadoPendiente.current = temporizador;
    return () => {
      window.clearTimeout(temporizador);
      // El ref solo apunta a temporizadores vivos; este ya no lo está. Lo que
      // el temporizador iba a escribir sigue en `pendienteRef`, esperando a que
      // lo vuelque quien corresponda.
      guardadoPendiente.current = null;
    };
  }, [
    almacen, avisar, clavePedido, lineas, numeroPedido, pedidoRecuperado,
    versionActiva, volcar,
  ]);

  // Navegar a /historial o /parámetros desmonta el workspace y con él el
  // temporizador: sin esto, lo tecleado en los últimos 600 ms se perdería.
  useEffect(() => () => volcar(), [volcar]);

  // React no ejecuta limpiezas al cerrar la pestaña. `pagehide` y no
  // `beforeunload`: el segundo no se dispara de forma fiable en móvil ni al
  // descargar la página hacia la caché de retroceso.
  useEffect(() => {
    window.addEventListener("pagehide", volcar);
    return () => window.removeEventListener("pagehide", volcar);
  }, [volcar]);

  const activa = useMemo(() => calcularLineaActiva(estado), [estado]);
  const input = activa?.input ?? null;
  const tipo = activa?.tipo ?? "lona";
  // Cuando la línea abierta es del otro tipo, el respaldo vacío solo sirve para
  // que los `useMemo` de abajo reciban un objeto de la forma correcta; la
  // escena y el formulario de ese tipo no se pintan. Va memoizado para no
  // rehacer el cálculo entero en cada render por un objeto que nadie mira.
  const lona = useMemo(
    () => (activa?.tipo === "lona" ? activa.input : emptyLona()) as LonaInput,
    [activa],
  );
  const baq = useMemo(
    () => (activa?.tipo === "baqueton" ? activa.input : emptyBaqueton()) as BaquetonInput,
    [activa],
  );
  const resLona = useMemo(() => calcLona(lona, params), [lona, params]);
  const resBaq = useMemo(() => calcBaqueton(baq, params), [baq, params]);
  const erroresActuales = useMemo(
    () => (input ? erroresPlanteamiento(input) : []),
    [input],
  );
  const erroresVisibles = calcularErroresVisibles(erroresActuales, validacionIntentada, camposTocados);
  const medidasSuficientes = input ? calcularMedidasSuficientes(input) : false;
  const estadosLinea = useMemo(
    () => Object.fromEntries(lineas.map((linea) => [linea.version, estadoLinea(linea)])),
    [lineas],
  );

  /** Un campo abandonado ya puede enseñar su error, sin esperar a completar. */
  const marcarCampoTocado = useCallback(
    (campo: string) => despachar({ tipo: "CAMPO_TOCADO", campo }),
    [],
  );

  /**
   * Serializar la escena no es gratis: quien necesite el dibujo dos veces —una
   * para el estado y otra para la lista que se manda al PDF— lo lee una vez con
   * esto y se lo pasa a las dos.
   */
  const leerSnapshot = useCallback(() => snapshotRef.current?.() ?? null, []);

  /** El dibujo de la línea que se deja se guarda antes de abrir otra. */
  const capturarSnapshot = useCallback((svg: string | null = leerSnapshot()) => {
    if (!versionActiva) return;
    despachar({ tipo: "SNAPSHOT_CAPTURADO", version: versionActiva, svg });
  }, [leerSnapshot, versionActiva]);

  /**
   * `capturarSnapshot` despacha, pero el `lineas` de este render todavía no
   * lleva el dibujo de la línea abierta. Componer la lista a mano evita que
   * esa línea llegue al PDF —o al guardado— sin su vista técnica.
   */
  const lineasConDibujoActual = useCallback((
    svgActual: string | null = leerSnapshot(),
  ): LineaPedido[] => lineas.map((linea) => (linea.version === versionActiva
    ? { ...linea, snapshotSvg: svgActual ?? linea.snapshotSvg }
    : linea)), [leerSnapshot, lineas, versionActiva]);

  const seleccionarLinea = useCallback((version: string) => {
    if (version === versionActiva) return;
    capturarSnapshot();
    despachar({ tipo: "LINEA_SELECCIONADA", version });
  }, [capturarSnapshot, versionActiva]);

  const nuevaLinea = useCallback((nuevoTipo: TipoPlanteamiento) => {
    if (!numeroPedido.trim()) {
      avisar("info", "Introduce primero el número de pedido.");
      return;
    }
    // Con los registros del pedido todavía en vuelo, `lineas` está vacío y la
    // versión que tocaría es la 10: la misma que ya tiene el primer
    // planteamiento guardado. La línea nueva sustituiría a la guardada al
    // fusionar —heredando su id— y completar el pedido la reescribiría.
    if (cargandoPedido) {
      avisar("info", "Espera a que carguen las líneas del pedido.");
      return;
    }
    capturarSnapshot();
    const plantilla = nuevoTipo === "lona" ? emptyLona() : emptyBaqueton();
    const version = siguienteVersion(lineas);
    const linea: LineaPedido = {
      version,
      tipo: nuevoTipo,
      input: {
        ...plantilla,
        cabecera: {
          ...plantilla.cabecera,
          numeroPedido,
          cliente: clientePedido,
          version,
          realizadoPor: input?.cabecera.realizadoPor ?? "",
          revision: input?.cabecera.revision ?? "",
        },
      },
    };
    despachar({ tipo: "LINEA_ANADIDA", linea });
    avisar("info", `${nombreLinea(linea)} añadido al pedido. Completa sus datos.`);
  }, [avisar, capturarSnapshot, cargandoPedido, clientePedido, input, lineas, numeroPedido]);

  const eliminarLinea = useCallback(async (version: string) => {
    // Borrar mientras se completa el pedido deshace el borrado solo: el POST de
    // `guardarTodas` ya lleva la lista de antes y vuelve a crear el registro.
    if (busy) return;
    const linea = lineas.find((item) => item.version === version);
    if (!linea) return;
    const clave = await confirmar({
      titulo: `Eliminar ${nombreLinea(linea)}`,
      mensaje: linea.id
        ? "Se quitará del pedido y se borrará también su planteamiento guardado. No se puede deshacer."
        : "Se quitará del pedido. Todavía no está guardado, así que no queda rastro.",
      acciones: [
        { clave: "eliminar", etiqueta: "Eliminar", tono: "peligro" },
        { clave: "cancelar", etiqueta: "Cancelar", tono: "neutro" },
      ],
    });
    if (clave !== "eliminar") return;
    if (linea.id) {
      const respuesta = await fetch(`/api/planteamientos/${encodeURIComponent(linea.id)}`, {
        method: "DELETE",
      }).catch(() => null);
      if (!respuesta) {
        avisar("error", "Error de red al borrar el planteamiento guardado.");
        return;
      }
      // Un 404 es que ya no estaba: el objetivo se cumple igual.
      if (!respuesta.ok && respuesta.status !== 404) {
        avisar("error", `No se pudo borrar ${nombreLinea(linea)} de la base de datos.`);
        return;
      }
    }
    despachar({ tipo: "LINEA_ELIMINADA", version });
    avisar("exito", `${nombreLinea(linea)} eliminado del pedido.`);
  }, [avisar, busy, confirmar, lineas]);

  const aplicarPedidoRps = useCallback(async (
    pedido: PedidoRps,
    lineaRps: LineaPedidoRps,
    catalogoMateriales: Material[] = materialesRef.current,
  ) => {
    const indice = pedido.lineas.findIndex((item) => item.idLinea === lineaRps.idLinea);
    const creado = crearInputDesdeRps(
      pedido, lineaRps, Math.max(indice, 0), catalogoMateriales, params,
      input?.cabecera.realizadoPor ?? "",
    );
    // La versión la fija `crearInputDesdeRps` a partir del índice de la línea
    // en RPS, así que reimportar la misma línea sustituye la suya y no añade
    // un duplicado. Si ya existe con id, lo conserva.
    const version = creado.input.cabecera.version;
    const existente = lineas.find((item) => item.version === version);
    // Sustituir la línea entera se lleva por delante lo tecleado a mano, y el
    // borrador se reescribe acto seguido: no hay vuelta atrás, así que se
    // pregunta. Reimportar sin cambios no destruye nada y no interrumpe.
    if (existente && JSON.stringify(existente.input) !== JSON.stringify(creado.input)) {
      const clave = await confirmar({
        titulo: `Sobrescribir ${nombreLinea(existente)}`,
        mensaje: "Esta línea ya tiene datos y se sustituirán por los de RPS. Se perderá lo que hayas escrito o corregido a mano. No se puede deshacer.",
        acciones: [
          { clave: "sobrescribir", etiqueta: "Sobrescribir con RPS", tono: "peligro" },
          { clave: "cancelar", etiqueta: "Cancelar", tono: "neutro" },
        ],
      });
      if (clave !== "sobrescribir") return;
    }
    capturarSnapshot();
    despachar({
      tipo: "LINEA_ANADIDA",
      linea: {
        version,
        tipo: creado.tipo,
        input: creado.input,
        id: existente?.id,
        snapshotSvg: null,
        origenRps: {
          numeroPedido: pedido.numero,
          numeroLinea: lineaRps.numeroLinea,
          idLinea: lineaRps.idLinea,
          ordenFabricacion: lineaRps.ordenFabricacion,
          importadoEn: new Date().toISOString(),
        },
      },
    });
    avisar("info", `Línea ${lineaRps.numeroLinea} de RPS aplicada. Todos los campos siguen siendo editables.`);
  }, [avisar, capturarSnapshot, confirmar, input, lineas, materialesRef, params]);

  const aplicarPrimeraLineaRps = useCallback(async (pedido: PedidoRps) => {
    // Esto se dispara solo, tras la consulta automática a RPS. Lo automático no
    // pregunta ni pisa: si la línea que produciría la importación ya existe
    // —recuperada de un borrador y quizá corregida a mano—, no hay nada que
    // aplicar, y menos un modal de confirmación destructiva que nadie ha pedido.
    // Importar a mano desde el selector sigue sustituyendo, con su confirmación.
    // La versión la fija `crearInputDesdeRps` con el índice de la línea en RPS,
    // y esta es siempre la primera: la 10.
    if (lineas.some((linea) => linea.version === "10")) return;
    // Esa guarda es ciega a los registros que todavía están en vuelo: si el GET
    // de planteamientos tarda más que la consulta a RPS, `lineas` está vacío y
    // la importación pisaría la versión 10 ya guardada. Lo automático espera.
    if (cargandoPedido) return;
    let catalogo = materialesRef.current;
    if (catalogo.length === 0) {
      catalogo = await fetch("/api/materiales", { cache: "no-store" })
        .then((respuesta) => respuesta.ok ? respuesta.json() as Promise<Material[]> : []);
      if (catalogo.length > 0) {
        materialesRef.current = catalogo;
        setMateriales(catalogo);
      }
    }
    await aplicarPedidoRps(pedido, pedido.lineas[0], catalogo);
  }, [aplicarPedidoRps, cargandoPedido, lineas, materialesRef, setMateriales]);

  const pedidoRpsVisible = calcularPedidoRpsVisible(numeroPedido, rps.pedido);
  const origenRpsActivo = calcularOrigenRpsActivo(numeroPedido, activa);
  const estadoRpsVisible = calcularEstadoRpsVisible(numeroPedido, rps.numeroConsultado, rps.estado);

  useRegistrosPedido(numeroPedido, despachar);
  useConsultaRps({
    numeroPedido,
    reintento: rps.reintento,
    hayInicial: Boolean(inicial),
    despachar,
    onPedidoUnicaLinea: aplicarPrimeraLineaRps,
    reiniciarGuarda: reiniciarGuardaRps,
  });

  function cambiarNumeroPedido(valor: string) {
    despachar({ tipo: "PEDIDO_CAMBIADO", valor });
  }

  function cambiarClientePedido(valor: string) {
    despachar({ tipo: "CLIENTE_CAMBIADO", valor });
  }

  /** Guarda todas las líneas y devuelve los registros, o null si algo falló. */
  const guardarTodas = useCallback(async (
    aGuardar: LineaPedido[],
  ): Promise<PlanteamientoRecord[] | null> => {
    const guardados: PlanteamientoRecord[] = [];
    for (const linea of aGuardar) {
      const respuesta = await fetch("/api/planteamientos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: linea.id,
          tipo: linea.tipo,
          input: linea.input,
          snapshotSvg: linea.snapshotSvg ?? null,
        }),
      }).catch(() => null);
      if (!respuesta || !respuesta.ok) {
        avisar("error", `No se pudo guardar ${nombreLinea(linea)}. El pedido no se ha completado.`);
        return null;
      }
      guardados.push(await respuesta.json() as PlanteamientoRecord);
    }
    return guardados;
  }, [avisar]);

  /**
   * Guarda las líneas y deja el pedido esperando a un compañero. No genera
   * ningún PDF: se archiva con *Guardar planteamiento* y el nombre del revisor desde
   * la ficha de revisión.
   */
  async function guardarParaRevision() {
    if (busy) return;
    const svgActual = leerSnapshot();
    capturarSnapshot(svgActual);
    const impedimentos = impedimentosCompletar(lineas);
    if (impedimentos.length > 0) {
      // Decir cuál y qué le falta, en vez de omitirla en silencio.
      avisar("info", mensajeImpedimentos(impedimentos));
      const primera = impedimentos[0].version;
      const culpable = lineas.find((linea) => linea.version === primera);
      if (primera) despachar({ tipo: "LINEA_SELECCIONADA", version: primera });
      despachar({ tipo: "VALIDACION_INTENTADA" });
      // Abrir la línea que falla y ponerse encima del campo: el aviso dice qué
      // pasa, pero quien lo arregla necesita el cursor donde se arregla.
      const campo = culpable ? erroresPlanteamiento(culpable.input)[0]?.campo : undefined;
      if (campo) {
        window.setTimeout(() => {
          const nodo = document.querySelector<HTMLElement>(`[data-campo="${campo}"]`);
          nodo?.focus();
          nodo?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 0);
      }
      return;
    }

    // Quien guarda es el técnico de la cabecera: no se pregunta dos veces lo mismo.
    const por = lineas[0]?.input.cabecera.realizadoPor?.trim() ?? "";
    if (!por) {
      avisar("info", "Rellena «Realizado por» antes de mandar el pedido a revisión.");
      return;
    }

    // Guardar sobre un pedido ya revisado deja los cambios sin revisar. Se
    // puede seguir —es la escapatoria del arreglo sencillo— pero no por descuido.
    const ficha = await fetch(`/api/pedidos/${encodeURIComponent(numeroPedido)}`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    const situacion = ficha?.visible?.situacion;
    if (situacion === "GUARDADO") {
      const clave = await confirmar({
        titulo: "Este planteamiento ya está archivado",
        mensaje: `${ficha.visible.etiqueta}. Si guardas, los cambios quedan sin revisar y el pedido vuelve a la bandeja.`,
        acciones: [
          { clave: "guardar", etiqueta: "Guardar igualmente", tono: "peligro" },
          { clave: "cancelar", etiqueta: "Cancelar", tono: "neutro" },
        ],
      });
      if (clave !== "guardar") return;
    }

    despachar({ tipo: "ACCION_INICIADA", accion: "completar" });
    try {
      const aGuardar = lineasConDibujoActual(svgActual);
      const guardados = await guardarTodas(aGuardar);
      if (!guardados) return;
      // Con el número de pedido: si mientras se guardaba se cambió de pedido,
      // el reducer sabe que estos ids no son de las líneas que hay ahora.
      despachar({ tipo: "PEDIDO_COMPLETADO", numeroPedido, registros: guardados });

      const respuesta = await fetch(`/api/pedidos/${encodeURIComponent(numeroPedido)}/revision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "revisar", por }),
      });
      if (!respuesta.ok) {
        const detalle = (await respuesta.json().catch(() => null))?.error ?? String(respuesta.status);
        avisar("error", `Las líneas se han guardado, pero el pedido no se marcó para revisión: ${detalle}`);
        return;
      }

      // Ya están en la base de datos: los borradores locales sobran. Se cancela
      // antes la escritura en cola —y lo que tenía preparado— que si no
      // volvería a dejarlos escritos, ya sea al vencer o al volcarse.
      if (guardadoPendiente.current !== null) window.clearTimeout(guardadoPendiente.current);
      guardadoPendiente.current = null;
      pendienteRef.current = null;
      limpiarBorradores(almacen, numeroPedido);
      avisar("exito", "Pedido guardado para revisión. Avisa a un compañero para que lo mire.");
    } catch {
      avisar("error", "Error de red al guardar el pedido.");
    } finally {
      despachar({ tipo: "ACCION_TERMINADA" });
    }
  }

  async function previsualizarPdf() {
    if (busy) return;
    const ventana = window.open("", "_blank");
    if (!ventana) {
      avisar("error", "El navegador ha bloqueado la vista previa. Permite ventanas emergentes para esta aplicación.");
      return;
    }
    ventana.opener = null;
    ventana.document.title = "Generando vista previa…";
    ventana.document.body.textContent = "Generando vista previa del planteamiento…";
    ventana.document.body.style.cssText = "font:600 14px sans-serif;color:#17393e;padding:24px";
    despachar({ tipo: "ACCION_INICIADA", accion: "preview" });
    try {
      const svgActual = leerSnapshot();
      capturarSnapshot(svgActual);
      const resultado = await orquestarPdf(
        { numeroPedido, archivar: false, lineas: lineasConDibujoActual(svgActual) },
        {
          fetch: (entrada, init) => fetch(entrada, init),
          rasterizar: (svg) => rasterizarSvg(svg, { monocromo: SALIDA_MONOCROMA }),
          onProgreso: (hecho, total) => setProgresoPdf({ hecho, total }),
        },
      );
      if (!resultado.ok) {
        ventana.close();
        if (resultado.motivo === "sin-elementos") avisar("info", resultado.mensaje);
        else avisar("error", `Error al generar PDF: ${resultado.mensaje}`);
        return;
      }
      const url = URL.createObjectURL(await resultado.respuesta.blob());
      ventana.location.replace(url);
      avisar(
        "info",
        `Vista previa abierta: ${resultado.nombre}. No se ha archivado todavía.`
          + (resultado.omitidos ? ` Se han omitido ${resultado.omitidos} líneas incompletas.` : ""),
      );
    } catch {
      ventana.close();
      avisar("error", "Error de red al generar la vista previa del PDF.");
    } finally {
      setProgresoPdf(null);
      despachar({ tipo: "ACCION_TERMINADA" });
    }
  }

  const lineaSeleccionada = pedidoRpsVisible?.lineas.find((linea) => linea.idLinea === origenRpsActivo?.idLinea) ?? null;
  const materialRpsAplicado = Boolean(lineaSeleccionada && (
    lineaSeleccionada.materialSugerido || materialPreferidoRps(lineaSeleccionada, materiales)
  ));

  const cambiarInput = (entrada: LonaInput | BaquetonInput) =>
    despachar({ tipo: "INPUT_CAMBIADO", input: entrada });

  const abrirSelectorRps = () => despachar({ tipo: "RPS_SELECTOR_ABIERTO" });

  const reintentarRps = () => {
    reiniciarGuardaRps.current?.();
    despachar({ tipo: "RPS_REINTENTADO" });
  };

  const registrarSnapshot = (fn: (() => string | null) | null) => { snapshotRef.current = fn; };

  return {
    estado,
    materiales,
    params,
    // derivados
    lineaActiva: activa,
    estadosLinea,
    tipo,
    lona,
    baq,
    input,
    resLona,
    resBaq,
    erroresVisibles,
    progresoPdf,
    medidasSuficientes,
    pedidoRpsVisible,
    origenRpsActivo,
    estadoRpsVisible,
    materialRpsAplicado,
    // manejadores
    cambiarNumeroPedido,
    cambiarClientePedido,
    cambiarInput,
    seleccionarLinea,
    eliminarLinea,
    nuevaLinea,
    aplicarPedidoRps,
    abrirSelectorRps,
    reintentarRps,
    marcarCampoTocado,
    previsualizarPdf,
    guardarParaRevision,
    registrarSnapshot,
  };
}
