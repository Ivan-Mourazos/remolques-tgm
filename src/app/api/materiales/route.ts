import { NextResponse } from "next/server";
import { getMateriales } from "@/lib/store/rps-materiales";

export async function GET() {
  return NextResponse.json(await getMateriales());
}
