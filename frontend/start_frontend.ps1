# PowerShell script to start the React frontend
Write-Host "Starting SBDT Logistics Frontend..." -ForegroundColor Green

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Cyan
    npm install
}

# Start development server
Write-Host "Starting Vite dev server..." -ForegroundColor Cyan
npm run dev
