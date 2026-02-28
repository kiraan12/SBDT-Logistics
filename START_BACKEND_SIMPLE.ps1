# Simple script to start backend - Run this in PowerShell
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting SBDT Backend Server" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to backend directory
Set-Location "C:\Users\Kiran R\Desktop\SBDT\backend"

# Activate virtual environment
& "..\venv\Scripts\Activate.ps1"

Write-Host "Starting server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Server will be available at:" -ForegroundColor Cyan
Write-Host "  http://localhost:8000" -ForegroundColor White
Write-Host "  http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "Press CTRL+C to stop" -ForegroundColor Gray
Write-Host ""

# Start uvicorn
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
