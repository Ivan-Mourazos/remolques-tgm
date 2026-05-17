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

const recogidas = {
  NO: { delante: 3, atras: 3 },
  GOMA: { delante: 27, atras: 27 },
};

const baquetonProfile = {
  demasiaLargoPiezaFinal: 1,
  demasiaAnchoPiezaFinal: 1,
  demasiaBaquetonPicostura: 2,
  demasiaBaquetonEnLargoDelante: 1,
  demasiaBaquetonEnLargoDetras: 1,
  demasiaAnchoExtra: 2,
};

const r = (v) => roundValue(v, lonaParams.decimales, lonaParams.redondeo);

function calculateLona(input) {
  const del = recogidas[input.recogeDelante];
  const tra = recogidas[input.recogeAtras];

  return {
    lonaHecha: {
      largo: r(input.largoPedido + lonaParams.demasiaLargoAnchoLonaHecha),
      ancho: r(input.anchoPedido + lonaParams.demasiaLargoAnchoLonaHecha),
    },
    contorno: {
      ancho: r(input.largoPedido + lonaParams.demasiaLargoContornoNormal),
      largo: r(
        input.contornoCad +
          (input.tieneCurva ? lonaParams.aumentoCurvaContorno : 0),
      ),
    },
    delantero: {
      ancho: r(input.anchoPedido + del.delante),
      alto: r(input.altoDelantero + lonaParams.demasiaAlto),
    },
    trasero: {
      ancho: r(input.anchoPedido + tra.atras),
      alto: r(input.altoTrasero + lonaParams.demasiaAlto),
    },
  };
}

function calculateBaqueton(input) {
  const largoHecho = r(input.largoPedido + baquetonProfile.demasiaLargoPiezaFinal);
  const anchoHecho = r(input.anchoPedido + baquetonProfile.demasiaAnchoPiezaFinal);
  const baquetonCostura = r(input.baqueton + baquetonProfile.demasiaBaquetonPicostura);
  const panoLargo = r(
    largoHecho +
      baquetonCostura * 2 +
      baquetonProfile.demasiaBaquetonEnLargoDelante +
      baquetonProfile.demasiaBaquetonEnLargoDetras,
  );
  const panoAncho = r(
    anchoHecho + baquetonCostura * 2 + baquetonProfile.demasiaAnchoExtra,
  );

  return {
    hecho: { largo: largoHecho, ancho: anchoHecho },
    baquetonCostura,
    pano: { largo: panoLargo, ancho: panoAncho },
    superficie: roundValue((panoLargo * panoAncho) / 10000, 4, "normal"),
  };
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    console.error(`FAIL: ${msg}. Expected ${expected}, got ${actual}`);
    process.exit(1);
  }
  console.log(`OK: ${msg}`);
}

function assertLonaCase(name, input, expected) {
  const result = calculateLona(input);
  assertEqual(result.lonaHecha.largo, expected.lonaLargo, `${name} lona largo`);
  assertEqual(result.lonaHecha.ancho, expected.lonaAncho, `${name} lona ancho`);
  assertEqual(result.contorno.ancho, expected.contornoAncho, `${name} contorno ancho`);
  assertEqual(result.contorno.largo, expected.contornoLargo, `${name} contorno largo`);
  assertEqual(result.delantero.ancho, expected.delanteroAncho, `${name} delantero ancho`);
  assertEqual(result.delantero.alto, expected.delanteroAlto, `${name} delantero alto`);
  assertEqual(result.trasero.ancho, expected.traseroAncho, `${name} trasero ancho`);
  assertEqual(result.trasero.alto, expected.traseroAlto, `${name} trasero alto`);
}

function assertBaquetonCase(name, input, expected) {
  const result = calculateBaqueton(input);
  assertEqual(result.hecho.largo, expected.hechoLargo, `${name} hecho largo`);
  assertEqual(result.hecho.ancho, expected.hechoAncho, `${name} hecho ancho`);
  assertEqual(result.baquetonCostura, expected.baquetonCostura, `${name} baquetón costura`);
  assertEqual(result.pano.largo, expected.panoLargo, `${name} paño largo`);
  assertEqual(result.pano.ancho, expected.panoAncho, `${name} paño ancho`);
  assertEqual(result.superficie, expected.superficie, `${name} superficie`);
}

assertLonaCase(
  "AR2601861",
  {
    largoPedido: 250,
    anchoPedido: 143,
    altoDelantero: 88,
    altoTrasero: 88,
    contornoCad: 321.6,
    tieneCurva: false,
    recogeDelante: "NO",
    recogeAtras: "GOMA",
  },
  {
    lonaLargo: 251,
    lonaAncho: 144,
    contornoAncho: 253,
    contornoLargo: 321.6,
    delanteroAncho: 146,
    delanteroAlto: 92.5,
    traseroAncho: 170,
    traseroAlto: 92.5,
  },
);

assertLonaCase(
  "AR2602177",
  {
    largoPedido: 160,
    anchoPedido: 120,
    altoDelantero: 34,
    altoTrasero: 34,
    contornoCad: 196,
    tieneCurva: false,
    recogeDelante: "NO",
    recogeAtras: "GOMA",
  },
  {
    lonaLargo: 161,
    lonaAncho: 121,
    contornoAncho: 163,
    contornoLargo: 196,
    delanteroAncho: 123,
    delanteroAlto: 38.5,
    traseroAncho: 147,
    traseroAlto: 38.5,
  },
);

assertBaquetonCase(
  "AR2602077",
  { largoPedido: 180, anchoPedido: 120, baqueton: 14 },
  {
    hechoLargo: 181,
    hechoAncho: 121,
    baquetonCostura: 16,
    panoLargo: 215,
    panoAncho: 155,
    superficie: 3.3325,
  },
);

assertBaquetonCase(
  "AR2602080",
  { largoPedido: 276, anchoPedido: 175, baqueton: 20 },
  {
    hechoLargo: 277,
    hechoAncho: 176,
    baquetonCostura: 22,
    panoLargo: 323,
    panoAncho: 222,
    superficie: 7.1706,
  },
);

console.log("\nAll verification checks passed.");
