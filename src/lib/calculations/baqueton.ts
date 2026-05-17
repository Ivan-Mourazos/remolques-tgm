import { roundValue } from "@/lib/calculations/round";
import type {
  AppSettings,
  BaquetonCalculationResult,
  BaquetonFormInput,
  BaquetonProfile,
} from "@/lib/types";

function getProfile(
  settings: AppSettings,
  profileId: string,
): BaquetonProfile {
  return (
    settings.baquetonProfiles.find((p) => p.id === profileId) ??
    settings.baquetonProfiles[0]
  );
}

export function calculateBaqueton(
  input: BaquetonFormInput,
  settings: AppSettings,
): BaquetonCalculationResult {
  const profile = getProfile(settings, input.perfilCalculoId);
  const decimals = settings.lonaParams.decimales;
  const redondeo = settings.lonaParams.redondeo;
  const r = (v: number) => roundValue(v, decimals, redondeo);

  const largoHecho = r(input.largoPedido + profile.demasiaLargoPiezaFinal);
  const anchoHecho = r(input.anchoPedido + profile.demasiaAnchoPiezaFinal);
  const baquetonCostura = r(
    input.baqueton + profile.demasiaBaquetonPicostura,
  );

  const panoLargo = r(
    largoHecho +
      baquetonCostura * 2 +
      profile.demasiaBaquetonEnLargoDelante +
      profile.demasiaBaquetonEnLargoDetras,
  );
  const legacyAnchoExtra = profile.demasiaAnchoExtra ?? 0;
  const demasiaAnchoDelante =
    profile.demasiaBaquetonEnAnchoDelante ?? legacyAnchoExtra / 2;
  const demasiaAnchoDetras =
    profile.demasiaBaquetonEnAnchoDetras ?? legacyAnchoExtra / 2;
  const panoAncho = r(
    anchoHecho + baquetonCostura * 2 + demasiaAnchoDelante + demasiaAnchoDetras,
  );
  const superficieM2 = roundValue(
    (panoLargo * panoAncho) / 10000,
    4,
    redondeo,
  );

  const ollaos = [input.tipoOllaos, input.ollaosManuales]
    .filter(Boolean)
    .join(" — ");

  const notasAutomaticas: string[] = [];
  if (input.rotulacion) {
    notasAutomaticas.push("Incluye rotulación.");
  }
  if (input.tipoOllaos) {
    notasAutomaticas.push(`Tipo de ollaos: ${input.tipoOllaos}.`);
  }
  notasAutomaticas.push(`Perfil de cálculo: ${profile.nombre}.`);

  return {
    medidasRemolqueHecho: { largo: largoHecho, ancho: anchoHecho },
    baquetonCostura,
    panoUnico: { largo: panoLargo, ancho: panoAncho },
    superficieM2,
    material: input.material,
    ollaos,
    observaciones: input.observaciones,
    notasAutomaticas,
  };
}
