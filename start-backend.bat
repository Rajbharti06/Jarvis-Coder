@echo off
echo Starting Jarvis Terminal Backend...
cd backend
call venv\Scripts\activate.bat
python -m uvicorn main:create_application --reload --host 0.0.0.0 --port 8000
pause
