import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export async function GET() {
  return NextResponse.json(await getStore().getParams());
}

export async function PUT(req: NextRequest) {
  const params = await req.json();
  await getStore().saveParams(params);
  return NextResponse.json(params);
}
