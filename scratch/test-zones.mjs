const URL = 'https://thwtfrwjmivugxvwtore.supabase.co/rest/v1/';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRod3RmcndqbWl2dWd4dnd0b3JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2ODE3ODMsImV4cCI6MjA5MzI1Nzc4M30.oRhvGsK9nU9iGlNJvWWnWoXd16wtxDIySD4m-L_rM3M';

const candidates = [
  'LATERALES', 'LATERAL', 'LADOS', 'LADO', 'DELANTE', 'ATRAS', 'DETRAS',
  'laterales', 'lateral', 'lados', 'lado', 'delante', 'atras', 'detras',
  'SIDES', 'SIDE', 'FRONT', 'BACK', 'sides', 'side', 'front', 'back',
  'LEFT', 'RIGHT', 'left', 'right', 'LADO_IZQUIERDO', 'LADO_DERECHO',
  'izquierdo', 'derecho'
];

async function testAllZones() {
  const headers = {
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${ANON_KEY}`,
    'Accept-Profile': 'tgm',
    'Content-Profile': 'tgm',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  // Necesitamos una plantilla de ollaos
  const template = await fetch(`${URL}eyelet_templates`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'PROBE_TEMP_FOR_ZONES',
      work_type: 'TRAILER_CANVAS',
      eyelet_mode: 'REPARTIDOS'
    })
  }).then(r => r.json()).then(d => d[0]);

  const successes = [];

  for (const z of candidates) {
    try {
      const response = await fetch(`${URL}eyelet_template_positions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          template_id: template.id,
          zone: z,
          position_order: 1,
          position_cm: 20.5
        })
      });
      if (response.ok) {
        const data = await response.json();
        successes.push(z);
        await fetch(`${URL}eyelet_template_positions?id=eq.${data[0].id}`, {
          method: 'DELETE',
          headers
        });
      }
    } catch (err) {
      console.error(`Error with ${z}:`, err);
    }
  }

  // Limpiamos la plantilla
  await fetch(`${URL}eyelet_templates?id=eq.${template.id}`, {
    method: 'DELETE',
    headers
  });

  console.log('Successful zone values:', successes);
}

testAllZones();
