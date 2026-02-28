# Safe backend startup script with error checking
Write-Host "Starting SBDT Backend..." -ForegroundColor Cyan

cd backend

# Activate venv
if (Test-Path "..\venv\Scripts\Activate.ps1") {
    & "..\venv\Scripts\Activate.ps1"
} else {
    Write-Host "❌ Virtual environment not found!" -ForegroundColor Red
    exit 1
}

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  .env file not found. Using defaults from config.py" -ForegroundColor Yellow
}

# Check database connection (optional, but helpful)
Write-Host "`nChecking database connection..." -ForegroundColor Yellow
try {
    python -c "from app.db.session import SessionLocal; db = SessionLocal(); db.execute('SELECT 1'); db.close(); print('✅ Database connection OK')" 2>&1
} catch {
    Write-Host "⚠️  Database connection check failed. Backend may still start but login will fail." -ForegroundColor Yellow
    Write-Host "Make sure PostgreSQL is running and database 'sbdt_logistics' exists." -ForegroundColor Yellow
}

Write-Host "`nStarting FastAPI server on http://localhost:8000" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop`n" -ForegroundColor Yellow

# Start uvicorn
uvicorn app.main:app --reload --port 8000 --host 0.0.0.0
