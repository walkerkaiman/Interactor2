@echo off
echo Starting Simplified Interactor System...
echo.

echo Building frontend...
cd frontend
call npm run build
if %errorlevel% neq 0 (
    echo Frontend build failed!
    pause
    exit /b 1
)

echo.
echo Starting backend server...
cd ..\backend
call npm start

pause 