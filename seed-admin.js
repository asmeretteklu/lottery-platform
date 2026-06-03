const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vpgqfriadablhihvwvmn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwZ3FmcmlhZGFibGhpaHZ3dm1uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDQzNzEwOCwiZXhwIjoyMDk2MDEzMTA4fQ.RxGm7YtiBXAKKAUvm9wiQHmMHEzdkXPrDsQJibf93_8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  const email = 'admin@lottery.com';
  const password = 'password123';
  const phone = '+251911000000'; // Mock ET phone
  
  console.log('Creating auth user...');
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    console.error('Error creating auth user:', authError);
    if (!authError.message.includes('already registered')) return;
  }

  const userId = authData?.user?.id;
  if (!userId) {
    console.log('User already exists. Skipping insertion.');
  } else {
    console.log('Inserting into public.users...', userId);
    const { error: dbError } = await supabase.from('users').insert({
      id: userId,
      phone: phone,
      full_name: 'System Admin',
      role: 'admin',
      is_active: true
    });

    if (dbError) {
      console.error('Error inserting user record:', dbError);
    } else {
      console.log('Admin user created successfully!');
    }
  }
  console.log(`\nLogin Details:\nEmail: ${email}\nPassword: ${password}`);
}

seed();
