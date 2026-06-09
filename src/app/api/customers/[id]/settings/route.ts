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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { canvasSettings, baquetonProfiles } = await request.json();

    // 1. Guardar settings de lona
    let savedCanvas = null;
    if (canvasSettings) {
      savedCanvas = await dbService.saveTrailerCanvasSettings({
        ...canvasSettings,
        customer_id: id
      });
    }

    // 2. Sincronizar perfiles de baquetón
    const currentProfiles = await dbService.getBaquetonProfiles(id);
    const payloadProfileIds = new Set(
      baquetonProfiles?.map((p: any) => p.id).filter(Boolean) || []
    );

    // Eliminar perfiles que no vienen en el nuevo payload
    for (const existing of currentProfiles) {
      if (!payloadProfileIds.has(existing.id)) {
        await dbService.deleteBaquetonProfile(existing.id);
      }
    }

    // Guardar/actualizar los perfiles nuevos o modificados
    const savedProfiles = [];
    if (baquetonProfiles && baquetonProfiles.length > 0) {
      for (const profile of baquetonProfiles) {
        const saved = await dbService.saveBaquetonProfile({
          ...profile,
          customer_id: id
        });
        savedProfiles.push(saved);
      }
    }

    return NextResponse.json({
      success: true,
      canvasSettings: savedCanvas,
      baquetonProfiles: savedProfiles
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
