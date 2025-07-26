@echo off
setlocal enabledelayedexpansion

echo ========================================
echo    Interactor V2 - Test Suite Monitor
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
    if errorlevel 1 (
        echo Error: Failed to install backend dependencies
        pause
        exit /b 1
    )
)

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

cd ..\Tests
if not exist "node_modules" (
    echo Installing test dependencies...
    npm install
    if errorlevel 1 (
        echo Error: Failed to install test dependencies
        pause
        exit /b 1
    )
)

cd ..

echo Dependencies check complete.
echo.

REM Build packages
echo Building packages...
echo.

echo Building shared package...
cd shared
npm run build
if errorlevel 1 (
    echo Error: Failed to build shared package
    echo Please check the error messages above
    pause
    exit /b 1
)
echo Shared package built successfully.
cd ..

echo.
echo Building backend package...
cd backend
npm run build
if errorlevel 1 (
    echo Error: Failed to build backend package
    echo Please check the error messages above
    echo.
    echo Common issues:
    echo - Missing copyfiles dependency: run 'npm install copyfiles --save-dev'
    echo - TypeScript compilation errors: check src files for syntax errors
    echo - Missing dependencies: run 'npm install'
    pause
    exit /b 1
)
echo Backend package built successfully.
cd ..

echo.
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
echo - Core system tests (API, Logger, StateManager, etc.)
echo - Module tests (Input/Output modules)
echo - All 278+ test cases
echo.
echo Commands:
echo - Press 'q' to quit
echo - Press 'h' to show help
echo - Press 'a' to run all tests
echo - Press 'f' to run only failed tests
echo - Press 'u' to update snapshots
echo.
echo Press Ctrl+C to stop all tests
echo.

REM Run all tests in watch mode
echo Starting comprehensive test monitoring...
echo [%date% %time%] Running all tests in watch mode...
echo.

cd Tests
npm run test:watch

echo.
echo Test monitoring stopped.
echo [%date% %time%] Test suite monitor ended.
pause 