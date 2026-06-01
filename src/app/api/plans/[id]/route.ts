import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/db/db-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const p = await dbService.getPlanById(id);
    if (!p) {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 });
    }

    const input = JSON.parse(p.input_json);
    const result = JSON.parse(p.result_json);
    const settingsSnapshot = JSON.parse(p.settings_snapshot_json);

    return NextResponse.json({
      id: p.id,
      type: p.work_type === 'TRAILER_CANVAS' ? 'lona-remolque' : 'baqueton',
      schemaVersion: '1.0',
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      input,
      result,
      settingsSnapshot
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbService.deletePlan(id);
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
