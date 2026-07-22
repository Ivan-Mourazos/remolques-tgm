"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { calcLona, type LonaInput } from "@/lib/calc/lona";
import { calcBaqueton, type BaquetonInput } from "@/lib/calc/baqueton";
import { DEFAULT_PARAMS, type CalcParams } from "@/lib/calc/params";
import type { Material } from "@/lib/calc/materiales-seed";
import type { PlanteamientoRecord, TipoPlanteamiento } from "@/lib/store/types";
import { rasterizarSvg } from "@/lib/svg/rasterizar";
import { nombrePdf } from "@/lib/pdf/ruta-pdf";
import { emptyLona, emptyBaqueton } from "@/components/workspace/entradas-vacias";
import { FormularioLona } from "@/components/workspace/FormularioLona";
import { FormularioBaqueton } from "@/components/workspace/FormularioBaqueton";
import { ResultadosLona, ResultadosBaqueton } from "@/components/workspace/Resultados";
import { Escena3D } from "@/components/workspace/Escena3D";
import { ImportadorRps } from "@/components/workspace/ImportadorRps";
import { PedidoActivo } from "@/components/workspace/PedidoActivo";
import { crearInputDesdeRps } from "@/lib/rps/aplicar-linea";
import { materialPreferidoRps } from "@/lib/rps/material-rps";
import { normalizarNumeroPedidoRps } from "@/lib/rps/numero-pedido";
import type { LineaPedidoRps, OrigenRps, PedidoRps } from "@/lib/rps/types";
import {
  nombreElementoPedido,
  remolquesUnicos,
  siguienteVersionPedido,
} from "@/lib/pedidos/agrupar-pedido";
import { erroresPlanteamiento, planteamientoGenerable } from "@/lib/pedidos/validar-planteamiento";

export interface WorkspaceInicial {
  id?: string;
  tipo: TipoPlanteamiento;
  input: LonaInput | BaquetonInput;
}

export function Workspace({ inicial }: { inicial?: WorkspaceInicial }) {
  const [tipo, setTipo] = useState<TipoPlanteamiento>(inicial?.tipo ?? "lona");
  const [lona, setLona] = useState<LonaInput>(
    inicial?.tipo === "lona" ? (inicial.input as LonaInput) : emptyLona(),
  );
  const [baq, setBaq] = useState<BaquetonInput>(
    inicial?.tipo === "baqueton" ? (inicial.input as BaquetonInput) : emptyBaqueton(),
  );
  const [id, setId] = useState<string | undefined>(inicial?.id);
  const [editorActivo, setEditorActivo] = useState(Boolean(inicial));
  const [numeroPedido, setNumeroPedido] = useState(inicial?.input.cabecera.numeroPedido ?? "");
  const [clientePedido, setClientePedido] = useState(inicial?.input.cabecera.cliente ?? "");
  const [registrosPedido, setRegistrosPedido] = useState<PlanteamientoRecord[]>([]);
  const [cargandoPedido, setCargandoPedido] = useState(Boolean(inicial?.input.cabecera.numeroPedido));
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [params, setParams] = useState<CalcParams>(DEFAULT_PARAMS);
  const [aviso, setAviso] = useState<string | null>(null);
  const [accion, setAccion] = useState<"guardar" | "preview" | "pdf" | null>(null);
  const [estadoRps, setEstadoRps] = useState<"idle" | "buscando" | "encontrado" | "no-encontrado" | "error">("idle");
  const [numeroEstadoRps, setNumeroEstadoRps] = useState("");
  const [pedidoRps, setPedidoRps] = useState<PedidoRps | null>(null);
  const [errorRps, setErrorRps] = useState<string | null>(null);
  const [origenRps, setOrigenRps] = useState<OrigenRps | null>(null);
  const [reintentoRps, setReintentoRps] = useState(0);
  const [selectorRpsAbierto, setSelectorRpsAbierto] = useState(true);
  const [validacionIntentada, setValidacionIntentada] = useState(false);
  const [baseGuardada, setBaseGuardada] = useState<string | null>(
    inicial ? JSON.stringify(inicial.input) : null,
  );
  const busy = accion !== null;
  const snapshotRef = useRef<(() => string | null) | null>(null);
  const materialesRef = useRef<Material[]>([]);
  const numeroAnteriorRps = useRef(normalizarNumeroPedidoRps(
    inicial?.input.cabecera.numeroPedido ?? "",
  ));
  const ultimaConsultaRps = useRef("");

  useEffect(() => {
    fetch("/api/materiales").then((r) => r.json()).then((data: Material[]) => {
      materialesRef.current = data;
      setMateriales(data);
    }).catch(() => setMateriales([]));
  }, []);

  useEffect(() => {
    fetch("/api/parametros").then((r) => r.json()).then(setParams).catch(() => {});
  }, []);

  const resLona = useMemo(() => calcLona(lona, params), [lona, params]);
  const resBaq = useMemo(() => calcBaqueton(baq, params), [baq, params]);
  const input = tipo === "lona" ? lona : baq;
  const hayCambiosSinGuardar = editorActivo && JSON.stringify(input) !== baseGuardada;
  const erroresActuales = useMemo(() => erroresPlanteamiento(input), [input]);
  const erroresFormulario = useMemo(() => Object.fromEntries(
    erroresActuales.map((error) => [error.campo, error.mensaje]),
  ), [erroresActuales]);
  const erroresVisibles = validacionIntentada ? erroresFormulario : {};
  const medidasSuficientes = tipo === "lona"
    ? lona.largo > 0 && lona.ancho > 0 && lona.altoDelante > 0
      && (!["TIPO 02", "TIPO 03"].includes(lona.tipoPerfil) || (lona.aguas ?? 0) > 0)
      && (lona.tipoPerfil !== "TIPO 04" || (lona.chaflan ?? 0) > 0)
      && (lona.tipoPerfil !== "TIPO 05" || (lona.radioEsquina ?? 0) > 0)
    : baq.largo > 0 && baq.ancho > 0 && baq.baqueton > 0;

  useEffect(() => {
    if (!hayCambiosSinGuardar) return;
    const antesDeSalir = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const interceptarEnlace = (event: MouseEvent) => {
      const enlace = (event.target as Element | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!enlace || enlace.target === "_blank" || event.defaultPrevented) return;
      const destino = new URL(enlace.href, window.location.href);
      if (destino.origin !== window.location.origin || destino.pathname === window.location.pathname) return;
      if (!window.confirm("Hay cambios sin guardar. ¿Quieres salir y descartarlos?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", antesDeSalir);
    document.addEventListener("click", interceptarEnlace, true);
    return () => {
      window.removeEventListener("beforeunload", antesDeSalir);
      document.removeEventListener("click", interceptarEnlace, true);
    };
  }, [hayCambiosSinGuardar]);

  const validarYEnfocar = () => {
    setValidacionIntentada(true);
    const primero = erroresActuales[0];
    if (!primero) return null;
    setAviso(`Revisa los campos marcados. ${primero.mensaje}`);
    window.setTimeout(() => {
      const campo = document.querySelector<HTMLElement>(`[data-campo="${primero.campo}"]`);
      campo?.focus();
      campo?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
    return primero;
  };

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
    setTipo(creado.tipo);
    if (creado.tipo === "lona") setLona(creado.input);
    else setBaq(creado.input);
    setNumeroPedido(creado.input.cabecera.numeroPedido);
    setClientePedido(creado.input.cabecera.cliente);
    setEditorActivo(true);
    setId(registrosPedido.find((registro) => registro.version === creado.input.cabecera.version)?.id);
    setOrigenRps({
      numeroPedido: pedido.numero,
      numeroLinea: linea.numeroLinea,
      idLinea: linea.idLinea,
      ordenFabricacion: linea.ordenFabricacion,
      importadoEn: new Date().toISOString(),
    });
    setSelectorRpsAbierto(false);
    setBaseGuardada(null);
    setValidacionIntentada(false);
    setAviso(`Línea ${linea.numeroLinea} de RPS aplicada. Todos los campos siguen siendo editables.`);
  }, [baq, lona, params, registrosPedido, tipo]);

  const numeroPedidoNormalizado = normalizarNumeroPedidoRps(numeroPedido);
  const pedidoRpsVisible = pedidoRps
    && normalizarNumeroPedidoRps(pedidoRps.numero) === numeroPedidoNormalizado
    ? pedidoRps
    : null;
  const origenRpsActivo = origenRps
    && normalizarNumeroPedidoRps(origenRps.numeroPedido) === numeroPedidoNormalizado
    ? origenRps
    : null;
  const estadoRpsVisible = /^[A-Z]{2}\d{5,}$/.test(numeroPedidoNormalizado)
    && numeroEstadoRps === numeroPedidoNormalizado
    ? estadoRps
    : "idle";

  useEffect(() => {
    const numero = normalizarNumeroPedidoRps(numeroPedido);
    if (!numero) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void fetch(`/api/planteamientos?pedido=${encodeURIComponent(numeroPedido)}`, {
        signal: controller.signal,
        cache: "no-store",
      }).then(async (respuesta) => {
        if (!respuesta.ok) throw new Error(String(respuesta.status));
        const registros = remolquesUnicos(await respuesta.json() as PlanteamientoRecord[]);
        setRegistrosPedido(registros);
        const clienteGuardado = registros.find((registro) => registro.cliente.trim())?.cliente;
        if (clienteGuardado) {
          setClientePedido((actual) => actual.trim() ? actual : clienteGuardado);
          setLona((actual) => actual.cabecera.cliente.trim() ? actual : {
            ...actual, cabecera: { ...actual.cabecera, cliente: clienteGuardado },
          });
          setBaq((actual) => actual.cabecera.cliente.trim() ? actual : {
            ...actual, cabecera: { ...actual.cabecera, cliente: clienteGuardado },
          });
        }
      }).catch((error: unknown) => {
        if ((error as Error).name !== "AbortError") setRegistrosPedido([]);
      }).finally(() => {
        if (!controller.signal.aborted) setCargandoPedido(false);
      });
    }, 250);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [numeroPedido]);

  useEffect(() => {
    const numero = normalizarNumeroPedidoRps(numeroPedido);
    const cambioPedido = numero !== numeroAnteriorRps.current;
    numeroAnteriorRps.current = numero;

    if (!/^[A-Z]{2}\d{5,}$/.test(numero)) {
      ultimaConsultaRps.current = "";
      return;
    }
    // Un registro reutilizado no se sobrescribe al abrirse. La consulta se
    // activa en cuanto el usuario cambie el número o pulse Reintentar.
    if (inicial && !cambioPedido && reintentoRps === 0) return;
    const clave = `${numero}:${reintentoRps}`;
    if (ultimaConsultaRps.current === clave) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      ultimaConsultaRps.current = clave;
      setNumeroEstadoRps(numero);
      setEstadoRps("buscando");
      setErrorRps(null);
      void fetch(`/api/rps/pedido?numero=${encodeURIComponent(numero)}`, {
        signal: controller.signal,
        cache: "no-store",
      }).then(async (response) => {
        const payload = await response.json() as { pedido?: PedidoRps | null; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "No se pudo consultar RPS.");
        if (!payload.pedido) {
          setPedidoRps(null);
          setEstadoRps("no-encontrado");
          return;
        }
        setPedidoRps(payload.pedido);
        setEstadoRps("encontrado");
        if (payload.pedido.lineas.length === 1) {
          let catalogo = materialesRef.current;
          if (catalogo.length === 0) {
            catalogo = await fetch("/api/materiales", { cache: "no-store" })
              .then((respuesta) => respuesta.ok ? respuesta.json() as Promise<Material[]> : []);
            if (catalogo.length > 0) {
              materialesRef.current = catalogo;
              setMateriales(catalogo);
            }
          }
          aplicarPedidoRps(payload.pedido, payload.pedido.lineas[0], catalogo);
        }
      }).catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setPedidoRps(null);
        setErrorRps(error instanceof Error ? error.message : "No se pudo consultar RPS.");
        setEstadoRps("error");
      });
    }, 450);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [aplicarPedidoRps, inicial, numeroPedido, reintentoRps]);

  function cambiarNumeroPedido(valor: string) {
    const cambiaPedido = normalizarNumeroPedidoRps(valor) !== normalizarNumeroPedidoRps(numeroPedido);
    if (cambiaPedido && hayCambiosSinGuardar && !window.confirm(
      "Hay cambios sin guardar. ¿Quieres cambiar de pedido y descartarlos?",
    )) return;
    setNumeroPedido(valor);
    setLona((actual) => ({ ...actual, cabecera: { ...actual.cabecera, numeroPedido: valor } }));
    setBaq((actual) => ({ ...actual, cabecera: { ...actual.cabecera, numeroPedido: valor } }));
    if (cambiaPedido) {
      setClientePedido("");
      setLona((actual) => ({ ...actual, cabecera: { ...actual.cabecera, cliente: "" } }));
      setBaq((actual) => ({ ...actual, cabecera: { ...actual.cabecera, cliente: "" } }));
      setRegistrosPedido([]);
      setCargandoPedido(Boolean(normalizarNumeroPedidoRps(valor)));
      setEditorActivo(false);
      setId(undefined);
      setOrigenRps(null);
      setSelectorRpsAbierto(true);
      setAviso(null);
      setBaseGuardada(null);
      setValidacionIntentada(false);
    }
  }

  function cambiarClientePedido(valor: string) {
    setClientePedido(valor);
    setLona((actual) => ({ ...actual, cabecera: { ...actual.cabecera, cliente: valor } }));
    setBaq((actual) => ({ ...actual, cabecera: { ...actual.cabecera, cliente: valor } }));
  }

  function puedeCambiarElemento(): boolean {
    return !hayCambiosSinGuardar || window.confirm(
      "El elemento actual todavía no está guardado. ¿Quieres descartarlo y continuar?",
    );
  }

  function seleccionarRegistro(registro: PlanteamientoRecord) {
    if (registro.id === id || !puedeCambiarElemento()) return;
    setTipo(registro.tipo);
    if (registro.tipo === "lona") setLona(registro.input as LonaInput);
    else setBaq(registro.input as BaquetonInput);
    setNumeroPedido(registro.numeroPedido);
    setClientePedido(registro.cliente);
    setId(registro.id);
    setEditorActivo(true);
    setOrigenRps(null);
    setSelectorRpsAbierto(false);
    setAviso(null);
    setBaseGuardada(JSON.stringify(registro.input));
    setValidacionIntentada(false);
  }

  function nuevoElemento(nuevoTipo: TipoPlanteamiento) {
    if (!numeroPedido.trim()) {
      setAviso("Introduce primero el número de pedido.");
      return;
    }
    if (!puedeCambiarElemento()) return;
    const base = nuevoTipo === "lona" ? emptyLona() : emptyBaqueton();
    const version = siguienteVersionPedido(registrosPedido);
    const nuevo = {
      ...base,
      cabecera: {
        ...base.cabecera,
        numeroPedido,
        cliente: clientePedido,
        version,
        realizadoPor: input.cabecera.realizadoPor,
        revision: input.cabecera.revision,
      },
    };
    setTipo(nuevoTipo);
    if (nuevoTipo === "lona") setLona(nuevo as LonaInput);
    else setBaq(nuevo as BaquetonInput);
    setId(undefined);
    setEditorActivo(true);
    setOrigenRps(null);
    setSelectorRpsAbierto(true);
    setBaseGuardada(null);
    setValidacionIntentada(false);
    setAviso(`${nombreElementoPedido(version, nuevoTipo)} añadido al pedido. Completa sus datos y guárdalo.`);
  }

  async function doGuardar(): Promise<string | null> {
    if (!editorActivo) {
      setAviso("Selecciona o añade un elemento antes de guardar.");
      return null;
    }
    if (validarYEnfocar()) return null;
    try {
      setAviso(null);
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
        setAviso(`Error al guardar: ${detalle}`);
        return null;
      }
      const saved = await res.json() as PlanteamientoRecord;
      setId(saved.id);
      setBaseGuardada(JSON.stringify(saved.input));
      setValidacionIntentada(false);
      setRegistrosPedido((actuales) => remolquesUnicos([...actuales, saved]));
      setAviso(`${nombreElementoPedido(saved.version, saved.tipo)} guardado dentro del pedido.`);
      return saved.id as string;
    } catch {
      setAviso("Error de red al guardar");
      return null;
    }
  }

  async function guardar(): Promise<string | null> {
    if (busy) return null;
    setAccion("guardar");
    try {
      return await doGuardar();
    } finally {
      setAccion(null);
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
    const pedido = numeroPedido.trim();
    const nombre = nombrePdf(pedido);
    const savedId = archivar && editorActivo ? await doGuardar() : null;
    if (archivar && editorActivo && !savedId) return null;

    // Un PDF por pedido: una página por cada remolque guardado, en orden de creación.
    let registros: PlanteamientoRecord[] = [];
    if (pedido) {
      registros = await fetch(`/api/planteamientos?pedido=${encodeURIComponent(pedido)}`)
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []);
    }
    const idBorrador = id ?? "__vista-previa__";
    const agrupados = remolquesUnicos(registros);
    const generables = agrupados.filter((registro) => planteamientoGenerable(registro.input));
    const omitidos = agrupados.length - generables.length;
    const paginas = generables
      .filter((registro) => archivar || !editorActivo || registro.version !== input.cabecera.version)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const ids = paginas.map((r) => r.id);
    if (ids.length === 0 && !editorActivo) {
      setAviso("El pedido todavía no contiene ningún elemento válido para generar el PDF.");
      return null;
    }
    const snapshots: Record<string, string | null> = {};
    for (const r of paginas) {
      snapshots[r.id] = r.snapshotSvg ? await rasterizarSvg(r.snapshotSvg, { monocromo: true }) : null;
    }
    if (editorActivo) {
      const idPaginaActual = savedId ?? idBorrador;
      if (!(idPaginaActual in snapshots)) {
        snapshots[idPaginaActual] = await rasterizarSvg(
          snapshotRef.current?.() ?? "",
          { monocromo: true },
        );
      }
    }
    const respuesta = await fetch("/api/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ids,
        snapshots,
        archivar,
        borrador: archivar || !editorActivo ? null : { id: idBorrador, tipo, input },
      }),
    });
    if (!respuesta.ok) {
      const detalle = await respuesta.json().catch(() => null) as { error?: string } | null;
      setAviso(`Error al generar PDF: ${detalle?.error ?? respuesta.status}`);
      return null;
    }
    return {
      respuesta,
      nombre,
      omitidos: Math.max(omitidos, Number(respuesta.headers.get("X-Pdf-Omitidos") ?? 0)),
    };
  }

  async function previsualizarPdf() {
    if (busy) return;
    const ventana = window.open("", "_blank");
    if (!ventana) {
      setAviso("El navegador ha bloqueado la vista previa. Permite ventanas emergentes para esta aplicación.");
      return;
    }
    ventana.opener = null;
    ventana.document.title = "Generando vista previa…";
    ventana.document.body.textContent = "Generando vista previa del planteamiento…";
    ventana.document.body.style.cssText = "font:600 14px sans-serif;color:#17393e;padding:24px";
    setAccion("preview");
    try {
      const generado = await solicitarPdf(false);
      if (!generado) {
        ventana.close();
        return;
      }
      const url = URL.createObjectURL(await generado.respuesta.blob());
      ventana.location.replace(url);
      setAviso(
        `Vista previa abierta: ${generado.nombre}. No se ha archivado todavía.`
        + (generado.omitidos ? ` Se han omitido ${generado.omitidos} registros duplicados o incompletos.` : ""),
      );
    } catch {
      ventana.close();
      setAviso("Error de red al generar la vista previa del PDF.");
    } finally {
      setAccion(null);
    }
  }

  async function generarPdf() {
    if (busy) return;
    setAccion("pdf");
    try {
      const generado = await solicitarPdf(true);
      if (!generado) return;
      const destinos = Number(generado.respuesta.headers.get("X-Pdf-Destinos") ?? 0);
      const anio = generado.respuesta.headers.get("X-Pdf-Anio") ?? "el año correspondiente";
      if (destinos === 2) {
        setAviso(
          `PDF archivado en ESCÁNER/PLANTEAMIENTOS y OFICINA TÉCNICA/${anio}.`
          + (generado.omitidos ? ` Se han omitido ${generado.omitidos} registros duplicados o incompletos.` : ""),
        );
      } else {
        descargar(await generado.respuesta.blob(), generado.nombre);
        setAviso(`PDF descargado (${generado.nombre}). Configura las rutas del servidor para archivarlo automáticamente.`);
      }
    } catch {
      setAviso("Error de red al generar PDF");
    } finally {
      setAccion(null);
    }
  }

  const lineaSeleccionada = pedidoRpsVisible?.lineas.find((linea) => linea.idLinea === origenRpsActivo?.idLinea) ?? null;
  const panelRps = (
    <ImportadorRps
      estado={estadoRpsVisible}
      pedido={pedidoRpsVisible}
      error={errorRps}
      origen={origenRpsActivo}
      materialAplicado={Boolean(lineaSeleccionada && (
        lineaSeleccionada.materialSugerido || materialPreferidoRps(lineaSeleccionada, materiales)
      ))}
      abierto={selectorRpsAbierto}
      onAbrir={() => setSelectorRpsAbierto(true)}
      onAplicar={(linea) => {
        if (pedidoRpsVisible && (
          origenRpsActivo?.idLinea === linea.idLinea || puedeCambiarElemento()
        )) aplicarPedidoRps(pedidoRpsVisible, linea);
      }}
      onReintentar={() => {
        ultimaConsultaRps.current = "";
        setReintentoRps((actual) => actual + 1);
      }}
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
        onNumeroPedidoChange={cambiarNumeroPedido}
        onClienteChange={cambiarClientePedido}
        onSeleccionar={seleccionarRegistro}
        onNuevo={nuevoElemento}
        onPreview={previsualizarPdf}
        onGenerar={generarPdf}
      />

      {aviso && (
        <p role="status" aria-live="polite" className="rounded-xl border border-line bg-surface/80 px-3.5 py-2.5 text-xs font-semibold text-ink-2 shadow-sm">
          {aviso}
        </p>
      )}

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
              <FormularioLona input={lona} materiales={materiales} params={params} errores={erroresVisibles} onChange={setLona} />
            ) : (
              <FormularioBaqueton input={baq} materiales={materiales} params={params} errores={erroresVisibles} onChange={setBaq} />
            )}
            <button
              onClick={guardar}
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
                onObservacionesChange={(observaciones) => setLona((actual) => ({ ...actual, observaciones }))}
                onSnapshotReady={(fn) => { snapshotRef.current = fn; }} />
            ) : (
              <Escena3D modo="baqueton" largo={baq.largo} ancho={baq.ancho}
                altoDelante={0} altoAtras={0} tipoPerfil="TIPO 01"
                baqueton={baq.baqueton} material={baq.material}
                ollaos={resBaq.reparto}
                observaciones={baq.observaciones}
                onObservacionesChange={(observaciones) => setBaq((actual) => ({ ...actual, observaciones }))}
                onSnapshotReady={(fn) => { snapshotRef.current = fn; }} />
            )}
            {medidasSuficientes && tipo === "lona"
              ? <ResultadosLona
                  res={resLona}
                  modoOllaos={lona.modoOllaos}
                  primerOllao={lona.primerOllao ?? params.primerOllao}
                  errorOllaos={erroresVisibles.ollaosManuales}
                  onOllaosChange={(ollaosManuales) => setLona((actual) => ({ ...actual, ollaosManuales }))}
                />
              : medidasSuficientes && tipo === "baqueton" ? <ResultadosBaqueton
                  res={resBaq}
                  modoOllaos={baq.modoOllaos}
                  primerOllao={baq.primerOllao ?? params.primerOllao}
                  errorOllaos={erroresVisibles.ollaosManuales}
                  onOllaosChange={(ollaosManuales) => setBaq((actual) => ({ ...actual, ollaosManuales }))}
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
