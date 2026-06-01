import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/db/db-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [canvasSettings, baquetonProfiles] = await Promise.all([
      dbService.getTrailerCanvasSettings(id),
      dbService.getBaquetonProfiles(id)
    ]);
    return NextResponse.json({
      canvasSettings,
      baquetonProfiles
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
