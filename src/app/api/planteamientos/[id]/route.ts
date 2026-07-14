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
