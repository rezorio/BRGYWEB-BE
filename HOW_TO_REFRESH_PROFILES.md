# How to Refresh All User Profile Status

## Quick Start - 3 Steps

### Step 1: Make sure backend is running
The backend should already be running. If not:
```bash
cd back-end
npm run start:dev
```

### Step 2: Find your admin credentials
Check what admin account you have in the database. Common defaults:
- Email: `admin@example.com`
- Password: `admin123`

Or check your seed file at: `back-end/src/database/seed.ts`

### Step 3: Run the refresh script

**Option A: With default credentials**
```bash
cd back-end
node refresh-all-profiles.js
```

**Option B: With custom credentials**
```bash
cd back-end
node refresh-all-profiles.js your-admin@email.com your-password
```

**Option C: Using PowerShell (edit credentials in file first)**
```powershell
cd back-end
.\refresh-all-profiles.ps1
```

## What You'll See

If successful, you'll see output like this:
```
Using credentials: admin@example.com / *********
=== Profile Status Refresh Script ===

Step 1: Logging in as admin...
✓ Login successful!

Step 2: Fetching all users...
✓ Found 3 users

Step 3: Refreshing profile status for all users...

Processing: user1@example.com (ID: abc-123-def)
  ✓ Status: COMPLETE
  - First Name: John
  - Last Name: Doe
  - Phone: 09123456789
  - Street: 123 Main St

Processing: user2@example.com (ID: xyz-456-uvw)
  ✓ Status: INCOMPLETE
  - First Name: Jane
  - Last Name: N/A
  - Phone: N/A
  - Street: N/A

=== Summary ===
Total users: 3
Successfully refreshed: 3
Failed: 0

Done!
```

## Troubleshooting

### Error: "Invalid credentials"
Your admin email/password is wrong. Try:
1. Check your database for the admin user
2. Or run the seed script: `npm run seed`
3. Then use: `admin@example.com` / `admin123`

### Error: "axios is not defined"
Install axios:
```bash
npm install axios
```

### Error: "ECONNREFUSED"
Backend is not running. Start it:
```bash
npm run start:dev
```

### Error: "port 3000 already in use"
Backend is already running! Just run the refresh script.

## Manual Method (Using PowerShell)

If the script doesn't work, you can do it manually:

```powershell
# 1. Login
$body = @{
    email = "admin@example.com"
    password = "admin123"
} | ConvertTo-Json

$login = Invoke-RestMethod -Uri "http://localhost:3000/auth/login" -Method Post -Body $body -ContentType "application/json"
$token = $login.accessToken

# 2. Get all users
$headers = @{ Authorization = "Bearer $token" }
$users = Invoke-RestMethod -Uri "http://localhost:3000/users" -Method Get -Headers $headers

# 3. Refresh each user
foreach ($user in $users) {
    Write-Host "Refreshing: $($user.email)"
    Invoke-RestMethod -Uri "http://localhost:3000/users/$($user.id)/refresh-profile-status" -Method Post -Headers $headers
}

Write-Host "Done!"
```

## What This Does

For each user in your database:
1. ✅ Checks if they have: firstName, lastName, phoneNumber, street
2. ✅ Sets `isProfileComplete = true` if all 4 fields are filled
3. ✅ Sets `isProfileComplete = false` if any field is missing
4. ✅ Saves the status to database

After running this, all users will have the correct profile status, and document requests will work properly!
