# 🔍 Debug: Invalid Login Credentials

## Problem: "Invalid login credentials" error

## Root Cause: Wrong PUBLISHABLE_KEY in .env.local

Your current `.env.local` has:
```
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_vCYX2_Bg6ly6oWTucZYZ_Q_H_bLrX47
```

❌ **This is INVALID!** Supabase keys are JWT tokens that start with `eyJ` and are much longer.

---

## ✅ SOLUTION: Get the Correct Keys

### Step 1: Go to Supabase Dashboard

1. Open your browser
2. Go to: https://supabase.com/dashboard
3. Select your project: `wxzwjghldpyafzjnfgoo`

### Step 2: Navigate to API Settings

1. Click the **⚙️ Settings** icon (gear icon in left sidebar)
2. Click **API** section

### Step 3: Copy the CORRECT Keys

You will see two sections:

#### **Project URL:**
```
https://wxzwjghldpyafzjnfgoo.supabase.co
```
✅ This is correct in your .env.local

#### **Project API keys:**

**1. anon / public key** (starts with `eyJ`)
```
This is what you need for NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

**2. service_role key** (also starts with `eyJ`)
```
This is what you need for SUPABASE_SECRET_KEY
```

---

## Step 4: Update Your .env.local

Replace the content of `.env.local` with:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://wxzwjghldpyafzjnfgoo.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ... [PASTE YOUR ANON KEY HERE]
SUPABASE_SECRET_KEY=eyJ... [PASTE YOUR SERVICE_ROLE KEY HERE]
```

**Example of what it should look like:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://wxzwjghldpyafzjnfgoo.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4endqZ2hsZHB5YWZ6am5mZ29vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0NDExOTMsImV4cCI6MjEwNjAxNzE5M30.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
SUPABASE_SECRET_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4endqZ2hsZHB5YWZ6am5mZ29vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDQ0MTE5MywiZXhwIjoyMTA2MDE3MTkzfQ.FISWCZMgS2dj4ryHJ6xz2tPe7w3YeZDWcyYkT3z7_ZY
```

Notice:
- ✅ Both keys start with `eyJ`
- ✅ Both keys are LONG (200-400 characters)
- ✅ ANON key contains `"role":"anon"`
- ✅ SERVICE_ROLE key contains `"role":"service_role"`

---

## Step 5: Restart Dev Server

After updating `.env.local`:

```bash
# Stop the dev server (Ctrl+C if running)
# Then start again:
npm run dev
```

---

## Step 6: Try Login Again

Go to: http://localhost:3000/login

```
Email: owner@bizmanage.com
Password: Password123!
```

Should work now! ✅

---

## 🎯 Quick Checklist

Before testing login, verify:

- [ ] ✅ User created in Supabase Dashboard (Authentication → Users)
- [ ] ✅ "Auto Confirm User" was checked when creating user
- [ ] ✅ Email confirmation disabled (Authentication → Settings)
- [ ] ✅ Correct ANON key in .env.local (starts with eyJ, contains "role":"anon")
- [ ] ✅ Correct SERVICE_ROLE key in .env.local (starts with eyJ, contains "role":"service_role")
- [ ] ✅ Dev server restarted after updating .env.local
- [ ] ✅ Browser cache cleared (Ctrl+Shift+R) or try incognito

---

## 🔍 How to Find Your Keys (Visual Guide)

```
Supabase Dashboard
  ↓
Click Project: wxzwjghldpyafzjnfgoo
  ↓
⚙️ Settings (left sidebar)
  ↓
API
  ↓
Scroll down to "Project API keys"
  ↓
Copy "anon public" key → Paste to NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
Copy "service_role" key → Paste to SUPABASE_SECRET_KEY
```

---

## 🆘 Still Not Working?

### Check 1: Verify User Exists
Run this in Supabase SQL Editor:
```sql
SELECT email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email = 'owner@bizmanage.com';
```

Should return 1 row. If empty, user doesn't exist yet.

### Check 2: Manually Confirm Email
If `email_confirmed_at` is NULL:
```sql
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'owner@bizmanage.com';
```

### Check 3: Check Browser Console
1. Open login page
2. Press F12 (Developer Tools)
3. Go to Console tab
4. Try to login
5. Look for red errors
6. Screenshot and share the error

### Check 4: Verify .env.local is Loaded
Add this temporary debug in your login page to verify env vars:
```javascript
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Has Anon Key:', !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
```

---

## 📸 Screenshots to Take

If still not working, take screenshots of:

1. Supabase Dashboard → API page (showing your keys - it's okay, they'll rotate)
2. Your .env.local file
3. Browser console errors when trying to login
4. Supabase Dashboard → Authentication → Users page

---

## ✅ Expected Result After Fix

Login page → Enter credentials → ✅ Redirects to Dashboard

If you see the dashboard with your name "Owner Demo" at the top right, SUCCESS! 🎉

---

**Tandaan: Ang NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ay dapat JWT token na nagsisimula sa `eyJ` at mahaba!**
