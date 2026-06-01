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

async function describeTable(table) {
  try {
    const headers = {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Accept-Profile': 'tgm'
    };
    const response = await fetch(`${URL}${table}`, {
      method: 'OPTIONS',
      headers
    });
    console.log(`Table ${table} OPTIONS status: ${response.status}`);
    if (response.ok) {
      const data = await response.json();
      console.log(`Structure for ${table}:`);
      console.log(JSON.stringify(data, null, 2).slice(0, 1500));
      console.log('-----------------------------------------------------\n');
    } else {
      const errText = await response.text();
      console.log(`Error describing ${table}:`, errText);
    }
  } catch (error) {
    console.error(`Error table ${table}:`, error);
  }
}

async function main() {
  for (const table of tables) {
    await describeTable(table);
  }
}

main();
