import type { CabeceraInput, LonaInput } from "@/lib/calc/lona";
import type { BaquetonInput } from "@/lib/calc/baqueton";
import type { TipoPlanteamiento } from "@/lib/store/types";
import { nombrePerfil } from "@/lib/calc/params";

export interface CampoRevision { etiqueta: string; valor: string }
export interface SeccionRevision { titulo: string; campos: CampoRevision[] }

const RAYA = "—";

const num = (n: number | null | undefined): string => (
  n == null || !Number.isFinite(n) || n === 0
    ? RAYA
    : n.toLocaleString("es-ES", { maximumFractionDigits: 2 })
);
/** Un cero que sí significa algo (una cantidad, un paso) no es una raya. */
const numCero = (n: number | null | undefined): string => (
  n == null || !Number.isFinite(n) ? RAYA : n.toLocaleString("es-ES", { maximumFractionDigits: 2 })
);
const texto = (v: string | null | undefined): string => (v?.trim() ? v : RAYA);
const siNo = (v: boolean | null | undefined): string => (v == null ? RAYA : v ? "Sí" : "No");
const lista = (posiciones: number[]): string => (
  posiciones.length === 0 ? RAYA : posiciones.map((p) => numCero(p)).join(" · ")
);

function ventana(i: LonaInput): string {
  if (i.ventana == null) return RAYA;
  if (!i.ventana) return "No";
  return (i.ventanaAncho ?? 0) > 0 && (i.ventanaAlto ?? 0) > 0
    ? `Sí · ${num(i.ventanaAncho)} × ${num(i.ventanaAlto)} cm`
    : "Sí · medidas pendientes";
}

function seccionPedido(cabecera: CabeceraInput, version: string): SeccionRevision {
  return {
    titulo: "Pedido",
    campos: [
      { etiqueta: "Nº de pedido", valor: texto(cabecera.numeroPedido) },
      { etiqueta: "Remolque", valor: texto(version) },
      { etiqueta: "Cliente", valor: texto(cabecera.cliente) },
      { etiqueta: "Revisión", valor: texto(cabecera.revision) },
      { etiqueta: "Realizado por", valor: texto(cabecera.realizadoPor) },
      { etiqueta: "Fecha", valor: texto(cabecera.fecha) },
      { etiqueta: "Fecha de salida", valor: texto(cabecera.fechaSalida) },
      { etiqueta: "O.F.", valor: texto(cabecera.ordenFabricacion) },
    ],
  };
}

/** El modo manda: el paso y el primer ollao no significan nada a medida, y las
 *  posiciones no significan nada repartidas. */
function seccionOllaos(i: LonaInput | BaquetonInput): SeccionRevision {
  const campos: CampoRevision[] = [
    { etiqueta: "Modo", valor: texto(i.modoOllaos) },
  ];
  if (i.modoOllaos === "SEGUN SE INDICA") {
    campos.push(
      { etiqueta: "Posiciones laterales", valor: lista(i.ollaosManuales.laterales) },
      { etiqueta: "Posiciones atrás", valor: lista(i.ollaosManuales.atras) },
      { etiqueta: "Posiciones delante", valor: lista(i.ollaosManuales.delante) },
    );
  } else {
    campos.push(
      { etiqueta: "Paso", valor: num(i.pasoOllaos) },
      { etiqueta: "Primer ollao", valor: num(i.primerOllao) },
    );
  }
  return { titulo: "Ollaos", campos };
}

function seccionMaterial(i: LonaInput | BaquetonInput): SeccionRevision {
  return {
    titulo: "Material y observaciones",
    campos: [
      { etiqueta: "Material", valor: texto(i.material) },
      { etiqueta: "Observaciones", valor: texto(i.observaciones) },
    ],
  };
}

function seccionPerfil(i: LonaInput): SeccionRevision {
  const campos: CampoRevision[] = [
    { etiqueta: "Perfil", valor: i.tipoPerfil ? nombrePerfil(i.tipoPerfil) : RAYA },
  ];
  // Solo lo que ese tipo usa: un radio de cumbrera en un TIPO 04 sería un dato
  // que el revisor tendría que aprender a ignorar.
  if (i.tipoPerfil === "TIPO 03") {
    campos.push(
      { etiqueta: "Radio de cumbrera", valor: num(i.radioCumbrera) },
      { etiqueta: "Radio de hombro", valor: num(i.radioHombro) },
    );
  }
  if (i.tipoPerfil === "TIPO 04") {
    campos.push(
      { etiqueta: "Chaflán", valor: num(i.chaflan) },
      { etiqueta: "Radio del chaflán abajo", valor: num(i.radioChaflanAbajo) },
      { etiqueta: "Radio del chaflán arriba", valor: num(i.radioChaflanArriba) },
    );
  }
  if (i.tipoPerfil === "TIPO 05") {
    campos.push({ etiqueta: "Radio de esquina", valor: num(i.radioEsquina) });
  }
  return { titulo: "Perfil", campos };
}

function seccionesLona(i: LonaInput, version: string): SeccionRevision[] {
  return [
    seccionPedido(i.cabecera, version),
    {
      titulo: "Medidas",
      campos: [
        { etiqueta: "Cantidad", valor: numCero(i.cantidad) },
        { etiqueta: "Largo", valor: num(i.largo) },
        { etiqueta: "Ancho", valor: num(i.ancho) },
        { etiqueta: "Ancho detrás", valor: num(i.anchoAtras) },
        { etiqueta: "Alto delante", valor: num(i.altoDelante) },
        { etiqueta: "Alto detrás", valor: num(i.altoAtras) },
        { etiqueta: "Aguas", valor: num(i.aguas) },
        { etiqueta: "Contorno", valor: num(i.contorno) },
      ],
    },
    seccionPerfil(i),
    {
      titulo: "Acabados",
      campos: [
        { etiqueta: "Recoge delante", valor: texto(i.recogeDelante) },
        { etiqueta: "Recoge atrás", valor: texto(i.recogeAtras) },
        { etiqueta: "Bastilla de enfundar", valor: siNo(i.bastillaEnfundar) },
        { etiqueta: "Ventana", valor: ventana(i) },
        { etiqueta: "Rotulación", valor: siNo(i.rotulacion) },
      ],
    },
    seccionOllaos(i),
    seccionMaterial(i),
  ];
}

function seccionesBaqueton(i: BaquetonInput, version: string): SeccionRevision[] {
  return [
    seccionPedido(i.cabecera, version),
    {
      titulo: "Medidas",
      campos: [
        { etiqueta: "Cantidad", valor: numCero(i.cantidad) },
        { etiqueta: "Largo", valor: num(i.largo) },
        { etiqueta: "Ancho", valor: num(i.ancho) },
        { etiqueta: "Baquetón", valor: num(i.baqueton) },
        { etiqueta: "Cliente específico", valor: texto(i.clienteEspecifico) },
        { etiqueta: "Rotulación", valor: siNo(i.rotulacion) },
      ],
    },
    seccionOllaos(i),
    seccionMaterial(i),
  ];
}

/**
 * Los datos tal y como se teclearon, agrupados igual que el formulario. Una
 * sola lista para la ficha web y para la ficha en papel: un campo nuevo se
 * añade en un sitio y aparece en los dos.
 */
export function seccionesRevision(linea: {
  tipo: TipoPlanteamiento;
  input: LonaInput | BaquetonInput;
  version?: string;
}): SeccionRevision[] {
  const version = linea.version ?? linea.input.cabecera.version;
  return linea.tipo === "lona"
    ? seccionesLona(linea.input as LonaInput, version)
    : seccionesBaqueton(linea.input as BaquetonInput, version);
}
