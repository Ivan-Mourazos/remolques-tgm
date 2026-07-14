import {
  Document, Page, Text, View, Image, StyleSheet,
} from "@react-pdf/renderer";
import type { PlanteamientoRecord } from "@/lib/store/types";
import type { LonaInput, LonaResult } from "@/lib/calc/lona";
import type { BaquetonInput, BaquetonResult } from "@/lib/calc/baqueton";

const s = StyleSheet.create({
  page: { padding: 24, fontSize: 9, fontFamily: "Helvetica", color: "#111" },
  cabecera: {
    flexDirection: "row", justifyContent: "space-between",
    borderBottom: "2 solid #111", paddingBottom: 8, marginBottom: 10,
  },
  marca: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  titulo: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  fila: { flexDirection: "row", marginBottom: 2 },
  etiqueta: { width: 110, color: "#555", textTransform: "uppercase", fontSize: 7.5 },
  valor: { fontFamily: "Helvetica-Bold" },
  columnas: { flexDirection: "row", gap: 16 },
  col: { flex: 1 },
  tabla: { marginTop: 8, border: "1 solid #ccc" },
  tr: { flexDirection: "row", borderBottom: "1 solid #eee" },
  th: { flex: 1, padding: 3, backgroundColor: "#f3f3f3", fontFamily: "Helvetica-Bold", fontSize: 7 },
  td: { flex: 1, padding: 3, fontSize: 7, textAlign: "center" },
  tdNombre: { flex: 6, padding: 3, fontSize: 7 },
  nota: { color: "#92400e", fontSize: 8, marginTop: 2 },
  foto: { width: 260, height: 180, objectFit: "contain", alignSelf: "center" },
});

const fmt = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 2 });

function Dato({ l, v }: { l: string; v: string }) {
  return (
    <View style={s.fila}>
      <Text style={s.etiqueta}>{l}</Text>
      <Text style={s.valor}>{v}</Text>
    </View>
  );
}

function Reparto({ reparto }: { reparto: { laterales: number[]; atras: number[]; delante: number[] } }) {
  const filas: Array<[string, number[]]> = [
    ["OLLAOS LATERALES DE ATRÁS A ADELANTE", reparto.laterales],
    ["OLLAOS ATRÁS DE IZQUIERDA A DERECHA", reparto.atras],
    ["OLLAOS DELANTE DE IZQUIERDA A DERECHA", reparto.delante],
  ];
  return (
    <View style={s.tabla}>
      <View style={s.tr}>
        <Text style={[s.th, { flex: 6 }]}>REPARTO</Text>
        {Array.from({ length: 12 }, (_, i) => <Text key={i} style={s.th}>{i + 1}</Text>)}
        <Text style={s.th}>TOTAL</Text>
      </View>
      {filas.map(([nombre, pos]) => (
        <View key={nombre} style={s.tr}>
          <Text style={s.tdNombre}>{nombre}</Text>
          {Array.from({ length: 12 }, (_, i) => (
            <Text key={i} style={s.td}>{pos[i] != null ? fmt(pos[i]) : "-"}</Text>
          ))}
          <Text style={[s.td, { fontFamily: "Helvetica-Bold" }]}>{pos.length}</Text>
        </View>
      ))}
    </View>
  );
}

export function PlanteamientoPdf({ rec, snapshotPng }: {
  rec: PlanteamientoRecord; snapshotPng: string | null;
}) {
  const esLona = rec.tipo === "lona";
  const input = rec.input;
  const notas = (rec.result as LonaResult | BaquetonResult).notas;
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.cabecera}>
          <Text style={s.marca}>TGM · TOLDOS GÓMEZ</Text>
          <View>
            <Dato l="Nº pedido" v={input.cabecera.numeroPedido || "—"} />
            <Dato l="Versión" v={input.cabecera.version || "—"} />
            <Dato l="Fecha" v={input.cabecera.fecha || "—"} />
          </View>
        </View>
        <Text style={s.titulo}>
          {esLona ? "PLANTEAMIENTO · LONA REMOLQUE" : "PLANTEAMIENTO · BAQUETÓN"}
        </Text>
        <View style={s.columnas}>
          <View style={s.col}>
            <Dato l="Cliente" v={input.cabecera.cliente || "—"} />
            <Dato l="Revisión" v={input.cabecera.revision || "—"} />
            <Dato l="Realizado" v={input.cabecera.realizadoPor || "—"} />
            <Dato l="Material" v={input.material || "—"} />
            {esLona ? <DatosLona rec={rec} /> : <DatosBaqueton rec={rec} />}
            {notas.map((n) => <Text key={n} style={s.nota}>• {n}</Text>)}
          </View>
          <View style={s.col}>
            {snapshotPng ? (
              /* eslint-disable-next-line jsx-a11y/alt-text */
              <Image src={snapshotPng} style={s.foto} />
            ) : (
              <Text style={{ color: "#999", textAlign: "center", marginTop: 60 }}>(sin vista 3D)</Text>
            )}
          </View>
        </View>
        <Reparto reparto={(rec.result as LonaResult | BaquetonResult).reparto} />
      </Page>
    </Document>
  );
}

function DatosLona({ rec }: { rec: PlanteamientoRecord }) {
  const r = rec.result as LonaResult;
  const i = rec.input as LonaInput;
  return (
    <>
      <Dato l="Paños a cortar" v={[
        `${i.cantidad} PAÑO DE ${fmt(r.panoDelantero.ancho)} x ${fmt(r.panoDelantero.alto)}`,
        `${i.cantidad} PAÑO DE ${fmt(r.panoTrasero.ancho)} x ${fmt(r.panoTrasero.alto)}`,
        r.panoContorno ? `${i.cantidad} PAÑO DE ${fmt(r.panoContorno.ancho)} x ${fmt(r.panoContorno.alto)}` : "",
      ].filter(Boolean).join("  ·  ")} />
      <Dato l="Medida lona hecha" v={`${fmt(r.lonaHecha.largo)} X ${fmt(r.lonaHecha.ancho)} · ALTO ${fmt(i.altoDelante)}`} />
      <Dato l="Perfil" v={i.tipoPerfil} />
      <Dato l="Recoge delante" v={r.recogeDelanteTexto} />
      <Dato l="Recoge atrás" v={r.recogeAtrasTexto} />
      <Dato l="Ventana" v={i.ventana ? "SÍ" : "NO"} />
      <Dato l="Bastilla enfundar" v={i.bastillaEnfundar ? "SÍ" : "NO"} />
      <Dato l="Ollaos" v={i.modoOllaos} />
      <Dato l="Metros de tela" v={r.metrosTela ? `${fmt(r.metrosTela)} m` : "—"} />
      {i.observaciones ? <Dato l="Observaciones" v={i.observaciones} /> : null}
    </>
  );
}

function DatosBaqueton({ rec }: { rec: PlanteamientoRecord }) {
  const r = rec.result as BaquetonResult;
  const i = rec.input as BaquetonInput;
  return (
    <>
      <Dato l="Paños a cortar" v={`${i.cantidad} PAÑO DE ${fmt(r.panoUnico.largo)} x ${fmt(r.panoUnico.ancho)}`} />
      <Dato l="Remolque hecho" v={`LARGO ${fmt(r.remolqueHecho.largo)} · ANCHO ${fmt(r.remolqueHecho.ancho)}`} />
      <Dato l="Baquetón" v={`${fmt(i.baqueton)} ${r.baquetonTrasero ? `· TRASERO ${fmt(r.baquetonTrasero)} NO EN LÍNEA` : "· EN LÍNEA"}`} />
      <Dato l="Cliente específico" v={i.clienteEspecifico} />
      <Dato l="Superficie de tela" v={`${fmt(r.superficieM2)} m2 / unidad`} />
      <Dato l="Metros de tela" v={r.metrosTela ? `${fmt(r.metrosTela)} m` : "—"} />
      <Dato l="Ollaos" v={i.modoOllaos} />
      {i.observaciones ? <Dato l="Observaciones" v={i.observaciones} /> : null}
    </>
  );
}
