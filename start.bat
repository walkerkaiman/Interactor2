@echo off
REM ========================================
REM    Interactor - Production Build & Start
REM    This script builds all components before starting servers
REM    For development without building, use: start-dev.bat
REM ========================================
echo ========================================
echo    Interactor - Interactive Art
echo    Installation & Build System
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

REM Check if dependencies are installed for all components
echo Checking dependencies...

REM Check backend dependencies
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
cd ..

REM Check shared dependencies
cd shared
if not exist "node_modules" (
    echo Installing shared dependencies...
    npm install
    if errorlevel 1 (
        echo Error: Failed to install shared dependencies
        pause
        exit /b 1
    )
)
cd ..

REM Check frontend dependencies
cd frontend
if not exist "node_modules" (
    echo Installing frontend dependencies...
    npm install
    if errorlevel 1 (
        echo Error: Failed to install frontend dependencies
        pause
        exit /b 1
    )
)
cd ..

echo.
echo ========================================
echo    Building Interactor Components
echo ========================================
echo.

REM Build shared package first (backend and frontend depend on it)
echo Building shared package...
cd shared
echo Running shared build...
npm run build
if errorlevel 1 (
    echo Error: Failed to build shared package
    pause
    exit /b 1
)
cd ..

REM Build backend
echo Building backend...
cd backend
echo Running backend build...
npm run build
if errorlevel 1 (
    echo Error: Failed to build backend
    pause
    exit /b 1
)
cd ..

REM Build frontend
echo Building frontend...
cd frontend
echo Running frontend build...
npm run build
if errorlevel 1 (
    echo Error: Failed to build frontend
    pause
    exit /b 1
)
cd ..

echo.
echo ========================================
echo    Starting Interactor System
echo ========================================
echo.

REM Start backend server in a new window
echo Starting Backend Server...
start "Interactor2 Backend" cmd /k "cd /d %CD%\backend && echo Backend Server Starting... && echo Server will be available at: http://localhost:3001 && echo Press Ctrl+C to stop the backend server && echo. && npm start"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend server in a new window
echo Starting Frontend Server...
start "Interactor2 Frontend" cmd /k "cd /d %CD%\frontend && echo Frontend Server Starting... && echo Server will be available at: http://localhost:3002 && echo Press Ctrl+C to stop the frontend server && echo. && npm run dev"

REM Wait a moment for frontend to start
timeout /t 5 /nobreak >nul

REM Open the web interface
echo Opening Web Interface...
echo.
echo ========================================
echo    Interactor is starting up...
echo ========================================
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:3002
echo.
echo Opening web iterface in your default browser...
echo.

REM Try to open the frontend URL
start http://localhost:3002

echo.
echo ========================================
echo    Interactor System Started!
echo ========================================
echo.
echo Both servers are now running:
echo - Backend:  http://localhost:3001
echo - Frontend: http://localhost:3002
echo.
echo The web interface should have opened automatically.
echo If not, please manually navigate to: http://localhost:3002
echo.
echo To stop the servers, close the command windows or press Ctrl+C in each.
echo.
pause
