@echo off
REM ========================================
REM    Interactor - Simple Start
REM    This script starts the server without building
REM ========================================
echo ========================================
echo    Interactor - Simple Start
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js version:
node --version
echo.

REM Install dependencies if needed
cd backend
if not exist "node_modules" (
    echo Installing backend dependencies...
    npm install
)

cd ..

cd shared
if not exist "node_modules" (
    echo Installing shared dependencies...
    npm install
)

cd ..

cd frontend
if not exist "node_modules" (
    echo Installing frontend dependencies...
    npm install
)

cd ..

echo.
echo ========================================
echo    Starting Simple Server
echo ========================================
echo.

REM Start backend server with ts-node directly
echo Starting Backend Server...
start "Interactor2 Simple" cmd /k "cd /d %CD%\backend && echo Starting server with ts-node... && echo Server will be available at: http://localhost:3001 && echo Press Ctrl+C to stop the server && echo. && npx ts-node src/index.ts"

REM Wait for server to start
echo Waiting for server to start...
timeout /t 8 /nobreak >nul

REM Open browser
echo Opening browser...
start http://localhost:3001

echo.
echo ========================================
echo    Server Started!
echo ========================================
echo.
echo The server should be running at: http://localhost:3001
echo.
echo If the page doesn't load, wait a few more seconds and refresh.
echo.
pause 