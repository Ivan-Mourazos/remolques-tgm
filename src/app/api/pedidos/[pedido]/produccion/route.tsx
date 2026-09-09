import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Abre Revisión y pulsa Guardar planteamiento. Las aprobaciones se gestionan en Coordina." },
    { status: 410 },
  );
}
