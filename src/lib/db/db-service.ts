const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://thwtfrwjmivugxvwtore.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRod3RmcndqbWl2dWd4dnd0b3JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2ODE3ODMsImV4cCI6MjA5MzI1Nzc4M30.oRhvGsK9nU9iGlNJvWWnWoXd16wtxDIySD4m-L_rM3M';

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Accept-Profile': 'tgm',
  'Content-Profile': 'tgm',
  'Content-Type': 'application/json'
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DB Error [${response.status}] for ${endpoint}: ${errorText}`);
  }

  // Si es un DELETE o respuesta vacía, puede no ser JSON
  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

export interface Customer {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Material {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrailerCanvasSettings {
  id: string;
  customer_id: string | null;
  name: string;
  demasia_largo_ancho_lona_hecha: number;
  demasia_alto: number;
  demasia_largo_contorno_normal: number;
  demasia_largo_contorno_enfundar: number;
  aumento_curva_contorno: number;
  inicio_oreja_sin_curva: number;
  medida_oreja_goma: number;
  decimales: number;
  redondeo: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BaquetonProfileDb {
  id: string;
  customer_id: string | null;
  name: string;
  demasia_largo_pieza_final: number;
  demasia_ancho_pieza_final: number;
  demasia_baqueton_picostura: number;
  demasia_baqueton_en_largo_delante: number;
  demasia_baqueton_en_largo_detras: number;
  demasia_baqueton_en_ancho_delante: number;
  demasia_baqueton_en_ancho_detras: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlanDb {
  id: string;
  work_type: 'TRAILER_CANVAS' | 'BAQUETON';
  order_number: string;
  work_order?: string;
  revision?: string;
  customer_name_snapshot: string;
  input_json: string;
  result_json: string;
  settings_snapshot_json: string;
  created_at: string;
  updated_at: string;
  plan_eyelet_positions?: PlanEyeletPositionDb[];
}

export interface PlanEyeletPositionDb {
  id: string;
  plan_id: string;
  zone: 'LATERAL' | 'FRONT' | 'BACK';
  position_order: number;
  position_cm: number;
  created_at: string;
}

export const dbService = {
  async getCustomers(): Promise<Customer[]> {
    return request<Customer[]>('customers?select=*&order=name.asc');
  },

  async getMaterials(): Promise<Material[]> {
    return request<Material[]>('materials?select=*&active=eq.true&order=name.asc');
  },

  async getAllMaterials(): Promise<Material[]> {
    return request<Material[]>('materials?select=*&order=name.asc');
  },

  async saveMaterial(material: { id?: string; name: string; active: boolean }): Promise<Material> {
    return request<Material[]>('materials', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(material)
    }).then(res => res[0]);
  },

  async deleteMaterial(id: string): Promise<void> {
    await request<void>(`materials?id=eq.${id}`, {
      method: 'DELETE'
    });
  },

  async createCustomer(name: string): Promise<Customer> {
    return request<Customer[]>('customers', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({ name, active: true })
    }).then(res => res[0]);
  },

  async updateCustomer(id: string, name: string, active: boolean): Promise<Customer> {
    return request<Customer[]>(`customers?id=eq.${id}`, {
      method: 'PATCH',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({ name, active })
    }).then(res => res[0]);
  },

  async deleteCustomer(id: string): Promise<void> {
    await request<void>(`trailer_canvas_settings?customer_id=eq.${id}`, { method: 'DELETE' });
    await request<void>(`baqueton_profiles?customer_id=eq.${id}`, { method: 'DELETE' });
    await request<void>(`customers?id=eq.${id}`, { method: 'DELETE' });
  },

  async saveTrailerCanvasSettings(settings: Omit<TrailerCanvasSettings, 'created_at' | 'updated_at'>): Promise<TrailerCanvasSettings> {
    const dbPayload = {
      ...settings,
      redondeo: settings.redondeo?.toUpperCase()
    };
    return request<TrailerCanvasSettings[]>('trailer_canvas_settings', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(dbPayload)
    }).then(res => {
      const saved = res[0];
      return {
        ...saved,
        redondeo: saved.redondeo?.toLowerCase()
      };
    });
  },

  async saveBaquetonProfile(profile: Omit<BaquetonProfileDb, 'created_at' | 'updated_at'>): Promise<BaquetonProfileDb> {
    return request<BaquetonProfileDb[]>('baqueton_profiles', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(profile)
    }).then(res => res[0]);
  },

  async deleteBaquetonProfile(id: string): Promise<void> {
    await request<void>(`baqueton_profiles?id=eq.${id}`, {
      method: 'DELETE'
    });
  },

  async getTrailerCanvasSettings(customerId: string): Promise<TrailerCanvasSettings[]> {
    return request<TrailerCanvasSettings[]>(`trailer_canvas_settings?customer_id=eq.${customerId}&active=eq.true`)
      .then(settingsList => settingsList.map(settings => ({
        ...settings,
        redondeo: settings.redondeo?.toLowerCase()
      })));
  },

  async getBaquetonProfiles(customerId: string): Promise<BaquetonProfileDb[]> {
    return request<BaquetonProfileDb[]>(`baqueton_profiles?customer_id=eq.${customerId}&active=eq.true`);
  },

  async getPlans(): Promise<PlanDb[]> {
    return request<PlanDb[]>('plans?select=*&order=created_at.desc');
  },

  async savePlan(plan: Omit<PlanDb, 'id' | 'created_at' | 'updated_at'>, eyeletPositions: Array<Omit<PlanEyeletPositionDb, 'id' | 'plan_id' | 'created_at'>>): Promise<PlanDb> {
    // 1. Insert plan
    const insertedPlan = await request<PlanDb[]>('plans', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify(plan)
    }).then(res => res[0]);

    // 2. Insert eyelet positions if any
    if (eyeletPositions && eyeletPositions.length > 0) {
      const positionsToInsert = eyeletPositions.map(pos => ({
        ...pos,
        plan_id: insertedPlan.id
      }));

      await request<PlanEyeletPositionDb[]>('plan_eyelet_positions', {
        method: 'POST',
        body: JSON.stringify(positionsToInsert)
      });
    }

    return insertedPlan;
  },

  async deletePlan(id: string): Promise<void> {
    // Primero eliminamos los ollaos debido a la clave foránea
    await request<void>(`plan_eyelet_positions?plan_id=eq.${id}`, {
      method: 'DELETE'
    });
    // Luego eliminamos el plan
    await request<void>(`plans?id=eq.${id}`, {
      method: 'DELETE'
    });
  },

  async getPlanById(id: string): Promise<PlanDb> {
    const plans = await request<PlanDb[]>(`plans?id=eq.${id}&select=*,plan_eyelet_positions(*)`);
    return plans[0];
  }
};
