# PowerShell script to grant database permissions to sbdt_user
# This script connects to PostgreSQL and grants necessary permissions

Write-Host "Granting permissions to sbdt_user..." -ForegroundColor Cyan

# Check if psql is available
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue

if (-not $psqlPath) {
    Write-Host "Error: psql command not found. Please ensure PostgreSQL is installed and psql is in your PATH." -ForegroundColor Red
    Write-Host "Alternatively, you can run the SQL commands manually using pgAdmin:" -ForegroundColor Yellow
    Write-Host "1. Open pgAdmin" -ForegroundColor Yellow
    Write-Host "2. Connect to your PostgreSQL server" -ForegroundColor Yellow
    Write-Host "3. Right-click on 'sbdt_logistics' database → Query Tool" -ForegroundColor Yellow
    Write-Host "4. Copy and paste the contents of grant_permissions.sql" -ForegroundColor Yellow
    Write-Host "5. Execute the query" -ForegroundColor Yellow
    exit 1
}

# Prompt for postgres password
$postgresPassword = Read-Host "Enter PostgreSQL superuser (postgres) password" -AsSecureString
$postgresPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($postgresPassword)
)

# Set PGPASSWORD environment variable
$env:PGPASSWORD = $postgresPasswordPlain

# Run SQL commands
Write-Host "Connecting to PostgreSQL..." -ForegroundColor Cyan

$sqlCommands = @"
\c sbdt_logistics
GRANT USAGE ON SCHEMA public TO sbdt_user;
GRANT CREATE ON SCHEMA public TO sbdt_user;
GRANT ALL PRIVILEGES ON DATABASE sbdt_logistics TO sbdt_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO sbdt_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO sbdt_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO sbdt_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO sbdt_user;
\du sbdt_user
"@

try {
    $sqlCommands | psql -U postgres -h localhost -d postgres
    Write-Host "`n✅ Permissions granted successfully!" -ForegroundColor Green
    Write-Host "You can now run: alembic upgrade head" -ForegroundColor Yellow
} catch {
    Write-Host "Error executing SQL commands: $_" -ForegroundColor Red
    Write-Host "`nYou can also run the SQL commands manually:" -ForegroundColor Yellow
    Write-Host "1. Open pgAdmin or psql" -ForegroundColor Yellow
    Write-Host "2. Connect as postgres user" -ForegroundColor Yellow
    Write-Host "3. Run the commands from grant_permissions.sql" -ForegroundColor Yellow
} finally {
    # Clear password from environment
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}
