// Update existing account to OWNER role
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wxzwjghldpyafzjnfgoo.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4endqZ2hsZHB5YWZ6am5mZ29vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDQ0MTE5MywiZXhwIjoyMTA2MDE3MTkzfQ.FISWCZMgS2dj4ryHJ6xz2tPe7w3YeZDWcyYkT3z7_ZY';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function updateToOwner() {
  console.log('Checking existing accounts...\n');

  // Get all profiles
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, role:roles(name)')
    .limit(10);

  if (profileError) {
    console.error('Error:', profileError.message);
    return;
  }

  console.log('Found accounts:');
  profiles.forEach((p, i) => {
    console.log(`${i + 1}. ${p.email} - Role: ${p.role?.name || 'None'}`);
  });

  // Get OWNER role ID
  const { data: roleData } = await supabase
    .from('roles')
    .select('id')
    .eq('name', 'OWNER')
    .single();

  // Update first account to OWNER
  if (profiles.length > 0) {
    const firstProfile = profiles[0];
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role_id: roleData.id })
      .eq('id', firstProfile.id);

    if (!updateError) {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎉 ACCOUNT UPDATED TO OWNER!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Email:    ' + firstProfile.email);
      console.log('Password: (your registered password)');
      console.log('Role:     OWNER (Full Access)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('Login at: http://localhost:3000/login\n');
    }
  } else {
    console.log('\nNo accounts found. Please sign up first at http://localhost:3000/login');
  }
}

updateToOwner().catch(console.error);
