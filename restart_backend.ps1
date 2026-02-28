# PowerShell script to restart the backend server
Write-Host "Restarting SBDT Backend Server..." -ForegroundColor Yellow

# Stop any existing backend processes
Write-Host "Stopping existing backend processes..." -ForegroundColor Cyan
$backendProcesses = Get-Process | Where-Object {
    $_.ProcessName -eq "python" -and 
    ($_.CommandLine -like "*uvicorn*" -or $_.CommandLine -like "*app.main*" -or $_.Id -eq 18940)
} -ErrorAction SilentlyContinue

if ($backendProcesses) {
    $backendProcesses | ForEach-Object {
        Write-Host "Stopping process ID: $($_.Id)" -ForegroundColor Gray
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
}

# Wait for port to be free
Write-Host "Waiting for port 8000 to be free..." -ForegroundColor Cyan
$maxWait = 10
$waited = 0
while ($waited -lt $maxWait) {
    $portInUse = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
    if (-not $portInUse) {
        break
    }
    Start-Sleep -Seconds 1
    $waited++
    Write-Host "." -NoNewline -ForegroundColor Gray
}
Write-Host ""

# Activate virtual environment
if (Test-Path "..\venv\Scripts\Activate.ps1") {
    & "..\venv\Scripts\Activate.ps1"
} elseif (Test-Path "venv\Scripts\Activate.ps1") {
    & "venv\Scripts\Activate.ps1"
} else {
    Write-Host "Virtual environment not found. Please activate manually." -ForegroundColor Yellow
}

# Start backend server
Write-Host "Starting backend server..." -ForegroundColor Green
Write-Host "Backend will be available at: http://localhost:8000" -ForegroundColor Cyan
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --workers 1
