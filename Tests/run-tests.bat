@echo off
setlocal enabledelayedexpansion

REM Interactor2 Simplified Test Runner Script for Windows
REM This script provides an easy way to run different types of tests for the simplified backend

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

call :print_success "All packages built successfully"
goto :eof

REM Function to run core tests
:run_core_tests
call :print_status "Running core service tests..."
npx vitest run core --reporter=verbose
if %errorlevel% neq 0 (
    call :print_error "Core tests failed"
    exit /b 1
)
call :print_success "Core tests completed"
goto :eof

REM Function to run integration tests
:run_integration_tests
call :print_status "Running integration tests..."
npx vitest run integration --reporter=verbose
if %errorlevel% neq 0 (
    call :print_error "Integration tests failed"
    exit /b 1
)
call :print_success "Integration tests completed"
goto :eof

REM Function to run all tests
:run_all_tests
call :print_status "Running all tests..."
npx vitest run --reporter=verbose
if %errorlevel% neq 0 (
    call :print_error "Some tests failed"
    exit /b 1
)
call :print_success "All tests completed successfully"
goto :eof

REM Function to run tests with coverage
:run_coverage
call :print_status "Running tests with coverage..."
npx vitest run --coverage --reporter=verbose
if %errorlevel% neq 0 (
    call :print_error "Coverage tests failed"
    exit /b 1
)
call :print_success "Coverage tests completed"
goto :eof

REM Function to run tests in watch mode
:run_watch
call :print_status "Starting tests in watch mode..."
call :print_warning "Press Ctrl+C to stop watching"
npx vitest --reporter=verbose
goto :eof

REM Function to clean test artifacts
:clean_artifacts
call :print_status "Cleaning test artifacts..."

REM Remove test data directories
if exist "test-data" (
    rmdir /s /q "test-data"
)

REM Remove test log files
if exist "*.log" (
    del /q "*.log"
)

REM Remove coverage reports
if exist "coverage" (
    rmdir /s /q "coverage"
)

call :print_success "Test artifacts cleaned"
goto :eof

REM Main script logic
:main
call :print_status "Interactor2 Simplified Test Runner"
call :print_status "================================"

REM Check command line arguments
if "%1"=="" (
    call :print_status "No test type specified. Running all tests..."
    call :check_prerequisites
    call :install_dependencies
    call :build_packages
    call :run_all_tests
    goto :end
)

if "%1"=="core" (
    call :print_status "Running core tests only..."
    call :check_prerequisites
    call :install_dependencies
    call :build_packages
    call :run_core_tests
    goto :end
)

if "%1"=="integration" (
    call :print_status "Running integration tests only..."
    call :check_prerequisites
    call :install_dependencies
    call :build_packages
    call :run_integration_tests
    goto :end
)

if "%1"=="coverage" (
    call :print_status "Running tests with coverage..."
    call :check_prerequisites
    call :install_dependencies
    call :build_packages
    call :run_coverage
    goto :end
)

if "%1"=="watch" (
    call :print_status "Starting watch mode..."
    call :check_prerequisites
    call :install_dependencies
    call :build_packages
    call :run_watch
    goto :end
)

if "%1"=="clean" (
    call :clean_artifacts
    goto :end
)

if "%1"=="help" (
    call :print_status "Usage: run-tests.bat [test_type]"
    call :print_status ""
    call :print_status "Available test types:"
    call :print_status "  (no args) - Run all tests"
    call :print_status "  core      - Run core service tests only"
    call :print_status "  integration - Run integration tests only"
    call :print_status "  coverage  - Run tests with coverage report"
    call :print_status "  watch     - Run tests in watch mode"
    call :print_status "  clean     - Clean test artifacts"
    call :print_status "  help      - Show this help message"
    goto :end
)

call :print_error "Unknown test type: %1"
call :print_status "Use 'run-tests.bat help' for usage information"
exit /b 1

:end
call :print_success "Test runner completed"
exit /b 0 