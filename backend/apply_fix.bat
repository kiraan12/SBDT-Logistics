@echo off
REM Quick fix script for Windows

echo.
echo ====================================
echo SBDT Backend - Response Format Fix
echo ====================================
echo.

REM Check if app/main.py exists
if not exist "app\main.py" (
    echo ERROR: app\main.py not found!
    echo Make sure you're in the backend directory
    pause
    exit /b 1
)

echo Step 1: Creating backup...
REM Create timestamp
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c%%a%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)

set backupfile=app\main.py.backup.%mydate%_%mytime%

copy "app\main.py" "%backupfile%" >nul 2>&1
if errorlevel 1 (
    echo ERROR: Could not create backup!
    pause
    exit /b 1
)

echo ✓ Backup created: %backupfile%
echo.

echo Step 2: Checking if new main.py exists...
if not exist "main_WORKING.py" (
    echo ERROR: main_WORKING.py not found!
    echo Make sure you downloaded it from the outputs folder
    pause
    exit /b 1
)

echo ✓ Found main_WORKING.py
echo.

echo Step 3: Replacing app/main.py...
copy "main_WORKING.py" "app\main.py" >nul 2>&1
if errorlevel 1 (
    echo ERROR: Could not copy file!
    pause
    exit /b 1
)

echo ✓ Replaced app/main.py with working version
echo.

echo Step 4: Verifying Python syntax...
python -m py_compile app/main.py >nul 2>&1
if errorlevel 1 (
    echo ERROR: Syntax error in new main.py!
    echo Restoring backup...
    copy "%backupfile%" "app\main.py" >nul 2>&1
    pause
    exit /b 1
)

echo ✓ Python syntax is valid
echo.

echo ====================================
echo ✅ FIX APPLIED SUCCESSFULLY!
echo ====================================
echo.
echo Next steps:
echo.
echo 1. Stop the current server (Ctrl+C in backend terminal)
echo.
echo 2. Restart with:
echo    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
echo.
echo 3. Test in new PowerShell window:
echo    $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing
echo    $response.Content ^| ConvertFrom-Json ^| ConvertTo-Json
echo.
echo.
pause