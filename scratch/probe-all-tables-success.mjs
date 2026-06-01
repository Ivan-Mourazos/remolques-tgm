const URL = 'https://thwtfrwjmivugxvwtore.supabase.co/rest/v1/';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRod3RmcndqbWl2dWd4dnd0b3JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2ODE3ODMsImV4cCI6MjA5MzI1Nzc4M30.oRhvGsK9nU9iGlNJvWWnWoXd16wtxDIySD4m-L_rM3M';

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Accept-Profile': 'tgm',
  'Content-Profile': 'tgm',
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function insertRow(table, body) {
  const response = await fetch(`${URL}${table}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to insert into ${table}: ${response.status} - ${errText}`);
  }
  const data = await response.json();
  return data[0];
}

async function deleteRow(table, id) {
  const response = await fetch(`${URL}${table}?id=eq.${id}`, {
    method: 'DELETE',
    headers
  });
  if (!response.ok) {
    console.log(`Warning: failed to delete from ${table} (id ${id}): ${response.status}`);
  }
}

async function runProbing() {
  const cleanups = [];
  try {
    // 1. Customers
    console.log('Probing customers...');
    const customer = await insertRow('customers', { name: 'PROBE_TEMP_CUSTOMER' });
    console.log('Customers columns:', Object.keys(customer));
    console.log('Full row:', customer);
    cleanups.push({ table: 'customers', id: customer.id });

    // 2. Materials
    console.log('\nProbing materials...');
    const material = await insertRow('materials', { name: 'PROBE_TEMP_MATERIAL' });
    console.log('Materials columns:', Object.keys(material));
    console.log('Full row:', material);
    cleanups.push({ table: 'materials', id: material.id });

    // 3. Pickup Types
    console.log('\nProbing pickup_types...');
    const pickup = await insertRow('pickup_types', { name: 'PROBE_TEMP_PICKUP' });
    console.log('Pickup types columns:', Object.keys(pickup));
    console.log('Full row:', pickup);
    cleanups.push({ table: 'pickup_types', id: pickup.id });

    // 4. Trailer Canvas Settings
    console.log('\nProbing trailer_canvas_settings...');
    const canvas = await insertRow('trailer_canvas_settings', { name: 'PROBE_TEMP_CANVAS' });
    console.log('Trailer canvas settings columns:', Object.keys(canvas));
    console.log('Full row:', canvas);
    cleanups.push({ table: 'trailer_canvas_settings', id: canvas.id });

    // 5. Baqueton Profiles
    console.log('\nProbing baqueton_profiles...');
    const baqueton = await insertRow('baqueton_profiles', { name: 'PROBE_TEMP_BAQUETON' });
    console.log('Baqueton profiles columns:', Object.keys(baqueton));
    console.log('Full row:', baqueton);
    cleanups.push({ table: 'baqueton_profiles', id: baqueton.id });

    // 6. Trailer Profile Types
    console.log('\nProbing trailer_profile_types...');
    const trailerProfile = await insertRow('trailer_profile_types', { code: 'PROBE_TEMP_TRAILER_PROFILE', name: 'PROBE_TEMP_TRAILER_PROFILE_NAME' });
    console.log('Trailer profile types columns:', Object.keys(trailerProfile));
    console.log('Full row:', trailerProfile);
    cleanups.push({ table: 'trailer_profile_types', id: trailerProfile.id });

    // 7. Eyelet Templates
    console.log('\nProbing eyelet_templates...');
    const template = await insertRow('eyelet_templates', { name: 'PROBE_TEMP_TEMPLATE', work_type: 'TRAILER_CANVAS', eyelet_mode: 'REPARTIDOS' });
    console.log('Eyelet templates columns:', Object.keys(template));
    console.log('Full row:', template);
    cleanups.push({ table: 'eyelet_templates', id: template.id });

    // 8. Eyelet Template Positions
    console.log('\nProbing eyelet_template_positions...');
    const tempPosition = await insertRow('eyelet_template_positions', { template_id: template.id, zone: 'LATERAL', position_order: 1, position_cm: 20.5 });
    console.log('Eyelet template positions columns:', Object.keys(tempPosition));
    console.log('Full row:', tempPosition);
    cleanups.push({ table: 'eyelet_template_positions', id: tempPosition.id });

    // 9. Plans
    console.log('\nProbing plans...');
    const plan = await insertRow('plans', { work_type: 'TRAILER_CANVAS', order_number: 'TEST_ORDER_123', customer_name_snapshot: 'TEST_CUSTOMER_NAME' });
    console.log('Plans columns:', Object.keys(plan));
    console.log('Full row:', plan);
    cleanups.push({ table: 'plans', id: plan.id });

    // 10. Plan Eyelet Positions
    console.log('\nProbing plan_eyelet_positions...');
    const planPosition = await insertRow('plan_eyelet_positions', { plan_id: plan.id });
    console.log('Plan eyelet positions columns:', Object.keys(planPosition));
    console.log('Full row:', planPosition);
    cleanups.push({ table: 'plan_eyelet_positions', id: planPosition.id });

    // 11. Plan Attachments
    console.log('\nProbing plan_attachments...');
    const attachment = await insertRow('plan_attachments', { plan_id: plan.id });
    console.log('Plan attachments columns:', Object.keys(attachment));
    console.log('Full row:', attachment);
    cleanups.push({ table: 'plan_attachments', id: attachment.id });

  } catch (err) {
    console.error('Probing failed:', err);
  } finally {
    console.log('\nStarting cleanup...');
    // Limpiamos de forma inversa
    for (let i = cleanups.length - 1; i >= 0; i--) {
      const item = cleanups[i];
      await deleteRow(item.table, item.id);
      console.log(`Cleaned up row in ${item.table} (id ${item.id})`);
    }
    console.log('Cleanup finished.');
  }
}

runProbing();
