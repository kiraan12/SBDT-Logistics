@echo off
echo ========================================
echo Starting SBDT Backend Server
echo ========================================
echo.

cd backend
call ..\venv\Scripts\activate.bat

echo Starting server on http://localhost:8000
echo.
echo API will be available at:
echo   - http://localhost:8000
echo   - http://localhost:8000/docs
echo.
echo Use http://localhost:8000 in your browser (not 0.0.0.0)
echo Press CTRL+C to stop the server
echo.

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

pause
