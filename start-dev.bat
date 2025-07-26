@echo off
REM ========================================
REM    Interactor2 - Development Start
REM    This script starts servers without building (faster for development)
REM    For production build & start, use: start.bat
REM ========================================
echo ========================================
echo    Interactor2 - Interactive Art
echo    Development System
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
echo    Starting Interactor2 Development Servers
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
echo    Interactor2 Development Mode
echo ========================================
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:3002
echo.
echo Opening web interface in your default browser...
echo.

REM Try to open the frontend URL
start http://localhost:3002

echo.
echo ========================================
echo    Interactor2 Development Started!
echo ========================================
echo.
echo Both servers are now running in development mode:
echo - Backend:  http://localhost:3001
echo - Frontend: http://localhost:3002
echo.
echo The web interface should have opened automatically.
echo If not, please manually navigate to: http://localhost:3002
echo.
echo To stop the servers, close the command windows or press Ctrl+C in each.
echo.
pause 