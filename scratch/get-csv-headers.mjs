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

async function getCsvHeader(table) {
  const headers = {
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${ANON_KEY}`,
    'Accept-Profile': 'tgm',
    'Accept': 'text/csv'
  };
  try {
    const response = await fetch(`${URL}${table}?limit=1`, { headers });
    console.log(`Table ${table} CSV status: ${response.status}`);
    const text = await response.text();
    console.log(`Columns for ${table}:`, text.trim());
    console.log('-----------------------------------------------------\n');
  } catch (err) {
    console.error(`Error fetching CSV for ${table}:`, err);
  }
}

async function main() {
  for (const table of tables) {
    await getCsvHeader(table);
  }
}

main();
