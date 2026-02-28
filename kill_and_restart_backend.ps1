# Quick script to kill zombie backend and restart
Write-Host "=== Fixing Backend Connection ===" -ForegroundColor Yellow
Write-Host ""

# Step 1: Kill process on port 8000
Write-Host "Step 1: Killing process on port 8000..." -ForegroundColor Cyan
$port8000 = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($port8000) {
    Write-Host "Found process ID: $port8000" -ForegroundColor Gray
    Stop-Process -Id $port8000 -Force -ErrorAction SilentlyContinue
    Write-Host "Process killed" -ForegroundColor Green
} else {
    Write-Host "No process found on port 8000" -ForegroundColor Gray
}

# Step 2: Kill any Python processes that might be backend
Write-Host ""
Write-Host "Step 2: Cleaning up Python processes..." -ForegroundColor Cyan
$pythonProcs = Get-Process python -ErrorAction SilentlyContinue
if ($pythonProcs) {
    $pythonProcs | ForEach-Object {
        Write-Host "Found Python process: $($_.Id)" -ForegroundColor Gray
    }
    Write-Host "Stopping Python processes..." -ForegroundColor Yellow
    $pythonProcs | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "Python processes stopped" -ForegroundColor Green
} else {
    Write-Host "No Python processes found" -ForegroundColor Gray
}

# Step 3: Wait for port to be free
Write-Host ""
Write-Host "Step 3: Waiting for port 8000 to be free..." -ForegroundColor Cyan
$maxWait = 5
$waited = 0
while ($waited -lt $maxWait) {
    $stillInUse = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
    if (-not $stillInUse) {
        Write-Host "Port 8000 is now free!" -ForegroundColor Green
        break
    }
    Start-Sleep -Seconds 1
    $waited++
    Write-Host "." -NoNewline -ForegroundColor Gray
}
Write-Host ""

# Step 4: Start backend
Write-Host ""
Write-Host "Step 4: Starting backend server..." -ForegroundColor Cyan
Write-Host "Please run this command in the backend directory:" -ForegroundColor Yellow
Write-Host "  cd backend" -ForegroundColor White
Write-Host "  .\start_backend.ps1" -ForegroundColor White
Write-Host ""
Write-Host "Or run it now? (y/N)" -ForegroundColor Yellow
$response = Read-Host
if ($response -eq "y" -or $response -eq "Y") {
    Set-Location backend
    & ".\start_backend.ps1"
} else {
    Write-Host ""
    Write-Host "Done! Now manually start the backend:" -ForegroundColor Green
    Write-Host "  cd backend" -ForegroundColor Cyan
    Write-Host "  .\start_backend.ps1" -ForegroundColor Cyan
}
