@echo off
setlocal enabledelayedexpansion

REM Interactor2 Test Runner Script for Windows
REM This script provides an easy way to run different types of tests

set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

REM Function to print colored output
:print_status
echo %BLUE%[INFO]%NC% %~1
goto :eof

:print_success
echo %GREEN%[SUCCESS]%NC% %~1
goto :eof

:print_warning
echo %YELLOW%[WARNING]%NC% %~1
goto :eof

:print_error
echo %RED%[ERROR]%NC% %~1
goto :eof

REM Function to check if command exists
:command_exists
where %~1 >nul 2>&1
if %errorlevel% equ 0 (
    exit /b 0
) else (
    exit /b 1
)

REM Function to check prerequisites
:check_prerequisites
call :print_status "Checking prerequisites..."

call :command_exists node
if %errorlevel% neq 0 (
    call :print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit /b 1
)

call :command_exists npm
if %errorlevel% neq 0 (
    call :print_error "npm is not installed. Please install npm first."
    exit /b 1
)

REM Check Node.js version (simplified check)
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
call :print_success "Prerequisites check passed"
goto :eof

REM Function to install dependencies
:install_dependencies
call :print_status "Installing dependencies..."

if not exist "package.json" (
    call :print_error "package.json not found. Please run this script from the Tests directory."
    exit /b 1
)

npm install
if %errorlevel% neq 0 (
    call :print_error "Failed to install dependencies"
    exit /b 1
)

call :print_success "Dependencies installed"
goto :eof

REM Function to build required packages
:build_packages
call :print_status "Building required packages..."

REM Build shared package
if exist "..\shared" (
    call :print_status "Building shared package..."
    cd ..\shared
    npm run build
    if %errorlevel% neq 0 (
        call :print_error "Failed to build shared package"
        exit /b 1
    )
    cd ..\Tests
)

REM Build backend package
if exist "..\backend" (
    call :print_status "Building backend package..."
    cd ..\backend
    npm run build
    if %errorlevel% neq 0 (
        call :print_error "Failed to build backend package"
        exit /b 1
    )
    cd ..\Tests
)

call :print_success "Packages built"
goto :eof

REM Function to run unit tests
:run_unit_tests
call :print_status "Running unit tests..."
npm run test:unit
goto :eof

REM Function to run integration tests
:run_integration_tests
call :print_status "Running integration tests..."
npm run integration
goto :eof

REM Function to run all tests
:run_all_tests
call :print_status "Running all tests..."
npm run test:all
goto :eof

REM Function to run tests with coverage
:run_tests_with_coverage
call :print_status "Running tests with coverage..."
npm run test:all:coverage
goto :eof

REM Function to clean up test artifacts
:cleanup
call :print_status "Cleaning up test artifacts..."
npm run test:clean
call :print_success "Cleanup completed"
goto :eof

REM Function to show help
:show_help
echo Interactor2 Test Runner
echo.
echo Usage: %~nx0 [OPTION]
echo.
echo Options:
echo   unit              Run unit tests only
echo   integration       Run integration tests only
echo   all               Run all tests ^(unit + integration^)
echo   coverage          Run all tests with coverage
echo   setup             Install dependencies and build packages
echo   clean             Clean up test artifacts
echo   help              Show this help message
echo.
echo Examples:
echo   %~nx0 setup          # First time setup
echo   %~nx0 all            # Run all tests
echo   %~nx0 coverage       # Run tests with coverage
echo   %~nx0 integration    # Run only integration tests
goto :eof

REM Main script logic
set "COMMAND=%~1"
if "%COMMAND%"=="" set "COMMAND=help"

if "%COMMAND%"=="unit" (
    call :check_prerequisites
    call :run_unit_tests
) else if "%COMMAND%"=="integration" (
    call :check_prerequisites
    call :run_integration_tests
) else if "%COMMAND%"=="all" (
    call :check_prerequisites
    call :run_all_tests
) else if "%COMMAND%"=="coverage" (
    call :check_prerequisites
    call :run_tests_with_coverage
) else if "%COMMAND%"=="setup" (
    call :check_prerequisites
    call :install_dependencies
    call :build_packages
    call :print_success "Setup completed successfully!"
) else if "%COMMAND%"=="clean" (
    call :cleanup
) else (
    call :show_help
)

endlocal 