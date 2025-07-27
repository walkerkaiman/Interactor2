@echo off
echo Starting Interactor V2...
echo.

echo Installing dependencies...
echo.

REM Install backend dependencies
echo Installing backend dependencies...
cd backend
call npm install
if errorlevel 1 (
    echo Error: Failed to install backend dependencies
    pause
    exit /b 1
)

REM Install frontend dependencies
echo Installing frontend dependencies...
cd ..\frontend
call npm install
if errorlevel 1 (
    echo Error: Failed to install frontend dependencies
    pause
    exit /b 1
)

REM Install shared dependencies
echo Installing shared dependencies...
cd ..\shared
call npm install
if errorlevel 1 (
    echo Error: Failed to install shared dependencies
    pause
    exit /b 1
)

cd ..

echo.
echo Starting servers...
echo.

REM Start backend server in a new window
echo Starting backend server on port 3001...
start "Interactor Backend" cmd /k "cd backend && npm run dev"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend server in a new window
echo Starting frontend server on port 3000...
start "Interactor Frontend" cmd /k "cd frontend && npm run dev"

REM Wait a moment for frontend to start
timeout /t 5 /nobreak >nul

echo.
echo Opening browser...
echo.

REM Open browser to frontend
start http://localhost:3000

echo.
echo Interactor V2 is starting up!
echo.
echo Backend: http://localhost:3001
echo Frontend: http://localhost:3000
echo.
echo Both servers are running in separate windows.
echo Close those windows to stop the servers.
echo.
pause 