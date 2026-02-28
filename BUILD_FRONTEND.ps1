# Build Script for SBDT Frontend
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Building SBDT Frontend for Production" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to frontend directory
Set-Location "frontend"

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "Building for production..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Build successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Production files are in: frontend/dist/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "To preview the build locally, run:" -ForegroundColor Yellow
    Write-Host "  cd frontend" -ForegroundColor White
    Write-Host "  npm run preview" -ForegroundColor White
    Write-Host ""
    Write-Host "To deploy, upload the 'dist' folder to your hosting provider." -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ Build failed. Please check the errors above." -ForegroundColor Red
}

Set-Location ".."
