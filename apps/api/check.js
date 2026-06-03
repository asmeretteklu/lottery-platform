const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vpgqfriadablhihvwvmn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwZ3FmcmlhZGFibGhpaHZ3dm1uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDQzNzEwOCwiZXhwIjoyMDk2MDEzMTA4fQ.RxGm7YtiBXAKKAUvm9wiQHmMHEzdkXPrDsQJibf93_8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: users, error: err1 } = await supabase.from('users').select('*').eq('role', 'admin');
  console.log('Public Users:', users);

  const { data: authUser, error: err2 } = await supabase.auth.admin.listUsers();
  console.log('Auth Users:', authUser.users.map(u => ({ id: u.id, email: u.email })));
}

check();
