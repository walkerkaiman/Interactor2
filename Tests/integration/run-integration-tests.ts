#!/usr/bin/env ts-node

import { execSync } from 'child_process';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

interface TestSuite {
  name: string;
  file: string;
  description: string;
}

const TEST_SUITES: TestSuite[] = [
  {
    name: 'Backend Integration',
    file: 'BackendIntegration.test.ts',
    description: 'Core backend functionality, module registration, signal flow, and system integration'
  },
  {
    name: 'Message Routing',
    file: 'MessageRouting.test.ts',
    description: 'Message routing patterns, middleware, queue management, and route lifecycle'
  },
  {
    name: 'Module Lifecycle',
    file: 'ModuleLifecycle.test.ts',
    description: 'Module discovery, instance management, hot reloading, and state persistence'
  },
  {
    name: 'API & WebSocket',
    file: 'APIWebSocket.test.ts',
    description: 'REST API endpoints, WebSocket communication, and real-time event broadcasting'
  }
];

class IntegrationTestRunner {
  private testResults: Map<string, { passed: number; failed: number; errors: string[] }> = new Map();
  private startTime: number = 0;

  async run(): Promise<void> {
    console.log('🚀 Starting Interactor2 Integration Test Suite\n');
    this.startTime = Date.now();

    // Create test directories
    this.setupTestDirectories();

    // Run each test suite
    for (const suite of TEST_SUITES) {
      await this.runTestSuite(suite);
    }

    // Generate summary report
    this.generateReport();
  }

  private setupTestDirectories(): void {
    const testDirs = [
      'test-modules',
      'test-modules-lifecycle',
      'test-data',
      'test-logs'
    ];

    for (const dir of testDirs) {
      const fullPath = join(__dirname, dir);
      if (existsSync(fullPath)) {
        rmSync(fullPath, { recursive: true, force: true });
      }
      mkdirSync(fullPath, { recursive: true });
    }

    console.log('📁 Test directories created');
  }

  private async runTestSuite(suite: TestSuite): Promise<void> {
    console.log(`\n🧪 Running ${suite.name} Tests`);
    console.log(`   ${suite.description}`);
    console.log('   ' + '='.repeat(60));

    const testFile = join(__dirname, suite.file);
    
    if (!existsSync(testFile)) {
      console.log(`❌ Test file not found: ${suite.file}`);
      this.testResults.set(suite.name, { passed: 0, failed: 1, errors: [`Test file not found: ${suite.file}`] });
      return;
    }

    try {
      // Run the test suite using vitest
      const command = `npx vitest run ${testFile} --reporter=verbose --timeout=30000`;
      const output = execSync(command, { 
        cwd: __dirname,
        encoding: 'utf8',
        stdio: 'pipe'
      });

      // Parse test results
      const passed = (output.match(/✓/g) || []).length;
      const failed = (output.match(/✗/g) || []).length;
      
      this.testResults.set(suite.name, { 
        passed, 
        failed, 
        errors: failed > 0 ? ['See test output for details'] : [] 
      });

      console.log(`✅ ${suite.name}: ${passed} passed, ${failed} failed`);
      
      if (failed > 0) {
        console.log('   Test output:');
        console.log(output.split('\n').slice(-10).join('\n')); // Show last 10 lines
      }

    } catch (error: any) {
      console.log(`❌ ${suite.name}: Failed to run tests`);
      console.log(`   Error: ${error.message}`);
      
      this.testResults.set(suite.name, { 
        passed: 0, 
        failed: 1, 
        errors: [error.message] 
      });
    }
  }

  private generateReport(): void {
    const endTime = Date.now();
    const duration = (endTime - this.startTime) / 1000;

    console.log('\n' + '='.repeat(80));
    console.log('📊 INTEGRATION TEST SUMMARY REPORT');
    console.log('='.repeat(80));

    let totalPassed = 0;
    let totalFailed = 0;
    const allErrors: string[] = [];

    for (const [suiteName, results] of this.testResults) {
      console.log(`\n${suiteName}:`);
      console.log(`  ✅ Passed: ${results.passed}`);
      console.log(`  ❌ Failed: ${results.failed}`);
      
      if (results.errors.length > 0) {
        console.log(`  🔍 Errors:`);
        results.errors.forEach(error => console.log(`    - ${error}`));
        allErrors.push(...results.errors);
      }

      totalPassed += results.passed;
      totalFailed += results.failed;
    }

    console.log('\n' + '-'.repeat(80));
    console.log(`📈 TOTAL RESULTS:`);
    console.log(`   ✅ Total Passed: ${totalPassed}`);
    console.log(`   ❌ Total Failed: ${totalFailed}`);
    console.log(`   ⏱️  Duration: ${duration.toFixed(2)}s`);
    console.log(`   📊 Success Rate: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`);

    if (totalFailed === 0) {
      console.log('\n🎉 All integration tests passed!');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the errors above.');
    }

    console.log('\n' + '='.repeat(80));

    // Exit with appropriate code
    process.exit(totalFailed > 0 ? 1 : 0);
  }
}

// Run the integration tests
if (require.main === module) {
  const runner = new IntegrationTestRunner();
  runner.run().catch(error => {
    console.error('❌ Integration test runner failed:', error);
    process.exit(1);
  });
}

export { IntegrationTestRunner }; 