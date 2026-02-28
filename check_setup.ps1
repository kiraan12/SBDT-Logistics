# Quick setup checker for SBDT Logistics
Write-Host "`n=== SBDT Logistics Setup Check ===" -ForegroundColor Cyan

# Check Backend
Write-Host "`n1. Checking Backend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    Write-Host "   ✅ Backend is running on http://localhost:8000" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Backend is NOT running" -ForegroundColor Red
    Write-Host "   Start it with: cd backend && ..\venv\Scripts\Activate.ps1 && uvicorn app.main:app --reload --port 8000" -ForegroundColor Yellow
}

# Check Frontend
Write-Host "`n2. Checking Frontend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173/" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    Write-Host "   ✅ Frontend is running on http://localhost:5173" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Frontend might not be running (check the port shown in terminal)" -ForegroundColor Yellow
}

# Check PostgreSQL
Write-Host "`n3. Checking PostgreSQL..." -ForegroundColor Yellow
try {
    $pgService = Get-Service -Name "*postgresql*" -ErrorAction SilentlyContinue
    if ($pgService) {
        if ($pgService.Status -eq "Running") {
            Write-Host "   ✅ PostgreSQL service is running" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  PostgreSQL service exists but is stopped" -ForegroundColor Yellow
            Write-Host "   Start it with: Start-Service -Name `"$($pgService.Name)`"" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ⚠️  PostgreSQL service not found (might be running via Docker or different method)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  Could not check PostgreSQL status" -ForegroundColor Yellow
}

# Check Redis
Write-Host "`n4. Checking Redis..." -ForegroundColor Yellow
try {
    $redisService = Get-Service -Name "*redis*" -ErrorAction SilentlyContinue
    if ($redisService) {
        if ($redisService.Status -eq "Running") {
            Write-Host "   ✅ Redis service is running" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  Redis service exists but is stopped" -ForegroundColor Yellow
            Write-Host "   Start it with: Start-Service -Name `"$($redisService.Name)`"" -ForegroundColor Yellow
            Write-Host "   Or use Docker: docker run -d -p 6379:6379 redis" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ⚠️  Redis service not found (might be running via Docker)" -ForegroundColor Yellow
        Write-Host "   Use Docker: docker run -d -p 6379:6379 redis" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  Could not check Redis status" -ForegroundColor Yellow
}

# Check Database Users
Write-Host "`n5. Checking Database Users..." -ForegroundColor Yellow
Write-Host "   Run this to check/create users:" -ForegroundColor Cyan
Write-Host "   cd backend && ..\venv\Scripts\Activate.ps1 && python -m app.initial_data" -ForegroundColor White

Write-Host "`n=== Test Credentials ===" -ForegroundColor Cyan
Write-Host "Admin: admin@sbdt.com / admin123" -ForegroundColor White
Write-Host "Operator: operator@sbdt.com / operator123" -ForegroundColor White

Write-Host "`n=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Ensure PostgreSQL is running" -ForegroundColor White
Write-Host "2. Run: cd backend && ..\venv\Scripts\Activate.ps1 && alembic upgrade head" -ForegroundColor White
Write-Host "3. Run: python -m app.initial_data" -ForegroundColor White
Write-Host "4. Start backend: uvicorn app.main:app --reload --port 8000" -ForegroundColor White
Write-Host "5. Start frontend: cd frontend && npm run dev" -ForegroundColor White
Write-Host "`n"
