/** @typedef {{ decimales: number, redondeo: string }} LonaParams */

function roundValue(value, decimals, mode = "normal") {
  const factor = 10 ** decimals;
  if (mode === "up") return Math.ceil(value * factor) / factor;
  if (mode === "down") return Math.floor(value * factor) / factor;
  return Math.round(value * factor) / factor;
}

const lonaParams = {
  demasiaLargoAnchoLonaHecha: 1,
  demasiaAlto: 4.5,
  demasiaLargoContornoNormal: 3,
  demasiaLargoContornoEnfundar: 13,
  aumentoCurvaContorno: 1.5,
  decimales: 1,
  redondeo: "normal",
};

const recogidaTypes = [
  { nombre: "NO", delante: 3, atras: 3 },
  { nombre: "GOMA", delante: 27, atras: 27 },
];

const r = (v) => roundValue(v, lonaParams.decimales, lonaParams.redondeo);

const largoPedido = 250;
const anchoPedido = 143;
const altoDelantero = 88;
const altoTrasero = 88;

const lonaHecha = {
  largo: r(largoPedido + lonaParams.demasiaLargoAnchoLonaHecha),
  ancho: r(anchoPedido + lonaParams.demasiaLargoAnchoLonaHecha),
};
const panoDel = {
  ancho: r(anchoPedido + 3),
  alto: r(altoDelantero + lonaParams.demasiaAlto),
};
const panoTra = {
  ancho: r(anchoPedido + 27),
  alto: r(altoTrasero + lonaParams.demasiaAlto),
};

const profile = {
  demasiaLargoPiezaFinal: 1,
  demasiaAnchoPiezaFinal: 1,
  demasiaBaquetonPicostura: 2,
  demasiaBaquetonEnLargoDelante: 1,
  demasiaBaquetonEnLargoDetras: 1,
  demasiaAnchoExtra: 2,
};

const largoHecho = r(180 + profile.demasiaLargoPiezaFinal);
const anchoHecho = r(120 + profile.demasiaAnchoPiezaFinal);
const baquetonCostura = r(14 + profile.demasiaBaquetonPicostura);
const panoLargo = r(
  largoHecho + baquetonCostura * 2 + profile.demasiaBaquetonEnLargoDelante + profile.demasiaBaquetonEnLargoDetras,
);
const panoAncho = r(anchoHecho + baquetonCostura * 2 + profile.demasiaAnchoExtra);
const superficie = roundValue((panoLargo * panoAncho) / 10000, 4, "normal");

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
  console.log("OK:", msg);
}

assert(lonaHecha.largo === 251 && lonaHecha.ancho === 144, "Lona hecha 251×144");
assert(panoDel.ancho === 146 && panoDel.alto === 92.5, "Paño delantero 146×92.5");
assert(panoTra.ancho === 170 && panoTra.alto === 92.5, "Paño trasero 170×92.5");
assert(largoHecho === 181 && anchoHecho === 121, "Baquetón hecho 181×121");
assert(baquetonCostura === 16, "Baquetón costura 16");
assert(panoLargo === 215 && panoAncho === 155, "Paño 215×155");
assert(superficie === 3.3325, "Superficie 3.3325 m²");

console.log("\nAll verification checks passed.");
