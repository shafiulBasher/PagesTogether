@echo off
echo Starting PagesTogether Development Server...
echo.
echo [1/2] Starting Backend Server...
start cmd /k "cd /d \"%~dp0server\" && npm run dev"

timeout /t 3 /nobreak > nul

echo [2/2] Starting Frontend Development Server...
start cmd /k "cd /d \"%~dp0client\" && npm start"

echo.
echo Both servers are starting...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Press any key to close this window...
pause > nul
