import {
  Document, Page, Text, View, Image, StyleSheet,
} from "@react-pdf/renderer";
import type { PlanteamientoRecord } from "@/lib/store/types";
import type { LonaInput, LonaResult } from "@/lib/calc/lona";
import type { BaquetonInput, BaquetonResult } from "@/lib/calc/baqueton";
import { nombrePerfil } from "@/lib/calc/params";
import { datosGeometriaPdf } from "@/lib/pdf/datos-geometria";

const s = StyleSheet.create({
  page: { padding: 10, fontSize: 8.5, fontFamily: "Helvetica", color: "#171717" },
  marco: { border: "1 solid #171717" },
  cabecera: { height: 66, flexDirection: "row" },
  logo: {
    width: 122, borderRight: "1 solid #171717", alignItems: "center", justifyContent: "center",
  },
  logoImagen: { width: 78, height: 58, objectFit: "contain" },
  logoMarca: { fontSize: 24, fontFamily: "Helvetica-Bold", color: "#f3a000" },
  logoSub: { marginTop: 1, fontSize: 6.5, fontFamily: "Helvetica-Bold" },
  cabCentro: { flex: 1 },
  cabDerecha: { width: 192, borderLeft: "1 solid #171717" },
  cabFila: { minHeight: 22, flexDirection: "row", borderBottom: "0.6 solid #171717" },
  cabFilaUltima: { borderBottom: 0 },
  cabEtiqueta: {
    width: 78, padding: 4.5, fontSize: 7.8, fontStyle: "italic", color: "#404040",
    borderRight: "0.6 solid #171717",
  },
  cabValor: { flex: 1, padding: 4.5, fontSize: 9, fontFamily: "Helvetica-Bold" },
  banda: {
    height: 28, alignItems: "center", justifyContent: "center",
    borderTop: "1 solid #171717", borderBottom: "1 solid #171717",
  },
  bandaTexto: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  cuerpo: { minHeight: 300, flexDirection: "row", padding: 8 },
  datos: { width: 250, paddingRight: 8, justifyContent: "flex-start" },
  dibujo: {
    flex: 1, minHeight: 215, alignItems: "center", justifyContent: "center", padding: 2,
    backgroundColor: "#f5f8f7", border: "0.6 solid #d4dfdb", borderRadius: 5,
  },
  foto: { width: "100%", height: 240, objectFit: "contain" },
  sinPlano: { color: "#a3a3a3" },
  filaDato: { flexDirection: "row", marginBottom: 4 },
  etiqueta: {
    width: 96, fontSize: 8, fontFamily: "Helvetica-Bold", textDecoration: "underline",
  },
  valor: { flex: 1, fontSize: 8.8, fontFamily: "Helvetica-Bold", lineHeight: 1.2 },
  bloque: { flexDirection: "row", marginBottom: 5 },
  bloqueValores: { flex: 1 },
  valorLinea: { fontSize: 8.8, fontFamily: "Helvetica-Bold", marginBottom: 2.5 },
  separacion: { height: 5 },
  tablaTitulo: { marginTop: 8, marginBottom: 2, fontSize: 8.4, fontFamily: "Helvetica-Bold" },
  tabla: { border: "0.8 solid #171717" },
  tr: { minHeight: 18, flexDirection: "row", borderBottom: "0.6 solid #171717" },
  trUltima: { borderBottom: 0 },
  th: {
    flex: 1, padding: 3, backgroundColor: "#d4d4d4", fontFamily: "Helvetica-Bold",
    fontSize: 7.2, textAlign: "center", borderRight: "0.6 solid #171717",
  },
  thNombre: { flex: 7.5, textAlign: "left" },
  td: { flex: 1, padding: 3, fontSize: 7.2, textAlign: "center", borderRight: "0.6 solid #171717" },
  tdNombre: { flex: 7.5, padding: 3, fontSize: 7.2, fontFamily: "Helvetica-Bold", borderRight: "0.6 solid #171717" },
  total: { borderRight: 0, fontFamily: "Helvetica-Bold" },
});

const fmt = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 2 });
const fechaEs = (fecha: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : fecha;
};

function CabFila({ etiqueta, valor, ultima = false }: { etiqueta: string; valor: string; ultima?: boolean }) {
  return (
    <View style={[s.cabFila, ...(ultima ? [s.cabFilaUltima] : [])]}>
      <Text style={s.cabEtiqueta}>{etiqueta}</Text>
      <Text style={s.cabValor}>{valor || "-"}</Text>
    </View>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={s.filaDato}>
      <Text style={s.etiqueta}>{etiqueta}</Text>
      <Text style={s.valor}>{valor || "-"}</Text>
    </View>
  );
}

function Reparto({ reparto, modo, primerOllao }: {
  reparto: { laterales: number[]; atras: number[]; delante: number[] };
  modo: string;
  primerOllao: number;
}) {
  const filas: Array<[string, number[]]> = [
    ["OLLAOS LATERALES DE ATRÁS A ADELANTE", reparto.laterales],
    ["OLLAOS ATRÁS DE IZQUIERDA A DERECHA", reparto.atras],
    ["OLLAOS DELANTE DE IZQUIERDA A DERECHA", reparto.delante],
  ];
  return (
    <>
      <Text style={s.tablaTitulo}>
        {modo === "REPARTIDOS"
          ? `REPARTIDOS · PRIMER Y ÚLTIMO OLLAO A ${fmt(primerOllao)} CM DEL BORDE`
          : modo}
      </Text>
      <View style={s.tabla}>
        <View style={s.tr}>
          <Text style={[s.th, s.thNombre]} />
          {Array.from({ length: 12 }, (_, i) => <Text key={i} style={s.th}>{i + 1}</Text>)}
          <Text style={[s.th, s.total]}>TOTAL</Text>
        </View>
        {filas.map(([nombre, posiciones], fila) => (
          <View key={nombre} style={[s.tr, ...(fila === filas.length - 1 ? [s.trUltima] : [])]}>
            <Text style={s.tdNombre}>{nombre}</Text>
            {Array.from({ length: 12 }, (_, i) => (
              <Text key={i} style={s.td}>{posiciones[i] == null ? "" : fmt(posiciones[i])}</Text>
            ))}
            <Text style={[s.td, s.total]}>{posiciones.length}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

function DatosLona({ rec }: { rec: PlanteamientoRecord }) {
  const i = rec.input as LonaInput;
  const r = rec.result as LonaResult;
  // vacío (0) = igual que delante
  const altoAtras = i.altoAtras > 0 ? i.altoAtras : i.altoDelante;
  const panos = [
    `${i.cantidad} PAÑO DE ${fmt(r.panoDelantero.ancho)} x ${fmt(r.panoDelantero.alto)}`,
    `${i.cantidad} PAÑO DE ${fmt(r.panoTrasero.ancho)} x ${fmt(r.panoTrasero.alto)}`,
    ...(r.panoContorno ? [`${i.cantidad} PAÑO DE ${fmt(r.panoContorno.ancho)} x ${fmt(r.panoContorno.alto)}`] : []),
  ];
  return (
    <>
      <View style={s.bloque}>
        <Text style={s.etiqueta}>PAÑOS A CORTAR:</Text>
        <View style={s.bloqueValores}>
          {panos.map((pano) => <Text key={pano} style={s.valorLinea}>{pano}</Text>)}
        </View>
      </View>
      <Dato etiqueta="MEDIDA LONA HECHA" valor={`${fmt(r.lonaHecha.largo)} X ${fmt(r.lonaHecha.ancho)}`} />
      {(i.anchoAtras ?? 0) > 0 && i.anchoAtras !== i.ancho && (
        <Dato etiqueta="" valor={`ANCHO DELANTE ${fmt(i.ancho)} / DETRÁS ${fmt(i.anchoAtras!)}`} />
      )}
      <Dato etiqueta="" valor={altoAtras !== i.altoDelante
        ? `ALTO DELANTE ${fmt(i.altoDelante)} / DETRÁS ${fmt(altoAtras)}`
        : `ALTO ${fmt(i.altoDelante)}`} />
      <Dato etiqueta="CONTORNO DE CORTE" valor={r.contornoAjustado ? fmt(r.contornoAjustado) : "PENDIENTE"} />
      <Dato etiqueta="PERFIL" valor={nombrePerfil(i.tipoPerfil)} />
      <View style={s.bloque}>
        <Text style={s.etiqueta}>GEOMETRÍA:</Text>
        <View style={s.bloqueValores}>
          {datosGeometriaPdf(i).map((dato) => <Text key={dato} style={s.valorLinea}>{dato}</Text>)}
        </View>
      </View>
      <Dato etiqueta="RECOGE DELANTE" valor={r.recogeDelanteTexto} />
      <Dato etiqueta="RECOGE ATRÁS" valor={r.recogeAtrasTexto} />
      <Dato etiqueta="VENTANA" valor={i.ventana
        ? (i.ventanaAncho ?? 0) > 0 && (i.ventanaAlto ?? 0) > 0
          ? `SÍ · ${fmt(i.ventanaAncho!)} X ${fmt(i.ventanaAlto!)} CM`
          : "SÍ · MEDIDAS PENDIENTES"
        : "NO"} />
      <View style={s.separacion} />
      <Dato etiqueta="ROTULACIÓN:" valor={i.rotulacion ? "SÍ" : "NO"} />
      <View style={s.separacion} />
      <Dato etiqueta="OLLAOS:" valor={i.modoOllaos} />
      <Dato etiqueta="MATERIAL" valor={i.material} />
      {i.observaciones ? <Dato etiqueta="OBSERVACIONES" valor={i.observaciones} /> : null}
    </>
  );
}

function DatosBaqueton({ rec }: { rec: PlanteamientoRecord }) {
  const i = rec.input as BaquetonInput;
  const r = rec.result as BaquetonResult;
  return (
    <>
      <View style={s.bloque}>
        <Text style={s.etiqueta}>PAÑOS A CORTAR:</Text>
        <Text style={s.valor}>{i.cantidad} PAÑO DE {fmt(r.panoUnico.largo)} x {fmt(r.panoUnico.ancho)}</Text>
      </View>
      <Dato etiqueta="MEDIDA REMOLQUE" valor={`${fmt(r.remolqueHecho.largo)} X ${fmt(r.remolqueHecho.ancho)}`} />
      <Dato etiqueta="BAQUETÓN" valor={`${fmt(i.baqueton)}${r.baquetonTrasero ? ` / TRASERO ${fmt(r.baquetonTrasero)}` : " EN LÍNEA"}`} />
      <Dato etiqueta="CLIENTE ESPECÍFICO" valor={i.clienteEspecifico} />
      <View style={s.separacion} />
      <Dato etiqueta="ROTULACIÓN:" valor={i.rotulacion ? "SÍ" : "NO"} />
      <View style={s.separacion} />
      <Dato etiqueta="OLLAOS:" valor={i.modoOllaos} />
      <Dato etiqueta="MATERIAL" valor={i.material} />
      {i.observaciones ? <Dato etiqueta="OBSERVACIONES" valor={i.observaciones} /> : null}
    </>
  );
}

function PaginaPlanteamiento({ rec, png, logoTgm }: {
  rec: PlanteamientoRecord; png: string | null; logoTgm?: string | null;
}) {
  const input = rec.input;
  const resultado = rec.result as LonaResult | BaquetonResult;
  return (
    <Page size="A4" orientation="landscape" style={s.page}>
      <View style={s.marco}>
        <View style={s.cabecera}>
          <View style={s.logo}>
            {logoTgm ? (
              /* eslint-disable-next-line jsx-a11y/alt-text */
              <Image src={logoTgm} style={s.logoImagen} />
            ) : (
              <>
                <Text style={s.logoMarca}>TGM</Text>
                <Text style={s.logoSub}>TOLDOS GÓMEZ</Text>
              </>
            )}
          </View>
          <View style={s.cabCentro}>
            <CabFila etiqueta="CLIENTE:" valor={input.cabecera.cliente} />
            <CabFila etiqueta="REVISIÓN:" valor={input.cabecera.revision} />
            <CabFila etiqueta="REALIZADO" valor={input.cabecera.realizadoPor} ultima />
          </View>
          <View style={s.cabDerecha}>
            <CabFila etiqueta="Nº PEDIDO:" valor={input.cabecera.numeroPedido} />
            <CabFila etiqueta="O.F.:" valor={input.cabecera.ordenFabricacion ?? ""} />
            <CabFila etiqueta="FECHA:" valor={fechaEs(input.cabecera.fecha)} ultima />
          </View>
        </View>
        <View style={s.banda}><Text style={s.bandaTexto}>REMOLQUES</Text></View>
        <View style={s.cuerpo}>
          <View style={s.datos}>
            {rec.tipo === "lona" ? <DatosLona rec={rec} /> : <DatosBaqueton rec={rec} />}
          </View>
          <View style={s.dibujo}>
            {png ? (
              /* eslint-disable-next-line jsx-a11y/alt-text */
              <Image src={png} style={s.foto} />
            ) : <Text style={s.sinPlano}>(sin vista técnica)</Text>}
          </View>
        </View>
      </View>
      <Reparto
        reparto={resultado.reparto}
        modo={input.modoOllaos}
        primerOllao={input.primerOllao ?? rec.paramsSnapshot?.primerOllao ?? 2.5}
      />
    </Page>
  );
}

/** Hoja de taller: una página por remolque (versión) del pedido. */
export function PlanteamientoPdf({ paginas, logoTgm }: {
  paginas: Array<{ rec: PlanteamientoRecord; png: string | null }>;
  logoTgm?: string | null;
}) {
  return (
    <Document>
      {paginas.map(({ rec, png }) => (
        <PaginaPlanteamiento key={rec.id} rec={rec} png={png} logoTgm={logoTgm} />
      ))}
    </Document>
  );
}
