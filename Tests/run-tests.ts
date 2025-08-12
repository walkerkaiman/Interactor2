#!/usr/bin/env ts-node

import { execSync } from 'child_process';
import { readdirSync, existsSync } from 'fs';
import path from 'path';

interface TestCategory {
  name: string;
  pattern: string;
  description: string;
  runner: 'vitest' | 'playwright';
}

const testCategories: TestCategory[] = [
  {
    name: 'core',
    pattern: 'core/*.test.ts',
    description: 'Core backend services (Logger, StateManager, MessageRouter, SystemStats)',
    runner: 'vitest'
  },
  {
    name: 'modules',
    pattern: 'modules/*.test.ts',
    description: 'Module system tests (ModuleLoader, Input/Output modules)',
    runner: 'vitest'
  },
  {
    name: 'integration',
    pattern: 'integration/*.test.ts',
    description: 'Integration tests (API, WebSocket, File upload)',
    runner: 'vitest'
  },
  {
    name: 'frontend',
    pattern: 'frontend/**/*.test.{ts,tsx}',
    description: 'Frontend tests (components, hooks, services)',
    runner: 'vitest'
  },
  {
    name: 'e2e',
    pattern: 'e2e/*.test.ts',
    description: 'End-to-end tests (Playwright browser automation)',
    runner: 'playwright'
  }
];

function runTests(category: string, options: string[] = []): void {
  const testCategory = testCategories.find(cat => cat.name === category);
  
  if (!testCategory) {
    console.error(`❌ Unknown test category: ${category}`);
    console.log('Available categories:');
    testCategories.forEach(cat => {
      console.log(`  - ${cat.name}: ${cat.description} (${cat.runner})`);
    });
    process.exit(1);
  }

  console.log(`🧪 Running ${category} tests...`);
  console.log(`📝 ${testCategory.description}`);
  
  // Use appropriate test runner
  const command = testCategory.runner === 'playwright' 
    ? `npx playwright test ${testCategory.pattern} ${options.join(' ')}`
    : `npx vitest run ${options.join(' ')}`;
  
  try {
    const result = execSync(command, { 
      stdio: 'pipe',
      cwd: __dirname,
      env: testCategory.runner === 'vitest' 
        ? { ...process.env, VITEST_INCLUDE: testCategory.pattern }
        : process.env,
      encoding: 'utf8'
    });
    console.log(result);
    console.log(`✅ ${category} tests completed successfully`);
  } catch (error) {
    // Check if the error is due to no test files found
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('No test files found') || errorMessage.includes('no tests found')) {
      console.log(`⚠️  No test files found for ${category} category. Skipping...`);
      return;
    }
    console.error(`❌ ${category} tests failed`);
    process.exit(1);
  }
}

function runAllTests(options: string[] = []): void {
  console.log('🧪 Running all tests...');
  
  for (const category of testCategories) {
    console.log(`\n📋 Running ${category.name} tests...`);
    console.log(`📝 ${category.description}`);
    
    // Use appropriate test runner
    const command = category.runner === 'playwright' 
      ? `npx playwright test ${category.pattern} ${options.join(' ')}`
      : `npx vitest run ${options.join(' ')}`;
    
    try {
      const result = execSync(command, { 
        stdio: 'pipe',
        cwd: __dirname,
        env: category.runner === 'vitest' 
          ? { ...process.env, VITEST_INCLUDE: category.pattern }
          : process.env,
        encoding: 'utf8'
      });
      console.log(result);
      console.log(`✅ ${category.name} tests completed successfully`);
    } catch (error) {
      // Check if the error is due to no test files found
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('No test files found') || errorMessage.includes('no tests found')) {
        console.log(`⚠️  No test files found for ${category.name} category. Skipping...`);
        continue;
      }
      console.error(`❌ ${category.name} tests failed`);
      process.exit(1);
    }
  }
}

function listTests(): void {
  console.log('📋 Available test categories:');
  console.log('');
  
  for (const category of testCategories) {
    console.log(`🔹 ${category.name}:`);
    console.log(`   ${category.description}`);
    console.log(`   Pattern: ${category.pattern}`);
    console.log(`   Runner: ${category.runner}`);
    console.log('');
  }
  
  console.log('Usage:');
  console.log('  npm run test:core          # Run core service tests');
  console.log('  npm run test:modules       # Run module system tests');
  console.log('  npm run test:integration   # Run integration tests');
  console.log('  npm run test:frontend      # Run frontend tests');
  console.log('  npm run test:e2e           # Run end-to-end tests');
  console.log('  npm run test:all           # Run all tests');
  console.log('');
  console.log('Options:');
  console.log('  --coverage                 # Generate coverage report');
  console.log('  --verbose                  # Verbose output');
  console.log('  --ui                       # Open test UI');
}

function checkTestFiles(): void {
  console.log('🔍 Checking test files...');
  
  let totalTests = 0;
  let missingTests = 0;
  
  for (const category of testCategories) {
    const testDir = path.join(__dirname, category.name);
    
    if (existsSync(testDir)) {
      const files = readdirSync(testDir, { recursive: true });
      const testFiles = files.filter((file) => typeof file === 'string' && file.endsWith('.test.ts'));
      
      console.log(`📁 ${category.name}: ${testFiles.length} test files`);
      totalTests += testFiles.length;
      
      if (testFiles.length === 0) {
        missingTests++;
        console.log(`   ⚠️  No test files found in ${category.name}`);
      }
    } else {
      console.log(`📁 ${category.name}: directory not found`);
      missingTests++;
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Total test files: ${totalTests}`);
  console.log(`   Missing test directories: ${missingTests}`);
  
  if (missingTests > 0) {
    console.log(`\n⚠️  Some test categories are missing. Consider implementing them.`);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];
const options = args.slice(1);

switch (command) {
  case 'core':
    runTests('core', options);
    break;
    
  case 'modules':
    runTests('modules', options);
    break;
    
  case 'integration':
    runTests('integration', options);
    break;
    
  case 'frontend':
    runTests('frontend', options);
    break;
    
  case 'e2e':
    runTests('e2e', options);
    break;
    
  case 'all':
    runAllTests(options);
    break;
    
  case 'list':
    listTests();
    break;
    
  case 'check':
    checkTestFiles();
    break;
    
  default:
    console.log('🧪 Interactor Test Runner');
    console.log('');
    console.log('Usage:');
    console.log('  ts-node run-tests.ts <category> [options]');
    console.log('');
    console.log('Categories:');
    console.log('  core          # Core backend services');
    console.log('  modules       # Module system tests');
    console.log('  integration   # Integration tests');
    console.log('  frontend      # Frontend tests');
    console.log('  e2e           # End-to-end tests');
    console.log('  all           # Run all tests');
    console.log('  list          # List available tests');
    console.log('  check         # Check test files');
    console.log('');
    console.log('Options:');
    console.log('  --coverage    # Generate coverage report');
    console.log('  --verbose     # Verbose output');
    console.log('  --ui          # Open test UI');
    console.log('');
    console.log('Examples:');
    console.log('  ts-node run-tests.ts core');
    console.log('  ts-node run-tests.ts all --coverage');
    console.log('  ts-node run-tests.ts list');
    break;
}