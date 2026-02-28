# Quick fix script for backend connection issues
Write-Host "=== Fixing Backend Connection ===" -ForegroundColor Yellow
Write-Host ""

# Kill process on port 8000
Write-Host "Killing process on port 8000..." -ForegroundColor Cyan
$port8000 = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($port8000) {
    Write-Host "Found process ID: $port8000" -ForegroundColor Gray
    Stop-Process -Id $port8000 -Force -ErrorAction SilentlyContinue
    Write-Host "Process killed" -ForegroundColor Green
    Start-Sleep -Seconds 2
} else {
    Write-Host "No process found on port 8000" -ForegroundColor Gray
}

# Kill any other Python processes (be careful)
Write-Host ""
Write-Host "Checking for other Python processes..." -ForegroundColor Cyan
$pythonProcs = Get-Process python -ErrorAction SilentlyContinue
if ($pythonProcs) {
    Write-Host "Found $($pythonProcs.Count) Python process(es)" -ForegroundColor Yellow
    Write-Host "These will be stopped. Continue? (y/N)" -ForegroundColor Yellow
    $response = Read-Host
    if ($response -eq "y" -or $response -eq "Y") {
        $pythonProcs | Stop-Process -Force -ErrorAction SilentlyContinue
        Write-Host "Python processes stopped" -ForegroundColor Green
        Start-Sleep -Seconds 2
    }
}

# Wait for port to be free
Write-Host ""
Write-Host "Waiting for port 8000 to be free..." -ForegroundColor Cyan
$maxWait = 5
for ($i = 0; $i -lt $maxWait; $i++) {
    $stillInUse = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
    if (-not $stillInUse) {
        Write-Host "Port 8000 is free!" -ForegroundColor Green
        break
    }
    Start-Sleep -Seconds 1
    Write-Host "." -NoNewline -ForegroundColor Gray
}
Write-Host ""

# Activate virtual environment
Write-Host ""
Write-Host "Activating virtual environment..." -ForegroundColor Cyan
if (Test-Path "..\venv\Scripts\Activate.ps1") {
    & "..\venv\Scripts\Activate.ps1"
} elseif (Test-Path "venv\Scripts\Activate.ps1") {
    & "venv\Scripts\Activate.ps1"
} else {
    Write-Host "Virtual environment not found. Please activate manually." -ForegroundColor Yellow
}

# Disable PaddleOCR model source check for faster startup
$env:PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK = "True"

# Start backend
Write-Host ""
Write-Host "Starting backend server..." -ForegroundColor Green
Write-Host "Backend will be available at: http://localhost:8000" -ForegroundColor Cyan
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --workers 1
