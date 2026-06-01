const URL = 'https://thwtfrwjmivugxvwtore.supabase.co/rest/v1/';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRod3RmcndqbWl2dWd4dnd0b3JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2ODE3ODMsImV4cCI6MjA5MzI1Nzc4M30.oRhvGsK9nU9iGlNJvWWnWoXd16wtxDIySD4m-L_rM3M';

const tables = [
  'customers',
  'materials',
  'pickup_types',
  'trailer_canvas_settings',
  'baqueton_profiles',
  'trailer_profile_types',
  'eyelet_templates',
  'eyelet_template_positions',
  'plans',
  'plan_eyelet_positions',
  'plan_attachments'
];

async function probeTable(table) {
  const headers = {
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${ANON_KEY}`,
    'Accept-Profile': 'tgm',
    'Content-Profile': 'tgm',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
  try {
    const response = await fetch(`${URL}${table}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({})
    });
    if (response.ok) {
      const data = await response.json();
      const row = data[0];
      console.log(`STRUCTURE FOR ${table}:`);
      console.log(Object.keys(row));
      
      // Intentamos borrar la fila de prueba insertada
      if (row) {
        let deleteUrl = `${URL}${table}`;
        // Si hay id o similar, borramos por ahí
        if (row.id !== undefined) {
          deleteUrl += `?id=eq.${row.id}`;
        } else if (row.uuid !== undefined) {
          deleteUrl += `?uuid=eq.${row.uuid}`;
        } else if (row.name !== undefined) {
          deleteUrl += `?name=eq.${row.name}`;
        } else if (row.customer_id !== undefined) {
          deleteUrl += `?customer_id=eq.${row.customer_id}`;
        }
        const delRes = await fetch(deleteUrl, {
          method: 'DELETE',
          headers
        });
        if (!delRes.ok) {
          console.log(`Warning: failed to delete test row in ${table}: ${delRes.status}`);
        }
      }
    } else {
      const errText = await response.text();
      console.log(`POST error for ${table} (${response.status}):`, errText);
    }
  } catch (err) {
    console.error(`Error probing ${table}:`, err);
  }
  console.log('-----------------------------------------------------\n');
}

async function main() {
  for (const table of tables) {
    await probeTable(table);
  }
}

main();
