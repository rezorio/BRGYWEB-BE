# Profile Status Refresh Scripts

These scripts will refresh the `isProfileComplete` status for all users in your database.

## Prerequisites

1. **Backend server must be running**
   ```bash
   npm run start:dev
   ```

2. **You need admin credentials**
   - Default: `admin@example.com` / `admin123`
   - Update the credentials in the script files if different

## Option 1: Node.js Script (Recommended)

### Step 1: Update Admin Credentials
Edit `refresh-all-profiles.js` and change these lines:
```javascript
const ADMIN_EMAIL = 'admin@example.com';     // Your admin email
const ADMIN_PASSWORD = 'admin123';           // Your admin password
```

### Step 2: Run the Script
```bash
cd back-end
node refresh-all-profiles.js
```

### Expected Output:
```
=== Profile Status Refresh Script ===

Step 1: Logging in as admin...
✓ Login successful!

Step 2: Fetching all users...
✓ Found 5 users

Step 3: Refreshing profile status for all users...

Processing: user1@example.com (ID: abc-123)
  ✓ Status: COMPLETE
  - First Name: John
  - Last Name: Doe
  - Phone: 09123456789
  - Street: 123 Main St

Processing: user2@example.com (ID: def-456)
  ✓ Status: INCOMPLETE
  - First Name: Jane
  - Last Name: Smith
  - Phone: N/A
  - Street: N/A

=== Summary ===
Total users: 5
Successfully refreshed: 5
Failed: 0

Done!
```

## Option 2: PowerShell Script

### Step 1: Update Admin Credentials
Edit `refresh-all-profiles.ps1` and change these lines:
```powershell
$adminEmail = "admin@example.com"     # Your admin email
$adminPassword = "admin123"           # Your admin password
```

### Step 2: Run the Script
```powershell
cd back-end
.\refresh-all-profiles.ps1
```

## Option 3: Manual API Call (Single User)

If you want to refresh just one user, use this PowerShell command:

```powershell
# First, login to get token
$loginBody = @{
    email = "admin@example.com"
    password = "admin123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginResponse.accessToken

# Then refresh a specific user
$userId = "your-user-id-here"
$headers = @{ Authorization = "Bearer $token" }

Invoke-RestMethod -Uri "http://localhost:3000/users/$userId/refresh-profile-status" -Method Post -Headers $headers
```

## Option 4: Using Postman or Thunder Client

1. **Login to get token:**
   - Method: `POST`
   - URL: `http://localhost:3000/auth/login`
   - Body (JSON):
     ```json
     {
       "email": "admin@example.com",
       "password": "admin123"
     }
     ```
   - Copy the `accessToken` from response

2. **Get all users:**
   - Method: `GET`
   - URL: `http://localhost:3000/users`
   - Headers: `Authorization: Bearer {your-token}`
   - Copy user IDs from response

3. **Refresh each user:**
   - Method: `POST`
   - URL: `http://localhost:3000/users/{userId}/refresh-profile-status`
   - Headers: `Authorization: Bearer {your-token}`

## What This Does

The refresh script will:
1. ✅ Login as admin
2. ✅ Fetch all users from the database
3. ✅ For each user:
   - Check if required fields are filled (firstName, lastName, phoneNumber, street)
   - Update the `isProfileComplete` field in database
   - Save the updated status
4. ✅ Show summary of results

## When to Use This

- After migrating existing users
- If users are getting "incomplete profile" errors despite having complete profiles
- To sync the database status with actual profile data
- After bulk importing users

## Troubleshooting

### Error: "Login failed"
- Check that backend server is running (`npm run start:dev`)
- Verify admin credentials are correct
- Make sure you're using the correct port (default: 3000)

### Error: "Failed to fetch users"
- Ensure you're logged in as admin (not regular user)
- Check that the admin role has proper permissions

### Error: "axios is not defined" (Node.js script)
- Install axios: `npm install axios`
- Or use the PowerShell script instead

## Notes

- The script is safe to run multiple times
- It only updates the `isProfileComplete` field
- No other user data is modified
- All changes are logged to console
- Backend logs will show detailed information about each update
