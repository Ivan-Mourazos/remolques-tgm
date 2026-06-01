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

async function forceError(table) {
  const headers = {
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${ANON_KEY}`,
    'Accept-Profile': 'tgm'
  };
  try {
    const response = await fetch(`${URL}${table}?select=columna_falsa_inventada`, { headers });
    console.log(`Table ${table} force GET status: ${response.status}`);
    const errText = await response.text();
    console.log(`Error body for ${table}:`, errText);
    console.log('-----------------------------------------------------\n');
  } catch (err) {
    console.error(`Error forcing error on ${table}:`, err);
  }
}

async function main() {
  for (const table of tables) {
    await forceError(table);
  }
}

main();
