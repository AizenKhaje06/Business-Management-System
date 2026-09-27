# 🚀 Quick Start Guide - Business Management System

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Setup Supabase

### 2.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in project details:
   - Name: `BizManage` (or your choice)
   - Database Password: (save this!)
   - Region: Choose closest to you

### 2.2 Get Your Credentials

After project is created:

1. Go to **Project Settings** (⚙️ icon)
2. Go to **API** section
3. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...`)

### 2.3 Create `.env.local` File

Create a file named `.env.local` in the project root:

```env
# Copy the .env.example file and fill in these values:

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
SUPABASE_SECRET_KEY=your-service-role-key-here
```

**⚠️ Important:** Replace the placeholder values with your actual Supabase credentials!

## Step 3: Run Database Migrations

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Click **SQL Editor** (left sidebar)
3. Click **+ New query**
4. Copy the entire contents of `supabase/schema.sql`
5. Paste into the editor
6. Click **RUN** (or press Ctrl+Enter)
7. Wait for "Success. No rows returned" message

### Option B: Using Supabase CLI

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

## Step 4: Create Test Accounts

**⚠️ Manual step required - Cannot be automated via SQL**

1. Go to Supabase Dashboard > **Authentication** > **Users**
2. Click **"Add User"** button
3. Create these 6 test accounts:

```
📧 owner@bizmanage.com       | 🔑 Password123!
📧 admin@bizmanage.com       | 🔑 Password123!
📧 manager@bizmanage.com     | 🔑 Password123!
📧 accountant@bizmanage.com  | 🔑 Password123!
📧 staff@bizmanage.com       | 🔑 Password123!
📧 viewer@bizmanage.com      | 🔑 Password123!
```

**For each user:**
- Enter the email
- Enter the password: `Password123!`
- ✅ **Auto Confirm User** (check this box!)
- Click "Create User"

### 4.1 Assign Roles to Users

After creating all 6 users:

1. Go to **SQL Editor**
2. Click **+ New query**
3. Copy and paste this script:

```sql
DO $$
DECLARE
  v_owner_role_id uuid;
  v_admin_role_id uuid;
  v_manager_role_id uuid;
  v_accountant_role_id uuid;
  v_staff_role_id uuid;
  v_viewer_role_id uuid;
BEGIN
  SELECT id INTO v_owner_role_id FROM roles WHERE name = 'OWNER';
  SELECT id INTO v_admin_role_id FROM roles WHERE name = 'ADMIN';
  SELECT id INTO v_manager_role_id FROM roles WHERE name = 'MANAGER';
  SELECT id INTO v_accountant_role_id FROM roles WHERE name = 'ACCOUNTANT';
  SELECT id INTO v_staff_role_id FROM roles WHERE name = 'STAFF';
  SELECT id INTO v_viewer_role_id FROM roles WHERE name = 'VIEWER';

  UPDATE profiles SET role_id = v_owner_role_id, first_name = 'Owner', last_name = 'Demo' WHERE email = 'owner@bizmanage.com';
  UPDATE profiles SET role_id = v_admin_role_id, first_name = 'Admin', last_name = 'Demo' WHERE email = 'admin@bizmanage.com';
  UPDATE profiles SET role_id = v_manager_role_id, first_name = 'Manager', last_name = 'Demo' WHERE email = 'manager@bizmanage.com';
  UPDATE profiles SET role_id = v_accountant_role_id, first_name = 'Accountant', last_name = 'Demo' WHERE email = 'accountant@bizmanage.com';
  UPDATE profiles SET role_id = v_staff_role_id, first_name = 'Staff', last_name = 'Demo' WHERE email = 'staff@bizmanage.com';
  UPDATE profiles SET role_id = v_viewer_role_id, first_name = 'Viewer', last_name = 'Demo' WHERE email = 'viewer@bizmanage.com';
END $$;
```

4. Click **RUN**
5. You should see "Success. No rows returned"

## Step 5: Disable Email Confirmation (For Testing)

1. Go to **Authentication** > **Settings**
2. Scroll to **Email Auth** section
3. **Disable** "Confirm email"
4. Click **Save**

## Step 6: Run the Development Server

```bash
npm run dev
```

The app will start at **http://localhost:3000**

## Step 7: Login & Test! 🎉

### Test Accounts & Expected Permissions

```
👑 OWNER (Full Access)
   Email: owner@bizmanage.com
   Password: Password123!
   Can: Everything

👔 ADMIN (User Management)
   Email: admin@bizmanage.com
   Password: Password123!
   Can: Manage users, most features
   Cannot: Edit global settings

📊 MANAGER (Operations)
   Email: manager@bizmanage.com
   Password: Password123!
   Can: Manage clients, projects, expenses, approve transactions
   Cannot: Manage users, system settings

💰 ACCOUNTANT (Financial)
   Email: accountant@bizmanage.com
   Password: Password123!
   Can: View/create expenses, payments, reports
   Cannot: Delete records, manage users

📝 STAFF (Day-to-day)
   Email: staff@bizmanage.com
   Password: Password123!
   Can: Create clients, projects, expenses
   Cannot: Approve, delete, manage users

👀 VIEWER (Read-only)
   Email: viewer@bizmanage.com
   Password: Password123!
   Can: View dashboards, lists, reports
   Cannot: Create, edit, or delete anything
```

---

## Troubleshooting

### "Invalid login credentials"
- ✅ Check if you enabled "Auto Confirm User" when creating accounts
- ✅ Or disable "Confirm email" in Auth Settings
- ✅ Verify password is exactly: `Password123!`

### "No rows returned" after running role assignment
- This is normal! It means the script executed successfully.
- Login with any account to verify it works.

### Can't see any data after login
- The system starts empty - this is expected
- Sample clients/projects exist but you may need viewer+ role to see them
- Try logging in as Manager or Admin to create test data

### Environment variables not working
- Make sure `.env.local` is in the project root (not in `/supabase` folder)
- Restart the dev server after creating `.env.local`
- Check that there are no extra spaces in the values

### Database migrations failed
- Copy `supabase/schema.sql` content manually via SQL Editor
- Make sure you're running it in the correct project
- Check for error messages and look for the failed migration number

---

## Next Steps

After successful login:

1. ✅ Explore the dashboard
2. ✅ Create a client (`Clients` > `New Client`)
3. ✅ Create a project for that client
4. ✅ Add an expense to the project
5. ✅ Try different accounts to test permissions
6. ✅ Check the audit trail (`Admin` > `Audit Trail`)

---

## Development Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Run type check
npm run typecheck

# Format code
npm run format

# Run all checks
npm run check-all
```

---

## Project Structure

```
/app                 # Next.js 13 App Router pages
  /actions          # Server actions (API layer)
  /[feature]        # Feature pages (clients, projects, etc.)
/components         # React components
  /ui               # Reusable UI components
  /[feature]        # Feature-specific components
/lib                # Utilities and helpers
/types              # TypeScript type definitions
/supabase          # Database schema and migrations
/public            # Static assets
```

---

## Need Help?

- 📖 Read `SETUP_TEST_ACCOUNTS.md` for detailed account setup
- 🐛 Check GitHub issues
- 📧 Contact support

Happy coding! 🚀
