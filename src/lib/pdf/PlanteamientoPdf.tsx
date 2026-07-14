import {
  Document, Page, Text, View, Image, StyleSheet,
} from "@react-pdf/renderer";
import type { PlanteamientoRecord } from "@/lib/store/types";
import type { LonaResult } from "@/lib/calc/lona";
import type { BaquetonResult } from "@/lib/calc/baqueton";

const s = StyleSheet.create({
  page: { padding: 18, fontSize: 8, fontFamily: "Helvetica", color: "#111827" },
  cabecera: {
    height: 42, flexDirection: "row", alignItems: "stretch", border: "1 solid #111827",
  },
  marcaCaja: {
    width: 120, alignItems: "center", justifyContent: "center",
    borderRight: "1 solid #111827",
  },
  marca: { fontSize: 19, fontFamily: "Helvetica-Bold", color: "#f59e0b" },
  marcaSub: { marginTop: 1, fontSize: 6, fontFamily: "Helvetica-Bold" },
  tituloCaja: { flex: 1, alignItems: "center", justifyContent: "center" },
  titulo: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  cliente: { marginTop: 2, color: "#4b5563", fontSize: 7 },
  material: { marginTop: 2, fontFamily: "Helvetica-Bold", fontSize: 7 },
  pedidoCaja: {
    width: 170, justifyContent: "center", paddingHorizontal: 8,
    borderLeft: "1 solid #111827",
  },
  pedido: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  version: { marginTop: 3, color: "#4b5563", fontSize: 7 },
  plano: {
    height: 422, alignItems: "center", justifyContent: "center",
    borderLeft: "1 solid #111827", borderRight: "1 solid #111827",
    borderBottom: "1 solid #111827", padding: 8,
  },
  foto: { width: 760, height: 404, objectFit: "contain", alignSelf: "center" },
  sinPlano: { color: "#9ca3af", textAlign: "center" },
  tabla: { marginTop: 10, border: "1 solid #9ca3af" },
  tr: { flexDirection: "row", borderBottom: "1 solid #e5e7eb" },
  th: {
    flex: 1, padding: 3, backgroundColor: "#f3f4f6",
    fontFamily: "Helvetica-Bold", fontSize: 6.5, textAlign: "center",
  },
  thNombre: { flex: 6, textAlign: "left" },
  td: { flex: 1, padding: 3, fontSize: 6.5, textAlign: "center" },
  tdNombre: { flex: 6, padding: 3, fontSize: 6.5 },
});

const fmt = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 2 });

function Reparto({ reparto }: { reparto: { laterales: number[]; atras: number[]; delante: number[] } }) {
  const filas: Array<[string, number[]]> = [
    ["OLLAOS LATERALES DE ATRÁS A ADELANTE", reparto.laterales],
    ["OLLAOS ATRÁS DE IZQUIERDA A DERECHA", reparto.atras],
    ["OLLAOS DELANTE DE IZQUIERDA A DERECHA", reparto.delante],
  ];
  return (
    <View style={s.tabla}>
      <View style={s.tr}>
        <Text style={[s.th, s.thNombre]}>REPARTO DE OLLAOS</Text>
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

/** PDF de taller: solo el planteamiento técnico, sin formulario ni cálculos auxiliares. */
export function PlanteamientoPdf({ rec, snapshotPng }: {
  rec: PlanteamientoRecord; snapshotPng: string | null;
}) {
  const esLona = rec.tipo === "lona";
  const input = rec.input;
  const reparto = (rec.result as LonaResult | BaquetonResult).reparto;
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.cabecera}>
          <View style={s.marcaCaja}>
            <Text style={s.marca}>TGM</Text>
            <Text style={s.marcaSub}>TOLDOS GÓMEZ</Text>
          </View>
          <View style={s.tituloCaja}>
            <Text style={s.titulo}>{esLona ? "PLANTEAMIENTO · LONA REMOLQUE" : "PLANTEAMIENTO · BAQUETÓN"}</Text>
            <Text style={s.cliente}>{input.cabecera.cliente || "CLIENTE SIN INDICAR"}</Text>
            <Text style={s.material}>LONA: {input.material || "SIN INDICAR"}</Text>
          </View>
          <View style={s.pedidoCaja}>
            <Text style={s.pedido}>Nº PEDIDO: {input.cabecera.numeroPedido || "-"}</Text>
            <Text style={s.version}>VERSIÓN {input.cabecera.version || "-"}</Text>
          </View>
        </View>
        <View style={s.plano}>
          {snapshotPng ? (
            /* eslint-disable-next-line jsx-a11y/alt-text */
            <Image src={snapshotPng} style={s.foto} />
          ) : (
            <Text style={s.sinPlano}>(sin vista técnica)</Text>
          )}
        </View>
        <Reparto reparto={reparto} />
      </Page>
    </Document>
  );
}
