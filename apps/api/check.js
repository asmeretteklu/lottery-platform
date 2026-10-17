const { createClient } = require('@supabase/supabase-js');
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: users, error: err1 } = await supabase.from('users').select('*').eq('role', 'admin');
  console.log('Public Users:', users);

  const { data: authUser, error: err2 } = await supabase.auth.admin.listUsers();
  console.log('Auth Users:', authUser.users.map(u => ({ id: u.id, email: u.email })));
}

check();
