@echo off
echo ========================================
echo    Interactor V2 - Interactive Art
echo    Installation System
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

REM Navigate to backend directory
cd backend

REM Check if dependencies are installed
if not exist "node_modules" (
    echo Installing backend dependencies...
    npm install
    if errorlevel 1 (
        echo Error: Failed to install backend dependencies
        pause
        exit /b 1
    )
)

REM Check if shared dependencies are installed
cd ..\shared
if not exist "node_modules" (
    echo Installing shared dependencies...
    npm install
    if errorlevel 1 (
        echo Error: Failed to install shared dependencies
        pause
        exit /b 1
    )
)

REM Go back to backend and start the server
cd ..\backend

echo.
echo Starting Interactor Backend Server...
echo Server will be available at: http://localhost:3001
echo Press Ctrl+C to stop the server
echo.

REM Start the server in development mode
npm start

pause
