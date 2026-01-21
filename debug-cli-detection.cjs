#!/usr/bin/env node
/**
 * Debug script for Claude CLI detection
 * Run: node debug-cli-detection.js
 */

const { clearCliCache, isClaudeCliAvailable } = require('./dist/src/core/lazy-loading/llm-plugin-detector.js');
const { detectClaudeCli } = require('./dist/src/utils/claude-cli-detector.js');
const { spawnSync, execFileSync } = require('child_process');

console.log('=== CLAUDE CLI DETECTION DEBUG ===\n');
console.log('Node version:', process.version);
console.log('Platform:', process.platform);
console.log('CWD:', process.cwd());
console.log('');

// Clear cache
clearCliCache();
console.log('Cache cleared.\n');

// Run raw commands first
console.log('=== RAW COMMAND TESTS ===\n');

try {
  const whichResult = execFileSync('which', ['claude'], { encoding: 'utf8' });
  console.log('✅ which claude:', whichResult.trim());
} catch (e) {
  console.log('❌ which claude FAILED:', e.message);
}

try {
  const versionResult = spawnSync('claude', ['--version'], { encoding: 'utf8', shell: true });
  console.log('✅ claude --version (shell:true):', versionResult.status === 0 ? versionResult.stdout.trim() : 'FAILED');
} catch (e) {
  console.log('❌ claude --version FAILED:', e.message);
}

try {
  const pluginResult = spawnSync('claude', ['plugin', '--help'], { encoding: 'utf8', shell: true });
  console.log('✅ claude plugin --help (shell:true):', pluginResult.status === 0 ? 'OK' : 'FAILED');
} catch (e) {
  console.log('❌ claude plugin --help FAILED:', e.message);
}

console.log('\n=== DETECTION FUNCTION TESTS ===\n');

// Test detectClaudeCli()
console.log('Running detectClaudeCli()...');
const detectResult = detectClaudeCli();
console.log('Result:', JSON.stringify(detectResult, null, 2));
console.log('');

// Test isClaudeCliAvailable()
clearCliCache();
console.log('Running isClaudeCliAvailable()...');
const cliStatus = isClaudeCliAvailable();
console.log('Result:', JSON.stringify(cliStatus, null, 2));
console.log('');

// Final verdict
console.log('=== VERDICT ===\n');
if (cliStatus.available) {
  console.log('✅ SUCCESS: Claude CLI is available and working!');
  console.log('   Path:', cliStatus.path);
  console.log('   Version:', cliStatus.version);
  process.exit(0);
} else {
  console.log('❌ FAILED: Claude CLI not available');
  console.log('   Error:', cliStatus.error);
  process.exit(1);
}
