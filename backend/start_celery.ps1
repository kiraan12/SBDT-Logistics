# PowerShell script to start Celery worker
Write-Host "Starting Celery Worker..." -ForegroundColor Green

# Activate virtual environment
if (Test-Path "..\venv\Scripts\Activate.ps1") {
    & "..\venv\Scripts\Activate.ps1"
} elseif (Test-Path "venv\Scripts\Activate.ps1") {
    & "venv\Scripts\Activate.ps1"
} else {
    Write-Host "Virtual environment not found. Please activate manually." -ForegroundColor Yellow
}

# Start Celery worker
Write-Host "Starting Celery worker for background tasks..." -ForegroundColor Cyan
celery -A app.worker.celery_app worker --loglevel=info
