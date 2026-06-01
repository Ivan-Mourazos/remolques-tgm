const URL = 'https://thwtfrwjmivugxvwtore.supabase.co/rest/v1/';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRod3RmcndqbWl2dWd4dnd0b3JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2ODE3ODMsImV4cCI6MjA5MzI1Nzc4M30.oRhvGsK9nU9iGlNJvWWnWoXd16wtxDIySD4m-L_rM3M';

const candidates = [
  'LONA', 'BAQUETON', 'lona', 'baqueton',
  'LONA_REMOLQUE', 'LONA-REMOLQUE', 'Lona', 'Baqueton',
  'Lona remolque', 'Lona Remolque', 'lona_remolque', 'LonaRemolque',
  'lona-remolque', 'LONA REMOLQUE', 'lona remolque',
  'REMOLQUE', 'remolque', 'canvas', 'CANVAS', 'trailer', 'TRAILER',
  'lona-alto', 'LONA_ALTO', 'lona_alto', 'LONA-ALTO',
  'LONA_REMOLQUE_ALTO', 'lona_remolque_alto', 'lona-remolque-alto',
  'LONA_ALTO_REMOLQUE', 'lona_alto_remolque', 'LONA_REPUGNANTE_ALTO',
  'LONA_DE_REMOLQUE', 'lona_de_remolque'
];

async function testAllCandidates() {
  const headers = {
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${ANON_KEY}`,
    'Accept-Profile': 'tgm',
    'Content-Profile': 'tgm',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  const successes = [];

  for (const wt of candidates) {
    try {
      const response = await fetch(`${URL}eyelet_templates`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: 'PROBE_CANDIDATE_' + wt,
          work_type: wt,
          eyelet_mode: 'REPARTIDOS'
        })
      });
      if (response.ok) {
        const data = await response.json();
        successes.push(wt);
        // Borramos la fila
        await fetch(`${URL}eyelet_templates?id=eq.${data[0].id}`, {
          method: 'DELETE',
          headers
        });
      }
    } catch (err) {
      console.error(`Error with ${wt}:`, err);
    }
  }
  console.log('Successful work_type values:', successes);
}

testAllCandidates();
