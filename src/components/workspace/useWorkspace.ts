"use client";
import { useCallback, useMemo, useReducer, useRef } from "react";
import { calcLona, type LonaInput } from "@/lib/calc/lona";
import { calcBaqueton, type BaquetonInput } from "@/lib/calc/baqueton";
import type { Material } from "@/lib/calc/materiales-seed";
import type { PlanteamientoRecord, TipoPlanteamiento } from "@/lib/store/types";
import { rasterizarSvg } from "@/lib/svg/rasterizar";
import { orquestarPdf } from "@/lib/pdf/orquestar-pdf";
import { emptyLona, emptyBaqueton } from "@/components/workspace/entradas-vacias";
import { crearInputDesdeRps } from "@/lib/rps/aplicar-linea";
import { materialPreferidoRps } from "@/lib/rps/material-rps";
import { normalizarNumeroPedidoRps } from "@/lib/rps/numero-pedido";
import type { LineaPedidoRps, PedidoRps } from "@/lib/rps/types";
import {
  nombreElementoPedido,
  siguienteVersionPedido,
} from "@/lib/pedidos/agrupar-pedido";
import { erroresPlanteamiento } from "@/lib/pedidos/validar-planteamiento";
import { estadoInicial, reducirWorkspace, type EntradaInicial } from "@/lib/workspace/estado";
import {
  erroresVisibles as calcularErroresVisibles,
  estadoRpsVisible as calcularEstadoRpsVisible,
  hayCambiosSinGuardar as calcularHayCambiosSinGuardar,
  inputActivo,
  medidasSuficientes as calcularMedidasSuficientes,
  origenRpsActivo as calcularOrigenRpsActivo,
  pedidoRpsVisible as calcularPedidoRpsVisible,
} from "@/lib/workspace/selectores";
import { useAvisos, useConfirmar } from "@/components/feedback/useFeedback";
import { useCatalogos } from "@/components/workspace/useCatalogos";
import { useRegistrosPedido } from "@/components/workspace/useRegistrosPedido";
import { useConsultaRps } from "@/components/workspace/useConsultaRps";
import { useAvisoSalida } from "@/components/workspace/useAvisoSalida";

/**
 * Añade a `registros` el registro recién guardado (`reciente`) cuando
 * pertenece al mismo pedido (`numeroPedidoActivo`). Sirve para no repetir su
 * versión ni perder su `id` mientras `registrosPedido` todavía no refleja el
 * `GUARDADO_OK` que se acaba de despachar (ver `recienGuardadoRef`). Vive
 * fuera del componente para no obligar a los `useCallback` que la llaman a
 * declararla como dependencia.
 */
function conRecienGuardado(
  registros: PlanteamientoRecord[],
  reciente: PlanteamientoRecord | null,
  numeroPedidoActivo: string,
): PlanteamientoRecord[] {
  return reciente
    && normalizarNumeroPedidoRps(reciente.numeroPedido) === normalizarNumeroPedidoRps(numeroPedidoActivo)
    ? [...registros, reciente]
    : registros;
}

/**
 * Toda la lógica del workspace: estado, efectos, derivados y manejadores.
 * `Workspace.tsx` se limita a pintar lo que este hook devuelve.
 */
export function useWorkspace(inicial?: EntradaInicial) {
  const [estado, despachar] = useReducer(
    reducirWorkspace,
    undefined,
    () => estadoInicial(inicial, { lona: emptyLona(), baqueton: emptyBaqueton() }),
  );
  const {
    tipo, lona, baqueton: baq, id, editorActivo, baseGuardada, validacionIntentada,
    numeroPedido, cliente: clientePedido, registros: registrosPedido,
    rps, accion,
  } = estado;
  const { materiales, params, materialesRef, setMateriales } = useCatalogos();
  const avisar = useAvisos();
  const confirmar = useConfirmar();
  const busy = accion !== null;
  const snapshotRef = useRef<(() => string | null) | null>(null);
  const reiniciarGuardaRps = useRef<(() => void) | null>(null);
  // GUARDADO_OK aún no se ve desde este render: si el usuario elige «Guardar y
  // continuar», el registro recién guardado todavía no está en `registrosPedido`
  // cuando la promesa resuelve. Lo apuntamos aparte para no repetir su versión.
  const recienGuardadoRef = useRef<PlanteamientoRecord | null>(null);

  const resLona = useMemo(() => calcLona(lona, params), [lona, params]);
  const resBaq = useMemo(() => calcBaqueton(baq, params), [baq, params]);
  const input = inputActivo(tipo, lona, baq);
  const hayCambiosSinGuardar = calcularHayCambiosSinGuardar(editorActivo, input, baseGuardada);
  const erroresActuales = useMemo(() => erroresPlanteamiento(input), [input]);
  const erroresVisibles = calcularErroresVisibles(erroresActuales, validacionIntentada);
  const medidasSuficientes = calcularMedidasSuficientes(input);

  const validarYEnfocar = useCallback(() => {
    const primero = erroresActuales[0];
    despachar({ tipo: "VALIDACION_INTENTADA" });
    if (!primero) return null;
    avisar("info", `Revisa los campos marcados. ${primero.mensaje}`);
    window.setTimeout(() => {
      const campo = document.querySelector<HTMLElement>(`[data-campo="${primero.campo}"]`);
      campo?.focus();
      campo?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
    return primero;
  }, [avisar, erroresActuales]);

  /**
   * Guarda sin envolver la acción en curso. `guardar` es la versión pública,
   * que además marca el workspace como ocupado.
   */
  const doGuardar = useCallback(async (): Promise<string | null> => {
    if (!editorActivo) {
      avisar("info", "Selecciona o añade un elemento antes de guardar.");
      return null;
    }
    if (validarYEnfocar()) return null;
    try {
      const res = await fetch("/api/planteamientos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, tipo, input, snapshotSvg: snapshotRef.current?.() ?? null }),
      });
      if (!res.ok) {
        let detalle = String(res.status);
        try {
          detalle = (await res.json()).error ?? detalle;
        } catch {
          // cuerpo no JSON: dejamos el código de estado
        }
        avisar("error", `Error al guardar: ${detalle}`);
        return null;
      }
      const saved = await res.json() as PlanteamientoRecord;
      recienGuardadoRef.current = saved;
      despachar({ tipo: "GUARDADO_OK", registro: saved });
      avisar("exito", `${nombreElementoPedido(saved.version, saved.tipo)} guardado dentro del pedido.`);
      return saved.id as string;
    } catch {
      avisar("error", "Error de red al guardar");
      return null;
    }
  }, [avisar, editorActivo, id, input, tipo, validarYEnfocar]);

  /** Devuelve true si se puede continuar descartando o guardando el borrador. */
  const confirmarDescarte = useCallback(async (mensaje: string): Promise<boolean> => {
    const primerError = erroresActuales[0]?.mensaje;
    const clave = await confirmar({
      titulo: "Cambios sin guardar",
      mensaje,
      acciones: [
        {
          clave: "guardar",
          etiqueta: "Guardar y continuar",
          tono: "primario",
          deshabilitada: primerError
            ? `No se puede guardar todavía: ${primerError}`
            : undefined,
        },
        { clave: "descartar", etiqueta: "Descartar cambios", tono: "peligro" },
        { clave: "cancelar", etiqueta: "Cancelar", tono: "neutro" },
      ],
    });
    if (clave === "guardar") {
      // Mismo sobre que `guardar()`: `busy` debe reflejar esta llamada a
      // `doGuardar` para que el botón «Guardar» del toolbar quede
      // deshabilitado mientras dura, y así no se dispare un segundo POST con
      // el mismo `id` (que crearía un registro duplicado). `ACCION_TERMINADA`
      // va en el `finally` para liberar `busy` también si `doGuardar` lanza.
      despachar({ tipo: "ACCION_INICIADA", accion: "guardar" });
      try {
        return Boolean(await doGuardar());
      } finally {
        despachar({ tipo: "ACCION_TERMINADA" });
      }
    }
    return clave === "descartar";
  }, [confirmar, doGuardar, erroresActuales]);

  const puedeCambiarElemento = useCallback(async (): Promise<boolean> => (
    !hayCambiosSinGuardar
    || confirmarDescarte("El elemento actual todavía no está guardado. Puedes guardarlo antes de continuar.")
  ), [confirmarDescarte, hayCambiosSinGuardar]);

  const confirmarSalida = useCallback(
    () => confirmarDescarte("Vas a salir de esta página y el elemento tiene cambios sin guardar."),
    [confirmarDescarte],
  );
  useAvisoSalida({ activo: hayCambiosSinGuardar, confirmarSalida });

  const aplicarPedidoRps = useCallback((
    pedido: PedidoRps,
    linea: LineaPedidoRps,
    catalogoMateriales: Material[] = materialesRef.current,
  ) => {
    const indice = pedido.lineas.findIndex((item) => item.idLinea === linea.idLinea);
    const realizadoPor = (tipo === "lona" ? lona : baq).cabecera.realizadoPor;
    const creado = crearInputDesdeRps(
      pedido, linea, Math.max(indice, 0), catalogoMateriales, params, realizadoPor,
    );
    const conocidos = conRecienGuardado(registrosPedido, recienGuardadoRef.current, pedido.numero);
    despachar({
      tipo: "RPS_APLICADO",
      tipoElemento: creado.tipo,
      input: creado.input,
      origen: {
        numeroPedido: pedido.numero,
        numeroLinea: linea.numeroLinea,
        idLinea: linea.idLinea,
        ordenFabricacion: linea.ordenFabricacion,
        importadoEn: new Date().toISOString(),
      },
      id: conocidos.find((registro) => registro.version === creado.input.cabecera.version)?.id,
    });
    avisar("info", `Línea ${linea.numeroLinea} de RPS aplicada. Todos los campos siguen siendo editables.`);
  }, [
    avisar, baq, lona, materialesRef, params, tipo,
    // Carga, no adorno: al cambiar la identidad de `registrosPedido` (cuando
    // llegan los registros guardados del pedido) este callback se recrea, y
    // eso cancela y reprograma el debounce de la consulta RPS. Si se quita,
    // RPS puede resolver antes que el listado del pedido, `RPS_APLICADO`
    // viaja sin id y se crea un registro duplicado de la misma versión al guardar.
    registrosPedido,
  ]);

  const aplicarPrimeraLineaRps = useCallback(async (pedido: PedidoRps) => {
    let catalogo = materialesRef.current;
    if (catalogo.length === 0) {
      catalogo = await fetch("/api/materiales", { cache: "no-store" })
        .then((respuesta) => respuesta.ok ? respuesta.json() as Promise<Material[]> : []);
      if (catalogo.length > 0) {
        materialesRef.current = catalogo;
        setMateriales(catalogo);
      }
    }
    aplicarPedidoRps(pedido, pedido.lineas[0], catalogo);
  }, [aplicarPedidoRps, materialesRef, setMateriales]);

  const pedidoRpsVisible = calcularPedidoRpsVisible(numeroPedido, rps.pedido);
  const origenRpsActivo = calcularOrigenRpsActivo(numeroPedido, rps.origen);
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

  async function cambiarNumeroPedido(valor: string) {
    const cambiaPedido = normalizarNumeroPedidoRps(valor) !== normalizarNumeroPedidoRps(numeroPedido);
    if (cambiaPedido && hayCambiosSinGuardar && !(await confirmarDescarte(
      "Vas a cambiar de pedido y este elemento tiene cambios sin guardar.",
    ))) return;
    // El puente al registro recién guardado es de un solo uso: sirve para
    // cruzar un `await` dentro del mismo pedido. Al cambiar de pedido deja de
    // valer, y conservarlo haría que durante la recarga fuese la única entrada
    // de la lista conocida.
    if (cambiaPedido) recienGuardadoRef.current = null;
    despachar({ tipo: "PEDIDO_CAMBIADO", valor });
  }

  function cambiarClientePedido(valor: string) {
    despachar({ tipo: "CLIENTE_CAMBIADO", valor });
  }

  async function seleccionarRegistro(registro: PlanteamientoRecord) {
    if (registro.id === id || !(await puedeCambiarElemento())) return;
    despachar({ tipo: "REGISTRO_SELECCIONADO", registro });
  }

  async function nuevoElemento(nuevoTipo: TipoPlanteamiento) {
    if (!numeroPedido.trim()) {
      avisar("info", "Introduce primero el número de pedido.");
      return;
    }
    if (!(await puedeCambiarElemento())) return;
    const plantilla = nuevoTipo === "lona" ? emptyLona() : emptyBaqueton();
    const conocidos = conRecienGuardado(registrosPedido, recienGuardadoRef.current, numeroPedido);
    const version = siguienteVersionPedido(conocidos);
    const base = {
      ...plantilla,
      cabecera: {
        ...plantilla.cabecera,
        numeroPedido,
        cliente: clientePedido,
        version,
        realizadoPor: input.cabecera.realizadoPor,
        revision: input.cabecera.revision,
      },
    };
    despachar({ tipo: "ELEMENTO_ANADIDO", tipoElemento: nuevoTipo, base });
    avisar("info", `${nombreElementoPedido(version, nuevoTipo)} añadido al pedido. Completa sus datos y guárdalo.`);
  }

  async function guardar(): Promise<string | null> {
    if (busy) return null;
    despachar({ tipo: "ACCION_INICIADA", accion: "guardar" });
    try {
      return await doGuardar();
    } finally {
      despachar({ tipo: "ACCION_TERMINADA" });
    }
  }

  function descargar(blob: Blob, nombre: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function solicitarPdf(archivar: boolean): Promise<{
    respuesta: Response; nombre: string; omitidos: number;
  } | null> {
    if (editorActivo) {
      if (validarYEnfocar()) return null;
    }
    const savedId = archivar && editorActivo ? await doGuardar() : null;
    if (archivar && editorActivo && !savedId) return null;

    const resultado = await orquestarPdf({
      numeroPedido,
      archivar,
      editorActivo,
      idGuardado: savedId,
      idBorrador: id ?? "__vista-previa__",
      tipo,
      input,
      svgActual: snapshotRef.current?.() ?? null,
    }, {
      fetch: (entrada, init) => fetch(entrada, init),
      rasterizar: (svg) => rasterizarSvg(svg, { monocromo: true }),
    });

    if (!resultado.ok) {
      if (resultado.motivo === "sin-elementos") avisar("info", resultado.mensaje);
      else avisar("error", `Error al generar PDF: ${resultado.mensaje}`);
      return null;
    }
    return {
      respuesta: resultado.respuesta,
      nombre: resultado.nombre,
      omitidos: resultado.omitidos,
    };
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
      const generado = await solicitarPdf(false);
      if (!generado) {
        ventana.close();
        return;
      }
      const url = URL.createObjectURL(await generado.respuesta.blob());
      ventana.location.replace(url);
      avisar(
        "info",
        `Vista previa abierta: ${generado.nombre}. No se ha archivado todavía.`
          + (generado.omitidos ? ` Se han omitido ${generado.omitidos} registros duplicados o incompletos.` : ""),
      );
    } catch {
      ventana.close();
      avisar("error", "Error de red al generar la vista previa del PDF.");
    } finally {
      despachar({ tipo: "ACCION_TERMINADA" });
    }
  }

  async function generarPdf() {
    if (busy) return;
    despachar({ tipo: "ACCION_INICIADA", accion: "pdf" });
    try {
      const generado = await solicitarPdf(true);
      if (!generado) return;
      const destinos = Number(generado.respuesta.headers.get("X-Pdf-Destinos") ?? 0);
      const anio = generado.respuesta.headers.get("X-Pdf-Anio") ?? "el año correspondiente";
      if (destinos === 2) {
        avisar(
          "exito",
          `PDF archivado en ESCÁNER/PLANTEAMIENTOS y OFICINA TÉCNICA/${anio}.`
            + (generado.omitidos ? ` Se han omitido ${generado.omitidos} registros duplicados o incompletos.` : ""),
        );
      } else {
        descargar(await generado.respuesta.blob(), generado.nombre);
        avisar(
          "exito",
          `PDF descargado (${generado.nombre}). Configura las rutas del servidor para archivarlo automáticamente.`,
        );
      }
    } catch {
      avisar("error", "Error de red al generar PDF");
    } finally {
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
    input,
    resLona,
    resBaq,
    hayCambiosSinGuardar,
    erroresVisibles,
    medidasSuficientes,
    pedidoRpsVisible,
    origenRpsActivo,
    estadoRpsVisible,
    materialRpsAplicado,
    busy,
    // manejadores
    cambiarNumeroPedido,
    cambiarClientePedido,
    cambiarInput,
    seleccionarRegistro,
    nuevoElemento,
    puedeCambiarElemento,
    aplicarPedidoRps,
    abrirSelectorRps,
    reintentarRps,
    guardar,
    previsualizarPdf,
    generarPdf,
    registrarSnapshot,
  };
}
