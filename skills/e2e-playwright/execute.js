#!/usr/bin/env node

/**
 * Playwright Test Executor for SpecWeave
 *
 * Universal executor that handles Playwright test scripts with intelligent
 * code wrapping, dependency management, and SpecWeave context awareness.
 *
 * Usage:
 *   node execute.js <test-file.js>           # Execute from file
 *   node execute.js "<inline-code>"          # Execute inline code
 *   echo "code" | node execute.js            # Execute from stdin
 *   node execute.js --version                # Show version info
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Version info
const VERSION = '1.0.0';
const SKILL_NAME = 'e2e-playwright';

// Configuration
const TEMP_DIR = '/tmp';
const TEMP_PREFIX = 'e2e-execution-';

// ANSI colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * Print colored message
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Check if Playwright is installed
 */
function isPlaywrightInstalled() {
  try {
    require.resolve('playwright');
    return true;
  } catch {
    return false;
  }
}

/**
 * Install Playwright dependencies
 */
function installPlaywright() {
  log('📦 Installing Playwright...', 'cyan');
  try {
    execSync('npm install playwright', {
      cwd: __dirname,
      stdio: 'inherit'
    });
    log('✅ Playwright installed successfully', 'green');
  } catch (error) {
    log('❌ Failed to install Playwright', 'red');
    log(error.message, 'red');
    process.exit(1);
  }
}

/**
 * Check if Chromium browser is installed
 */
function isChromiumInstalled() {
  try {
    const { chromium } = require('playwright');
    return true;
  } catch {
    return false;
  }
}

/**
 * Install Chromium browser
 */
function installChromium() {
  log('🌐 Installing Chromium browser...', 'cyan');
  try {
    execSync('npx playwright install chromium', {
      cwd: __dirname,
      stdio: 'inherit'
    });
    log('✅ Chromium installed successfully', 'green');
  } catch (error) {
    log('❌ Failed to install Chromium', 'red');
    log(error.message, 'red');
    process.exit(1);
  }
}

/**
 * Ensure Playwright and browser are installed
 */
function ensureDependencies() {
  if (!isPlaywrightInstalled()) {
    installPlaywright();
  }

  if (!isChromiumInstalled()) {
    installChromium();
  }
}

/**
 * Read code from various input sources
 */
function readCode() {
  const args = process.argv.slice(2);

  // Handle --version flag
  if (args.includes('--version') || args.includes('-v')) {
    log(`${SKILL_NAME} v${VERSION}`, 'cyan');
    process.exit(0);
  }

  // No arguments - check stdin
  if (args.length === 0) {
    if (!process.stdin.isTTY) {
      // Read from stdin (piped input)
      const chunks = [];
      process.stdin.on('data', chunk => chunks.push(chunk));
      process.stdin.on('end', () => {
        const code = Buffer.concat(chunks).toString('utf8');
        if (code.trim()) {
          executeCode(code);
        } else {
          showUsage();
          process.exit(1);
        }
      });
      return;
    } else {
      showUsage();
      process.exit(1);
    }
  }

  const input = args[0];

  // Check if input is a file path
  if (fs.existsSync(input)) {
    const code = fs.readFileSync(input, 'utf8');
    executeCode(code);
  } else {
    // Treat as inline code
    executeCode(input);
  }
}

/**
 * Show usage information
 */
function showUsage() {
  log(`
${SKILL_NAME} v${VERSION} - Playwright Test Executor

Usage:
  node execute.js <test-file.js>           Execute test from file
  node execute.js "<inline-code>"          Execute inline code
  echo "code" | node execute.js            Execute from stdin
  node execute.js --version                Show version info

Examples:
  node execute.js /tmp/login-test.js
  node execute.js "console.log('Hello')"
  echo "await page.goto('http://localhost:3000')" | node execute.js

Documentation:
  See SKILL.md for complete API reference and examples
`, 'cyan');
}

/**
 * Determine if code needs wrapping
 */
function needsWrapping(code) {
  const hasRequire = code.includes('require(\'playwright\')') || code.includes('require("playwright")');
  const hasImport = code.includes('import') && code.includes('playwright');
  const hasAsyncWrapper = code.includes('(async ()') || code.includes('(async function');

  return !hasRequire && !hasImport && !hasAsyncWrapper;
}

/**
 * Wrap code with Playwright imports and async IIFE
 */
function wrapCode(code) {
  return `
// Auto-generated wrapper by ${SKILL_NAME}
const { chromium, firefox, webkit, devices } = require('playwright');

// Helper utilities
const utils = require('${path.join(__dirname, 'lib', 'utils.js')}');

// Make utilities available globally
Object.assign(global, utils);

(async () => {
  try {
    ${code}
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
`;
}

/**
 * Clean up old temporary execution files
 */
function cleanupOldTempFiles() {
  try {
    const files = fs.readdirSync(TEMP_DIR);
    const oldFiles = files.filter(f =>
      f.startsWith(TEMP_PREFIX) &&
      f.endsWith('.js')
    );

    // Keep only the 5 most recent files
    if (oldFiles.length > 5) {
      const sorted = oldFiles
        .map(f => ({
          name: f,
          time: fs.statSync(path.join(TEMP_DIR, f)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);

      // Delete older files
      sorted.slice(5).forEach(({ name }) => {
        try {
          fs.unlinkSync(path.join(TEMP_DIR, name));
          log(`🗑️  Cleaned up old temp file: ${name}`, 'yellow');
        } catch (e) {
          // Ignore cleanup errors
        }
      });
    }
  } catch (error) {
    // Ignore cleanup errors - not critical
  }
}

/**
 * Detect SpecWeave context
 */
function detectSpecWeaveContext() {
  const cwd = process.cwd();
  const specweavePath = path.join(cwd, '.specweave');

  if (!fs.existsSync(specweavePath)) {
    return { isSpecweaveProject: false };
  }

  // Find active increment (in-progress status)
  const incrementsPath = path.join(specweavePath, 'increments');
  if (!fs.existsSync(incrementsPath)) {
    return { isSpecweaveProject: true };
  }

  try {
    const increments = fs.readdirSync(incrementsPath)
      .filter(name => /^\d{4}-/.test(name));

    // Look for tasks.md with in-progress status
    for (const increment of increments) {
      const tasksPath = path.join(incrementsPath, increment, 'tasks.md');
      if (fs.existsSync(tasksPath)) {
        const tasksContent = fs.readFileSync(tasksPath, 'utf8');
        if (tasksContent.includes('## Status: in-progress')) {
          return {
            isSpecweaveProject: true,
            activeIncrement: increment,
            incrementPath: path.join(incrementsPath, increment),
            reportsPath: path.join(incrementsPath, increment, 'reports')
          };
        }
      }
    }
  } catch (e) {
    // Continue without increment context
  }

  return { isSpecweaveProject: true };
}

/**
 * Execute Playwright code
 */
function executeCode(code) {
  log('\n🎭 Starting Playwright execution...', 'bright');

  // Detect SpecWeave context
  const context = detectSpecWeaveContext();
  if (context.isSpecweaveProject) {
    log('🔷 SpecWeave project detected', 'cyan');
    if (context.activeIncrement) {
      log(`📦 Active increment: ${context.activeIncrement}`, 'cyan');
    }
  }

  // Wrap code if needed
  const processedCode = needsWrapping(code) ? wrapCode(code) : code;

  // Create temporary file with timestamp
  const timestamp = Date.now();
  const tempFile = path.join(TEMP_DIR, `${TEMP_PREFIX}${timestamp}.js`);

  try {
    // Write code to temp file
    fs.writeFileSync(tempFile, processedCode, 'utf8');
    log(`📝 Test script: ${tempFile}`, 'blue');

    // Clean up old files
    cleanupOldTempFiles();

    // Execute from skill directory for proper module resolution
    log('🚀 Executing test...', 'bright');
    log('─'.repeat(60), 'blue');

    const startTime = Date.now();

    // Execute the test
    require(tempFile);

    // Note: For async code, the process will exit when the async function completes
    // or errors out, so we don't need explicit waiting here

  } catch (error) {
    log('\n❌ Execution failed', 'red');
    log(error.message, 'red');
    if (error.stack) {
      log('\nStack trace:', 'yellow');
      log(error.stack, 'yellow');
    }
    process.exit(1);
  }
}

// Main execution
function main() {
  // Change to skill directory for module resolution
  process.chdir(__dirname);

  // Ensure dependencies are installed
  ensureDependencies();

  // Read and execute code
  readCode();
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { executeCode, detectSpecWeaveContext };
