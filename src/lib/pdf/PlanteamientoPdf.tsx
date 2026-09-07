import {
  Document, Page, Text, View, Image, StyleSheet,
} from "@react-pdf/renderer";
import type { PlanteamientoRecord } from "@/lib/store/types";
import type { LonaResult } from "@/lib/calc/lona";
import type { BaquetonResult } from "@/lib/calc/baqueton";
import { datosHoja } from "@/lib/pdf/datos-hoja";
import { registrarFuentes } from "@/lib/pdf/fuentes";

// Se resuelve al importar el módulo, que en esta app solo pasa en el servidor.
const FAMILIA = registrarFuentes();

const TINTA = "#1a1a1a";
const GRIS = "#6b6b6b";
const FILETE = "#c9c9c9";

// La banda de corte no reparte su ancho a partes iguales: los paños son tres
// líneas de texto y el contorno es un número.
const ANCHOS_CELDA = [2.4, 1.5, 1];

const s = StyleSheet.create({
  page: {
    paddingHorizontal: 20, paddingVertical: 16,
    fontSize: 8, fontFamily: FAMILIA, color: TINTA,
  },

  cabecera: { flexDirection: "row", paddingBottom: 8, borderBottom: `1 solid ${TINTA}` },
  logo: { width: 96, justifyContent: "center" },
  logoImagen: { width: 82, height: 46, objectFit: "contain" },
  logoMarca: { fontSize: 22, fontWeight: 700, color: "#f3a000" },
  logoSub: { marginTop: 1, fontSize: 6.5, fontWeight: 600 },
  cabCliente: { flex: 1, paddingLeft: 12 },
  cabPedido: { width: 210 },
  cabValorGrande: { fontSize: 12, fontWeight: 700, marginBottom: 3 },
  cabSecundarios: { flexDirection: "row" },
  cabDato: { flexDirection: "row", marginRight: 18 },
  cabDatoEtiqueta: {
    fontSize: 6.5, fontWeight: 600, letterSpacing: 0.6, color: GRIS, marginRight: 4,
  },
  cabDatoValor: { fontSize: 8.5, fontWeight: 600 },

  identificacion: { paddingVertical: 4, borderBottom: `0.5 solid ${FILETE}` },
  identificacionTexto: {
    fontSize: 8, fontWeight: 700, letterSpacing: 1.4, textAlign: "center",
  },

  // Rótulo de grupo: pesa poco y ordena mucho.
  rotulo: { fontSize: 6.5, fontWeight: 600, letterSpacing: 0.8, color: GRIS, marginBottom: 3 },

  bandaCorte: { flexDirection: "row", paddingVertical: 8, borderBottom: `0.5 solid ${FILETE}` },
  celda: { paddingRight: 10 },
  celdaConFilete: { borderLeft: `0.5 solid ${FILETE}`, paddingLeft: 12 },
  celdaLinea: { fontSize: 12, fontWeight: 700, marginBottom: 1.5 },
  celdaNota: { fontSize: 7.5, color: GRIS, marginTop: 1 },

  // La única banda elástica: si las observaciones crecen, el dibujo cede alto.
  cuerpo: { flexDirection: "row", flexGrow: 1, flexShrink: 1, flexBasis: 236, paddingVertical: 8 },
  columna: { width: 230, paddingRight: 12, borderRight: `0.5 solid ${FILETE}` },
  grupo: { marginBottom: 12 },
  filaDato: { flexDirection: "row", marginBottom: 3.5 },
  etiqueta: { width: 88, fontSize: 7.5, color: GRIS, paddingTop: 1 },
  valores: { flex: 1 },
  valor: { fontSize: 9.5, fontWeight: 600, lineHeight: 1.15 },
  dibujo: { flex: 1, alignItems: "center", justifyContent: "center", paddingLeft: 12 },
  foto: { width: "100%", height: "100%", objectFit: "contain" },
  sinPlano: { color: "#a3a3a3" },

  pie: {
    paddingVertical: 6,
    borderTop: `0.5 solid ${FILETE}`, borderBottom: `0.5 solid ${FILETE}`,
  },
  filaPie: { flexDirection: "row", marginBottom: 3 },
  etiquetaPie: {
    width: 88, fontSize: 6.5, fontWeight: 600, letterSpacing: 0.8, color: GRIS, paddingTop: 2,
  },
  valorPie: { flex: 1, fontSize: 9.5, fontWeight: 600 },
  // Regular, no negrita: el texto largo en negrita se lee peor.
  observaciones: { flex: 1, fontSize: 9.5, lineHeight: 1.35 },

  tablaTitulo: {
    marginTop: 8, marginBottom: 3,
    fontSize: 6.5, fontWeight: 600, letterSpacing: 0.8, color: GRIS,
  },
  tabla: { borderTop: `0.5 solid ${TINTA}`, borderBottom: `0.5 solid ${TINTA}` },
  tr: {
    minHeight: 15, flexDirection: "row",
    borderBottom: `0.5 solid ${FILETE}`, alignItems: "center",
  },
  trUltima: { borderBottom: 0 },
  trCabecera: { borderBottom: `0.5 solid ${TINTA}` },
  th: {
    flex: 1, paddingVertical: 3, fontSize: 6.5, fontWeight: 600, color: GRIS,
    textAlign: "center", borderRight: `0.5 solid ${FILETE}`,
  },
  thNombre: { flex: 7.5, textAlign: "left", paddingLeft: 3 },
  td: {
    flex: 1, paddingVertical: 3, fontSize: 8, textAlign: "center",
    borderRight: `0.5 solid ${FILETE}`,
  },
  tdNombre: {
    flex: 7.5, paddingVertical: 3, paddingLeft: 3, fontSize: 7.5, fontWeight: 600,
    borderRight: `0.5 solid ${FILETE}`,
  },
  sinFilete: { borderRight: 0 },
});

const fmt = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 2 });
const fechaEs = (fecha: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : fecha;
};

function CabDato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={s.cabDato}>
      <Text style={s.cabDatoEtiqueta}>{etiqueta}</Text>
      <Text style={s.cabDatoValor}>{valor || "—"}</Text>
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
          ? `OLLAOS · REPARTIDOS · PRIMER Y ÚLTIMO OLLAO A ${fmt(primerOllao)} CM DEL BORDE`
          : `OLLAOS · ${modo || "SIN ELEGIR"}`}
      </Text>
      <View style={s.tabla}>
        <View style={[s.tr, s.trCabecera]}>
          <Text style={[s.th, s.thNombre]} />
          {Array.from({ length: 12 }, (_, i) => <Text key={i} style={s.th}>{i + 1}</Text>)}
          <Text style={[s.th, s.sinFilete]}>TOTAL</Text>
        </View>
        {filas.map(([nombre, posiciones], fila) => (
          <View key={nombre} style={[s.tr, ...(fila === filas.length - 1 ? [s.trUltima] : [])]}>
            <Text style={s.tdNombre}>{nombre}</Text>
            {Array.from({ length: 12 }, (_, i) => (
              <Text key={i} style={s.td}>{posiciones[i] == null ? "" : fmt(posiciones[i])}</Text>
            ))}
            <Text style={[s.td, s.sinFilete]}>{posiciones.length}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

function PaginaPlanteamiento({ rec, png, logoTgm, indice, total }: {
  rec: PlanteamientoRecord;
  png: string | null;
  logoTgm?: string | null;
  indice: number;
  total: number;
}) {
  const cabecera = rec.input.cabecera;
  const resultado = rec.result as LonaResult | BaquetonResult;
  const hoja = datosHoja(rec, indice, total);
  return (
    <Page size="A4" orientation="landscape" style={s.page}>
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
        <View style={s.cabCliente}>
          <Text style={s.rotulo}>CLIENTE</Text>
          <Text style={s.cabValorGrande}>{cabecera.cliente || "—"}</Text>
          <View style={s.cabSecundarios}>
            <CabDato etiqueta="REVISIÓN" valor={cabecera.revision} />
            <CabDato etiqueta="REALIZADO" valor={cabecera.realizadoPor} />
          </View>
        </View>
        <View style={s.cabPedido}>
          <Text style={s.rotulo}>Nº PEDIDO</Text>
          <Text style={s.cabValorGrande}>{cabecera.numeroPedido || "—"}</Text>
          <View style={s.cabSecundarios}>
            <CabDato etiqueta="O.F." valor={cabecera.ordenFabricacion ?? ""} />
            <CabDato etiqueta="FECHA" valor={fechaEs(cabecera.fecha)} />
          </View>
        </View>
      </View>

      <View style={s.identificacion}>
        <Text style={s.identificacionTexto}>{hoja.titulo}</Text>
      </View>

      <View style={s.bandaCorte}>
        {hoja.banda.map((celda, indiceCelda) => (
          <View
            key={celda.titulo}
            style={[
              s.celda,
              { flex: ANCHOS_CELDA[indiceCelda] ?? 1 },
              ...(indiceCelda > 0 ? [s.celdaConFilete] : []),
            ]}
          >
            <Text style={s.rotulo}>{celda.titulo}</Text>
            {celda.lineas.map((linea, i) => (
              <Text key={i} style={s.celdaLinea}>{linea}</Text>
            ))}
            {celda.notas.map((nota, i) => (
              <Text key={i} style={s.celdaNota}>{nota}</Text>
            ))}
          </View>
        ))}
      </View>

      <View style={s.cuerpo}>
        <View style={s.columna}>
          {hoja.grupos.map((grupo) => (
            <View key={grupo.titulo} style={s.grupo}>
              <Text style={s.rotulo}>{grupo.titulo}</Text>
              {grupo.datos.map((dato) => (
                <View key={dato.etiqueta} style={s.filaDato}>
                  <Text style={s.etiqueta}>{dato.etiqueta}</Text>
                  <View style={s.valores}>
                    {dato.valores.map((valor, i) => (
                      <Text key={i} style={s.valor}>{valor}</Text>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>
        <View style={s.dibujo}>
          {png ? (
            /* eslint-disable-next-line jsx-a11y/alt-text */
            <Image src={png} style={s.foto} />
          ) : <Text style={s.sinPlano}>(sin vista técnica)</Text>}
        </View>
      </View>

      <View style={s.pie}>
        <View style={s.filaPie}>
          <Text style={s.etiquetaPie}>MATERIAL</Text>
          <Text style={s.valorPie}>{hoja.material}</Text>
        </View>
        <View style={s.filaPie}>
          <Text style={s.etiquetaPie}>OBSERVACIONES</Text>
          <Text style={s.observaciones}>{hoja.observaciones}</Text>
        </View>
      </View>

      <Reparto
        reparto={resultado.reparto}
        modo={rec.input.modoOllaos}
        primerOllao={rec.input.primerOllao ?? rec.paramsSnapshot?.primerOllao ?? 2.5}
      />
    </Page>
  );
}

/** Hoja de taller: una página por remolque o baquetón del pedido. */
export function PlanteamientoPdf({ paginas, logoTgm }: {
  paginas: Array<{ rec: PlanteamientoRecord; png: string | null }>;
  logoTgm?: string | null;
}) {
  return (
    <Document>
      {paginas.map(({ rec, png }, indice) => (
        <PaginaPlanteamiento
          key={rec.id}
          rec={rec}
          png={png}
          logoTgm={logoTgm}
          indice={indice}
          total={paginas.length}
        />
      ))}
    </Document>
  );
}
