const URL = 'https://thwtfrwjmivugxvwtore.supabase.co/rest/v1/';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRod3RmcndqbWl2dWd4dnd0b3JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2ODE3ODMsImV4cCI6MjA5MzI1Nzc4M30.oRhvGsK9nU9iGlNJvWWnWoXd16wtxDIySD4m-L_rM3M';

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
    console.log(`Probing table ${table}...`);
    // Intentamos insertar una fila vacía
    const response = await fetch(`${URL}${table}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({})
    });
    console.log(`POST status: ${response.status}`);
    if (response.ok) {
      const data = await response.json();
      console.log(`Row inserted in ${table}:`, data);
      // Intentamos borrar la fila insertada
      // Para borrar sin where (borrar todo, ya que la tabla está vacía y solo está esta fila)
      // PostgREST requiere el header 'Prefer: count=exact' o similar, o simplemente un DELETE con algun filtro
      // Por ejemplo, si la fila tiene un id, borramos por ese id.
      const row = data[0];
      if (row) {
        let deleteUrl = `${URL}${table}`;
        if (row.id !== undefined) {
          deleteUrl += `?id=eq.${row.id}`;
        } else if (row.name !== undefined) {
          deleteUrl += `?name=eq.${row.name}`;
        }
        const delRes = await fetch(deleteUrl, {
          method: 'DELETE',
          headers
        });
        console.log(`DELETE status: ${delRes.status}`);
      }
    } else {
      const errText = await response.text();
      console.log(`POST error for ${table}:`, errText);
    }
  } catch (err) {
    console.error(`Error probing ${table}:`, err);
  }
}

probeTable('customers');
