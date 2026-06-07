import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oyfcactshuvkaxyicrst.supabase.co';
const supabaseKey = 'sb_publishable__rnqUKbCwZ1uUD-JwNoPTA_fM41lacW';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const email = 'bhaddreshamudala@gmail.com';
  const password = 'password123';

  console.log(`Attempting login for ${email}...`);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Login error:', error);
    return;
  }

  console.log('Login success! User ID:', data.user.id);
  console.log('User email:', data.user.email);

  console.log('Querying role from user_roles...');
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('email', email)
    .single();

  if (roleError) {
    console.error('Role query error:', roleError);
  } else {
    console.log('Role query success:', roleData);
  }

  console.log('Calling /api/v1/employees/me...');
  try {
    const response = await fetch('http://localhost:8000/api/v1/employees/me', {
      headers: {
        'Authorization': `Bearer ${data.session.access_token}`
      }
    });
    const status = response.status;
    const body = await response.json();
    console.log(`Response status: ${status}`);
  } catch (err) {
    console.error('Failed to call API /me:', err);
  }

  console.log('Calling /api/v1/attendance/daily...');
  try {
    const response = await fetch('http://localhost:8000/api/v1/attendance/daily', {
      headers: {
        'Authorization': `Bearer ${data.session.access_token}`
      }
    });
    const status = response.status;
    const body = await response.json();
    console.log(`Response status: ${status}`);
    console.log('Response body:', JSON.stringify(body, null, 2));
  } catch (err) {
    console.error('Failed to call API /daily:', err);
  }
}

test();
