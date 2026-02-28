@echo off
cd /d "%~dp0"
echo Starting SBDT backend on http://localhost:8000
echo.
if exist .venv\Scripts\activate.bat (
    call .venv\Scripts\activate.bat
    python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
) else (
    echo No .venv found. Run: python -m venv .venv   then   .venv\Scripts\pip install -r requirements.txt
    python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
)
pause
