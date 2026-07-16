import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getStore } from "@/lib/store";
import { nombrePdf } from "@/lib/pdf/ruta-pdf";
import { PlanteamientoPdf } from "@/lib/pdf/PlanteamientoPdf";
import { getLogoTgmDataUri } from "@/lib/assets/logo-tgm";
import type { PlanteamientoRecord } from "@/lib/store/types";

// Devuelve el PDF del pedido (una página por versión). NO escribe en disco ni
// en red: el cliente lo guarda con «Guardar como».
export async function POST(req: NextRequest) {
  let ids: string[];
  let snapshots: Record<string, string | null>;
  try {
    const body = await req.json();
    ids = Array.isArray(body.ids) ? body.ids : [];
    snapshots = body.snapshots ?? {};
  } catch {
    return NextResponse.json({ error: "Cuerpo de petición inválido" }, { status: 400 });
  }
  const store = getStore();
  const recs = (await Promise.all(ids.map((id) => store.get(id))))
    .filter((r): r is PlanteamientoRecord => r !== null);
  if (recs.length === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const doc = (
    <PlanteamientoPdf
      paginas={recs.map((rec) => ({ rec, png: snapshots[rec.id] ?? null }))}
      logoTgm={getLogoTgmDataUri()}
    />
  );

  try {
    const buffer = await renderToBuffer(doc);
    const nombre = nombrePdf(recs[0].numeroPedido);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "X-Nombre-Pdf": nombre,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: `No se pudo generar el PDF: ${(e as Error).message}` },
      { status: 500 },
    );
  }
}
