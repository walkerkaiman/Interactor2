#!/usr/bin/env ts-node

import { execSync } from 'child_process';
import { resolve } from 'path';

const FRONTEND_TEST_DIR = resolve(__dirname);

interface TestCategory {
  name: string;
  pattern: string;
  description: string;
}

const TEST_CATEGORIES: TestCategory[] = [
  {
    name: 'components',
    pattern: 'components/**/*.test.tsx',
    description: 'Frontend component tests'
  },
  {
    name: 'hooks',
    pattern: 'hooks/**/*.test.ts',
    description: 'Frontend hook tests'
  },
  {
    name: 'services',
    pattern: 'services/**/*.test.ts',
    description: 'Frontend service tests'
  },
  {
    name: 'all',
    pattern: '**/*.test.{ts,tsx}',
    description: 'All frontend tests'
  }
];

function runTests(pattern: string, coverage = false): void {
  const testPath = resolve(FRONTEND_TEST_DIR, pattern);
  const coverageFlag = coverage ? '--coverage' : '';
  
  try {
    const command = `npx vitest run "${testPath}" ${coverageFlag} --reporter=verbose`;
    console.log(`Running: ${command}`);
    execSync(command, { stdio: 'inherit', cwd: resolve(__dirname, '../..') });
  } catch (error) {
    console.error(`Failed to run tests for pattern: ${pattern}`);
    process.exit(1);
  }
}

function listCategories(): void {
  console.log('Available frontend test categories:');
  TEST_CATEGORIES.forEach(category => {
    console.log(`  ${category.name}: ${category.description}`);
  });
}

function showHelp(): void {
  console.log(`
Frontend Test Runner

Usage: ts-node run-frontend-tests.ts [category] [options]

Categories:
${TEST_CATEGORIES.map(cat => `  ${cat.name}: ${cat.description}`).join('\n')}

Options:
  --coverage    Run tests with coverage reporting
  --help        Show this help message
  --list        List available test categories

Examples:
  ts-node run-frontend-tests.ts components
  ts-node run-frontend-tests.ts hooks --coverage
  ts-node run-frontend-tests.ts all
`);
}

function main(): void {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  if (args.includes('--list') || args.includes('-l')) {
    listCategories();
    return;
  }
  
  const category = args[0];
  const coverage = args.includes('--coverage');
  
  if (!category) {
    console.error('Error: No test category specified');
    showHelp();
    process.exit(1);
  }
  
  const testCategory = TEST_CATEGORIES.find(cat => cat.name === category);
  
  if (!testCategory) {
    console.error(`Error: Unknown test category "${category}"`);
    listCategories();
    process.exit(1);
  }
  
  console.log(`Running ${testCategory.description}...`);
  runTests(testCategory.pattern, coverage);
}

if (require.main === module) {
  main();
}

export { runTests, TEST_CATEGORIES }; 