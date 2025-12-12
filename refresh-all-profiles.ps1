# PowerShell Script to Refresh Profile Completeness Status for All Users
# This script calls the refresh endpoint for all users in the system

# Configuration
$baseUrl = "http://localhost:3000"
$adminEmail = "admin@example.com"  # Change this to your admin email
$adminPassword = "admin123"        # Change this to your admin password

Write-Host "=== Profile Status Refresh Script ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Login as admin to get token
Write-Host "Step 1: Logging in as admin..." -ForegroundColor Yellow
$loginBody = @{
    email = $adminEmail
    password = $adminPassword
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.accessToken
    Write-Host "✓ Login successful!" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "✗ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please check your admin credentials in the script." -ForegroundColor Yellow
    exit 1
}

# Step 2: Get all users
Write-Host "Step 2: Fetching all users..." -ForegroundColor Yellow
$headers = @{
    Authorization = "Bearer $token"
}

try {
    $users = Invoke-RestMethod -Uri "$baseUrl/users" -Method Get -Headers $headers
    Write-Host "✓ Found $($users.Count) users" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "✗ Failed to fetch users: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 3: Refresh profile status for each user
Write-Host "Step 3: Refreshing profile status for all users..." -ForegroundColor Yellow
Write-Host ""

$successCount = 0
$failCount = 0

foreach ($user in $users) {
    $userId = $user.id
    $userEmail = $user.email
    
    Write-Host "Processing: $userEmail (ID: $userId)" -ForegroundColor Cyan
    
    try {
        $refreshResponse = Invoke-RestMethod -Uri "$baseUrl/users/$userId/refresh-profile-status" -Method Post -Headers $headers
        
        $status = if ($refreshResponse.isProfileComplete) { "COMPLETE" } else { "INCOMPLETE" }
        $statusColor = if ($refreshResponse.isProfileComplete) { "Green" } else { "Yellow" }
        
        Write-Host "  ✓ Status: $status" -ForegroundColor $statusColor
        Write-Host "  - First Name: $($refreshResponse.firstName)" -ForegroundColor Gray
        Write-Host "  - Last Name: $($refreshResponse.lastName)" -ForegroundColor Gray
        Write-Host "  - Phone: $($refreshResponse.phoneNumber)" -ForegroundColor Gray
        Write-Host "  - Street: $($refreshResponse.street)" -ForegroundColor Gray
        Write-Host ""
        
        $successCount++
    } catch {
        Write-Host "  ✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        $failCount++
    }
}

# Summary
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "Total users: $($users.Count)" -ForegroundColor White
Write-Host "Successfully refreshed: $successCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor Red
Write-Host ""
Write-Host "Done!" -ForegroundColor Green
