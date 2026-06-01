const URL = 'https://thwtfrwjmivugxvwtore.supabase.co/rest/v1/';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRod3RmcndqbWl2dWd4dnd0b3JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2ODE3ODMsImV4cCI6MjA5MzI1Nzc4M30.oRhvGsK9nU9iGlNJvWWnWoXd16wtxDIySD4m-L_rM3M';

const candidates = [
  'LONA_REMOLQUE_ALTA', 'REMOLQUE_ALTO', 'LONA_ALTA', 'LONA_ALTO_REMOLQUE',
  'TRAILER_CANVAS', 'CANVAS_TRAILER', 'ESTANDAR', 'STANDARD',
  'LONA_ESTANDAR', 'LONA_STANDARD', 'LONA_NORMAL', 'NORMAL',
  'LONA_COMPLETA', 'COMPLETA', 'LATERIAL', 'LATERAL', 'LONA_LATERAL',
  'LONA_CORREDERA', 'CORREDERA', 'SEMIRREMOLQUE', 'LONA_SEMIRREMOLQUE',
  'TECHO', 'LONA_TECHO', 'PLANTEAMIENTO', 'LONA_PLANTEAMIENTO',
  'LONA_SIMPLE', 'LONA_DOBLE', 'LONA_REFORZADA', 'LONA_GRANDE',
  'LONA_MEDIANA', 'LONA_PEQUENA', 'LONA_P', 'LONA_G'
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
