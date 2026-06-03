const url = 'https://vpgqfriadablhihvwvmn.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwZ3FmcmlhZGFibGhpaHZ3dm1uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDQzNzEwOCwiZXhwIjoyMDk2MDEzMTA4fQ.RxGm7YtiBXAKKAUvm9wiQHmMHEzdkXPrDsQJibf93_8';

async function seed() {
  const email = 'admin@lottery.com';
  const password = 'password123';
  const phone = '+251911000000';

  console.log('Creating auth user via REST API...');
  
  // 1. Create User via GoTrue REST API
  const authRes = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'admin' }
    })
  });

  const authData = await authRes.json();
  let userId = authData.id;

  if (authRes.status !== 200 && authData.code !== 'user_already_exists') {
    console.error('Error creating auth user:', authData);
    return;
  }

  // If user exists, we need to find their ID
  if (authData.code === 'user_already_exists') {
    console.log('User already exists, finding ID...');
    const listRes = await fetch(`${url}/auth/v1/admin/users`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      }
    });
    const listData = await listRes.json();
    const user = listData.users.find(u => u.email === email);
    if (user) {
      userId = user.id;
    } else {
      console.error('Could not find existing user ID');
      return;
    }
  }

  // 2. Insert into public.users
  console.log('Inserting into public.users...', userId);
  const dbRes = await fetch(`${url}/rest/v1/users`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify({
      id: userId,
      phone: phone,
      full_name: 'System Admin',
      role: 'admin',
      is_active: true
    })
  });

  if (!dbRes.ok) {
    const dbErr = await dbRes.text();
    console.error('Error inserting user record:', dbErr);
  } else {
    console.log('Admin user seeded successfully!');
  }
}

seed();
