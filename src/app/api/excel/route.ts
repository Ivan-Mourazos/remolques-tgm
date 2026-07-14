import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { nombreExcel } from "@/lib/excel/nombre-excel";
import { buildPlanteamientoWorkbook } from "@/lib/excel/planteamiento-excel";
import { getMateriales } from "@/lib/store/rps-materiales";

// Genera y devuelve el .xlsx del planteamiento. NO escribe en disco ni en red:
// el cliente lo guarda con «Guardar como» en la carpeta de oficina técnica.
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

  try {
    const materiales = await getMateriales();
    const material = materiales.find((m) => m.nombre === rec.input.material);
    const buffer = await buildPlanteamientoWorkbook(rec, snapshot, material);
    const nombre = nombreExcel(rec.numeroPedido);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "X-Nombre-Excel": nombre,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: `No se pudo generar el Excel: ${(e as Error).message}` },
      { status: 500 },
    );
  }
}
