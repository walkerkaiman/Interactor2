@echo off
REM ========================================
REM    Interactor - Development Start
REM    This script starts the development servers
REM    For production build, use: start.bat
REM ========================================
echo ========================================
echo    Interactor - Interactive Art
echo    Development Mode
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
echo    Starting Interactor Development
echo ========================================
echo.

REM Start backend server in development mode
echo Starting Backend Server (Development Mode)...
echo The backend will serve both the API and the frontend interface.
start "Interactor2 Backend Dev" cmd /k "cd /d %CD%\backend && echo Backend Server Starting (Dev Mode)... && echo Server will be available at: http://localhost:3001 && echo This serves both the API and the frontend interface && echo Press Ctrl+C to stop the server && echo. && npm run dev"

REM Wait for server to start and verify it's running
echo Waiting for server to start...
timeout /t 5 /nobreak >nul

REM Check if server is running
echo Checking if server is running...
:check_server
curl -s http://localhost:3001/health >nul 2>&1
if errorlevel 1 (
    echo Server not ready yet, waiting...
    timeout /t 2 /nobreak >nul
    goto check_server
)

echo Server is running! Opening browser...

REM Open the web interface
echo Opening Web Interface...
echo.
echo ========================================
echo    Interactor is starting up...
echo ========================================
echo Server: http://localhost:3001
echo.
echo Opening web interface in your default browser...
echo.

REM Try multiple ways to open the browser
start http://localhost:3001 2>nul
if errorlevel 1 (
    echo Trying alternative browser launch method...
    start "" http://localhost:3001
)

echo.
echo ========================================
echo    Interactor Development Started!
echo ========================================
echo.
echo The server is now running at: http://localhost:3001
echo.
echo The web interface should have opened automatically.
echo If not, please manually navigate to: http://localhost:3001
echo.
echo To stop the server, close the command window or press Ctrl+C.
echo.
pause 