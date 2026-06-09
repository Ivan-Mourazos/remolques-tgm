import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/db/db-service';

export async function GET() {
  try {
    const materials = await dbService.getAllMaterials();
    return NextResponse.json(materials);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const material = await request.json();
    if (!material.name) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
    }
    const saved = await dbService.saveMaterial(material);
    return NextResponse.json(saved);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'El ID es obligatorio' }, { status: 400 });
    }
    await dbService.deleteMaterial(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
