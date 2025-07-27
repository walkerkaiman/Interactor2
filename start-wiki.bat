@echo off
REM ========================================
REM    Interactor - Wiki Demo
REM    This script starts a minimal server to show the new wiki page
REM ========================================
echo ========================================
echo    Interactor - Wiki Demo
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

cd frontend
if not exist "node_modules" (
    echo Installing frontend dependencies...
    npm install
)

cd ..

echo.
echo ========================================
echo    Building Frontend
echo ========================================
echo.

REM Build frontend
cd frontend
echo Building frontend...
npm run build
cd ..

echo.
echo ========================================
echo    Starting Wiki Demo Server
echo ========================================
echo.

REM Start the simple server
echo Starting Simple Server...
start "Interactor2 Wiki Demo" cmd /k "cd /d %CD%\backend && echo Starting simple server... && echo Server will be available at: http://localhost:3001 && echo Press Ctrl+C to stop the server && echo. && npx ts-node src/simple-server.ts"

REM Wait for server to start
echo Waiting for server to start...
timeout /t 5 /nobreak >nul

REM Open browser
echo Opening browser...
start http://localhost:3001

echo.
echo ========================================
echo    Wiki Demo Started!
echo ========================================
echo.
echo The server is running at: http://localhost:3001
echo.
echo Click on the "📚 Wiki" tab to see the new documentation grid!
echo.
pause 