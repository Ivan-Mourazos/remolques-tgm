import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { validarParams } from "@/lib/calc/validar-params";

export async function GET() {
  return NextResponse.json(await getStore().getParams());
}

export async function PUT(req: NextRequest) {
  let bruto: unknown;
  try {
    bruto = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de petición inválido" }, { status: 400 });
  }
  const res = validarParams(bruto);
  if (!res.ok) return NextResponse.json({ error: res.errores.join(" · ") }, { status: 400 });
  await getStore().saveParams(res.params);
  return NextResponse.json(res.params);
}
