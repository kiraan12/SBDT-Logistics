# Simple PostgreSQL setup guide
Write-Host "`n=== PostgreSQL Setup Options ===" -ForegroundColor Cyan

Write-Host "`nOption 1: Use Docker (Easiest)" -ForegroundColor Green
Write-Host "Run this command:" -ForegroundColor Yellow
Write-Host "  docker run -d -p 5432:5432 --name sbdt-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=sbdt_logistics postgres" -ForegroundColor White
Write-Host "`nThen wait 5-10 seconds for PostgreSQL to start, then run migrations."

Write-Host "`nOption 2: Install PostgreSQL Locally" -ForegroundColor Green
Write-Host "1. Download from: https://www.postgresql.org/download/windows/" -ForegroundColor White
Write-Host "2. Install with default settings" -ForegroundColor White
Write-Host "3. Set password to 'postgres' during installation" -ForegroundColor White
Write-Host "4. Start PostgreSQL service from Services (services.msc)" -ForegroundColor White

Write-Host "`nOption 3: Use SQLite (Quick Test - Not Recommended for Production)" -ForegroundColor Yellow
Write-Host "We can modify the code to use SQLite temporarily, but PostgreSQL is recommended." -ForegroundColor White

Write-Host "`nAfter PostgreSQL is running:" -ForegroundColor Cyan
Write-Host "  cd backend" -ForegroundColor White
Write-Host "  ..\venv\Scripts\Activate.ps1" -ForegroundColor White
Write-Host "  alembic upgrade head" -ForegroundColor White
Write-Host "  python -m app.initial_data" -ForegroundColor White
Write-Host "  uvicorn app.main:app --reload --port 8000" -ForegroundColor White
Write-Host "`n"
