@echo off
setlocal enabledelayedexpansion

echo ========================================
echo    Interactor V2 - Single Test Monitor
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

REM Check and install dependencies
echo Checking dependencies...

cd backend
if not exist "node_modules" (
    echo Installing backend dependencies...
    npm install
)

cd ..\shared
if not exist "node_modules" (
    echo Installing shared dependencies...
    npm install
)

cd ..\Tests
if not exist "node_modules" (
    echo Installing test dependencies...
    npm install
)

cd ..

echo Dependencies check complete.
echo.

REM Build packages
echo Building packages...
cd shared
npm run build
cd ..

cd backend
npm run build
cd ..

echo Build complete.
echo.

echo ========================================
echo    Starting Test Suite Monitor
echo ========================================
echo.
echo This will run all tests in watch mode.
echo Tests will automatically re-run when files change.
echo.
echo Test suites included:
echo - Backend unit tests
echo - Core system tests  
echo - TypeScript compilation
echo - ESLint code quality
echo.
echo Press Ctrl+C to stop all tests
echo.

REM Run all tests in watch mode
echo Starting comprehensive test monitoring...
echo.

cd Tests
echo [%time%] Running Core System Tests...
echo Running all tests in watch mode...
npm run test:watch

echo.
echo Test monitoring stopped.
pause 