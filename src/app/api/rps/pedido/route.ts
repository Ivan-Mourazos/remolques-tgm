import { pedidoRpsPorNumero } from "@/lib/rps/pedido-rps";
import { getMateriales } from "@/lib/store/rps-materiales";
import { materialPreferidoRps } from "@/lib/rps/material-rps";

export async function GET(request: Request) {
  try {
    const numero = new URL(request.url).searchParams.get("numero") ?? "";
    const [pedido, materiales] = await Promise.all([
      pedidoRpsPorNumero(numero),
      getMateriales(),
    ]);
    const enriquecido = pedido ? {
      ...pedido,
      lineas: pedido.lineas.map((linea) => ({
        ...linea,
        materialSugerido: materialPreferidoRps(linea, materiales) || null,
      })),
    } : null;
    return Response.json({ pedido: enriquecido }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "No se pudo consultar RPS." },
      { status: 503 },
    );
  }
}
