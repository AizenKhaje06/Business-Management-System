// Reset password for owner account
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wxzwjghldpyafzjnfgoo.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4endqZ2hsZHB5YWZ6am5mZ29vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDQ0MTE5MywiZXhwIjoyMTA2MDE3MTkzfQ.FISWCZMgS2dj4ryHJ6xz2tPe7w3YeZDWcyYkT3z7_ZY';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetPassword() {
  console.log('Resetting password for owner@bizmanage.com...\n');

  // Get user by email
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('Error:', listError.message);
    return;
  }

  const ownerUser = users.find(u => u.email === 'owner@bizmanage.com');
  
  if (!ownerUser) {
    console.log('owner@bizmanage.com not found. Creating new account...\n');
    
    // Create new user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'owner@bizmanage.com',
      password: 'Owner123!',
      email_confirm: true
    });

    if (authError) {
      console.error('Error creating user:', authError.message);
      return;
    }

    // Get OWNER role ID
    const { data: roleData } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'OWNER')
      .single();

    // Update profile to OWNER role
    await supabase
      .from('profiles')
      .update({ role_id: roleData.id })
      .eq('id', authData.user.id);

  } else {
    // Update existing user password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      ownerUser.id,
      { password: 'Owner123!' }
    );

    if (updateError) {
      console.error('Error updating password:', updateError.message);
      return;
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ OWNER ACCOUNT READY!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Email:    owner@bizmanage.com');
  console.log('Password: Owner123!');
  console.log('Role:     OWNER (Full Access)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Login at: http://localhost:3000/login\n');
}

resetPassword().catch(console.error);
