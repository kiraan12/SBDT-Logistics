@echo off
cd /d "%~dp0"
echo Starting SBDT backend on http://localhost:8000 ...
echo Keep this window OPEN - sign-in will not work if the backend is not running.
echo.
if exist .venv\Scripts\activate.bat (
    call .venv\Scripts\activate.bat
) else (
    echo No .venv found. Create it with: python -m venv .venv  then  .venv\Scripts\pip install -r requirements.txt
    pause
    exit /b 1
)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pause
