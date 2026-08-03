import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const rec = await getStore().get(id);
  if (!rec) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(rec);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const borrado = await getStore().delete(id);
  if (!borrado) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
