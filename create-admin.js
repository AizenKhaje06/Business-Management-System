// Create OWNER test account
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wxzwjghldpyafzjnfgoo.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4endqZ2hsZHB5YWZ6am5mZ29vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDQ0MTE5MywiZXhwIjoyMTA2MDE3MTkzfQ.FISWCZMgS2dj4ryHJ6xz2tPe7w3YeZDWcyYkT3z7_ZY';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createOwnerAccount() {
  console.log('Creating OWNER test account...\n');

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: 'owner@bizmanage.com',
    password: 'Owner123!',
    email_confirm: true
  });

  if (authError) {
    console.error('Error creating user:', authError.message);
    return;
  }

  console.log('✓ User created:', authData.user.email);
  console.log('✓ User ID:', authData.user.id);

  // Get OWNER role ID
  const { data: roleData, error: roleError } = await supabase
    .from('roles')
    .select('id')
    .eq('name', 'OWNER')
    .single();

  if (roleError) {
    console.error('Error getting OWNER role:', roleError.message);
    return;
  }

  // Update profile to OWNER role
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ role_id: roleData.id })
    .eq('id', authData.user.id);

  if (updateError) {
    console.error('Error updating profile:', updateError.message);
    return;
  }

  console.log('✓ Profile updated to OWNER role\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 OWNER ACCOUNT CREATED!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Email:    owner@bizmanage.com');
  console.log('Password: Owner123!');
  console.log('Role:     OWNER (Full Access)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Login at: http://localhost:3000/login\n');
}

createOwnerAccount().catch(console.error);
