# PowerShell script to start the FastAPI backend server
Write-Host "Starting SBDT Logistics Backend..." -ForegroundColor Green

# Activate virtual environment
if (Test-Path "..\venv\Scripts\Activate.ps1") {
    & "..\venv\Scripts\Activate.ps1"
} elseif (Test-Path "venv\Scripts\Activate.ps1") {
    & "venv\Scripts\Activate.ps1"
} else {
    Write-Host "Virtual environment not found. Please activate manually." -ForegroundColor Yellow
}

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "Warning: .env file not found. Using default settings." -ForegroundColor Yellow
}

# Check if port 8000 is already in use
$portInUse = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "Warning: Port 8000 is already in use!" -ForegroundColor Yellow
    Write-Host "Please stop any existing backend servers before starting a new one." -ForegroundColor Yellow
    Write-Host ""
    $response = Read-Host "Continue anyway? (y/N)"
    if ($response -ne "y" -and $response -ne "Y") {
        exit 1
    }
}

# Disable PaddleOCR model source check for faster startup
$env:PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK = "True"

# Start uvicorn server with single worker to avoid Windows socket buffer issues
Write-Host "Starting FastAPI server on http://0.0.0.0:8000" -ForegroundColor Cyan
Write-Host "Accessible at:" -ForegroundColor Gray
Write-Host "  - http://localhost:8000" -ForegroundColor White
Write-Host "  - http://127.0.0.1:8000" -ForegroundColor White
Write-Host "  - API Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "Note: Using single worker to avoid Windows socket buffer issues" -ForegroundColor Gray
Write-Host "Note: PaddleOCR model source check disabled for faster startup" -ForegroundColor Gray
Write-Host ""
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --workers 1
