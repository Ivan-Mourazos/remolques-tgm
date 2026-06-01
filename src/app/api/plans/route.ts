import { NextRequest, NextResponse } from 'next/server';
import { dbService, PlanDb, PlanEyeletPositionDb } from '@/lib/db/db-service';

function parseEyeletPositions(ollaosStr: string | undefined): number[] {
  if (!ollaosStr) return [];
  return ollaosStr
    .split(',')
    .map(val => parseFloat(val.trim()))
    .filter(val => !isNaN(val));
}

export async function GET() {
  try {
    const plans = await dbService.getPlans();
    // Transformamos los planes de la DB al formato que espera el frontend (SavedItem)
    const transformed = plans.map(p => {
      const input = JSON.parse(p.input_json);
      const result = JSON.parse(p.result_json);
      const settingsSnapshot = JSON.parse(p.settings_snapshot_json);
      return {
        id: p.id,
        type: p.work_type === 'TRAILER_CANVAS' ? 'lona-remolque' : 'baqueton',
        schemaVersion: '1.0',
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        input,
        result,
        settingsSnapshot
      };
    });
    return NextResponse.json(transformed);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, type, input, result, settingsSnapshot } = body;

    const work_type = type === 'lona-remolque' ? 'TRAILER_CANVAS' : 'BAQUETON';
    
    // Mapeamos los campos del input
    const order_number = input.numeroPedido || 'SIN_NUMERO';
    const work_order = input.ordenFabricacion || '';
    const revision = input.revision || '';
    const customer_name_snapshot = input.cliente || 'SIN_CLIENTE';

    const planData: Omit<PlanDb, 'id' | 'created_at' | 'updated_at'> = {
      work_type,
      order_number,
      work_order,
      revision,
      customer_name_snapshot,
      input_json: JSON.stringify(input),
      result_json: JSON.stringify(result),
      settings_snapshot_json: JSON.stringify(settingsSnapshot)
    };

    // Procesamos posiciones de ollaos
    const eyeletPositions: Array<Omit<PlanEyeletPositionDb, 'id' | 'plan_id' | 'created_at'>> = [];

    const lateralPositions = parseEyeletPositions(input.ollaosLaterales);
    lateralPositions.forEach((pos, idx) => {
      eyeletPositions.push({
        zone: 'LATERAL',
        position_order: idx + 1,
        position_cm: pos
      });
    });

    const frontPositions = parseEyeletPositions(input.ollaosDelante);
    frontPositions.forEach((pos, idx) => {
      eyeletPositions.push({
        zone: 'FRONT',
        position_order: idx + 1,
        position_cm: pos
      });
    });

    const backPositions = parseEyeletPositions(input.ollaosAtras);
    backPositions.forEach((pos, idx) => {
      eyeletPositions.push({
        zone: 'BACK',
        position_order: idx + 1,
        position_cm: pos
      });
    });

    let savedPlan: PlanDb;

    if (id) {
      // Si ya tiene un ID, lo actualizamos (eliminamos el anterior y volvemos a guardar para mantener RLS y checks limpios, o hacemos update. Al ser Supabase, un delete y recrear es limpio y seguro para plan_eyelet_positions, pero mantengamos el id).
      // Como dbService.savePlan crea uno nuevo, si queremos actualizar uno existente, primero lo eliminamos si ya existe.
      try {
        await dbService.deletePlan(id);
      } catch (err) {
        // Ignoramos si no existía previamente
      }
      
      // Creamos con el ID específico si el DB service lo soporta.
      // Modificamos dbService para poder aceptar un ID predefinido si es necesario, o dejamos que Supabase lo genere.
      // Para respetar el ID del frontend, podemos pasar el id en el objeto a insertar en Supabase si dbService lo permite.
      // Vamos a ajustar el savePlan en dbService para que acepte id opcional si es necesario, o lo asigne.
      const planToSaveWithId = {
        ...planData,
        id // Si pasamos id, PostgREST lo utilizará.
      } as any;

      savedPlan = await dbService.savePlan(planToSaveWithId, eyeletPositions);
    } else {
      savedPlan = await dbService.savePlan(planData, eyeletPositions);
    }

    // Retornamos el formato que el frontend espera
    const responseFormat = {
      id: savedPlan.id,
      type,
      schemaVersion: '1.0',
      createdAt: savedPlan.created_at,
      updatedAt: savedPlan.updated_at,
      input,
      result,
      settingsSnapshot
    };

    return NextResponse.json(responseFormat);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
