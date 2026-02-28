# PowerShell script to setup database (migrations + seed)
Write-Host "Setting up SBDT Logistics Database..." -ForegroundColor Green

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

# Run migrations
Write-Host "Running database migrations..." -ForegroundColor Cyan
alembic upgrade head

if ($LASTEXITCODE -eq 0) {
    Write-Host "Migrations completed successfully!" -ForegroundColor Green
    
    # Seed admin user
    Write-Host "Seeding admin user..." -ForegroundColor Cyan
    python -m app.initial_data
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Database setup completed!" -ForegroundColor Green
        Write-Host "Admin credentials:" -ForegroundColor Yellow
        Write-Host "  Email: admin@sbdt.com" -ForegroundColor Yellow
        Write-Host "  Password: admin123" -ForegroundColor Yellow
    } else {
        Write-Host "Warning: Admin user seeding failed. You may need to run it manually." -ForegroundColor Yellow
    }
} else {
    Write-Host "Error: Migrations failed. Please check your database connection." -ForegroundColor Red
    exit 1
}
