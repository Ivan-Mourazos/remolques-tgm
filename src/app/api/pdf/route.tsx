import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getStore } from "@/lib/store";
import { nombrePdf } from "@/lib/pdf/ruta-pdf";
import { PlanteamientoPdf } from "@/lib/pdf/PlanteamientoPdf";

export async function POST(req: NextRequest) {
  let id: string;
  let snapshot: string | null;
  try {
    ({ id, snapshot = null } = await req.json());
  } catch {
    return NextResponse.json({ error: "Cuerpo de petición inválido" }, { status: 400 });
  }
  const rec = await getStore().get(id);
  if (!rec) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const doc = <PlanteamientoPdf rec={rec} snapshotPng={snapshot ?? null} />;

  try {
    const buffer = await renderToBuffer(doc);

    const nombre = nombrePdf(rec.numeroPedido || "SIN-PEDIDO", rec.version);

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
