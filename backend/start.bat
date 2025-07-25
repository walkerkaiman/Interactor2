@echo off
echo Starting Interactor Backend...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if dependencies are installed
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if errorlevel 1 (
        echo Error: Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Build the project
echo Building project...
npm run build
if errorlevel 1 (
    echo Error: Build failed
    pause
    exit /b 1
)

REM Start the server
echo Starting server...
npm start

pause 