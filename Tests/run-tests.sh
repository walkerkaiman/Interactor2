#!/bin/bash

# Interactor2 Test Runner Script
# This script provides an easy way to run different types of tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command_exists node; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    if ! command_exists npm; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node -v)"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Please run this script from the Tests directory."
        exit 1
    fi
    
    npm install
    print_success "Dependencies installed"
}

# Function to build required packages
build_packages() {
    print_status "Building required packages..."
    
    # Build shared package
    if [ -d "../shared" ]; then
        print_status "Building shared package..."
        cd ../shared
        npm run build
        cd ../Tests
    fi
    
    # Build backend package
    if [ -d "../backend" ]; then
        print_status "Building backend package..."
        cd ../backend
        npm run build
        cd ../Tests
    fi
    
    print_success "Packages built"
}

# Function to run unit tests
run_unit_tests() {
    print_status "Running unit tests..."
    npm run test:unit
}

# Function to run integration tests
run_integration_tests() {
    print_status "Running integration tests..."
    npm run integration
}

# Function to run all tests
run_all_tests() {
    print_status "Running all tests..."
    npm run test:all
}

# Function to run tests with coverage
run_tests_with_coverage() {
    print_status "Running tests with coverage..."
    npm run test:all:coverage
}

# Function to clean up test artifacts
cleanup() {
    print_status "Cleaning up test artifacts..."
    npm run test:clean
    print_success "Cleanup completed"
}

# Function to show help
show_help() {
    echo "Interactor2 Test Runner"
    echo ""
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  unit              Run unit tests only"
    echo "  integration       Run integration tests only"
    echo "  all               Run all tests (unit + integration)"
    echo "  coverage          Run all tests with coverage"
    echo "  setup             Install dependencies and build packages"
    echo "  clean             Clean up test artifacts"
    echo "  help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 setup          # First time setup"
    echo "  $0 all            # Run all tests"
    echo "  $0 coverage       # Run tests with coverage"
    echo "  $0 integration    # Run only integration tests"
}

# Main script logic
main() {
    case "${1:-help}" in
        "unit")
            check_prerequisites
            run_unit_tests
            ;;
        "integration")
            check_prerequisites
            run_integration_tests
            ;;
        "all")
            check_prerequisites
            run_all_tests
            ;;
        "coverage")
            check_prerequisites
            run_tests_with_coverage
            ;;
        "setup")
            check_prerequisites
            install_dependencies
            build_packages
            print_success "Setup completed successfully!"
            ;;
        "clean")
            cleanup
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Run main function with all arguments
main "$@" 