/**
 * Direct TsServerClient Test
 *
 * Tests the TsServerClient directly without going through specweave CLI.
 * This is a simple verification that tsserver integration works.
 *
 * Run: npx vitest tests/integration/lsp/tsserver-direct.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TsServerClient } from '../../../src/core/lsp/tsserver-client.js';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * Test using actual SpecWeave codebase
 * This is the most reliable test since it uses existing tsserver from node_modules
 */
describe('TsServerClient on SpecWeave codebase', () => {
  const projectRoot = process.cwd();
  let client: TsServerClient;
  let initialized = false;

  beforeAll(async () => {
    // Use actual SpecWeave codebase
    client = new TsServerClient(projectRoot);
    initialized = await client.initialize();
  }, 60000);

  afterAll(async () => {
    if (initialized) {
      await client.shutdown();
    }
  });

  it('should initialize tsserver successfully', () => {
    expect(initialized).toBe(true);
  });

  it('should find references to LSPManager class', async () => {
    if (!initialized) return;

    const testFile = path.join(projectRoot, 'src/core/lsp/lsp-manager.ts');
    if (!fs.existsSync(testFile)) {
      console.log('Skipping: test file not found');
      return;
    }

    // Find references to LSPManager class (line 48, "export class LSPManager")
    const result = await client.findReferences(testFile, 47, 13);

    expect(result.success).toBe(true);
    expect(result.locations).toBeDefined();
    // LSPManager should have at least the definition
    expect(result.locations.length).toBeGreaterThanOrEqual(1);
  }, 60000);

  it('should get hover information for function', async () => {
    if (!initialized) return;

    const testFile = path.join(projectRoot, 'src/core/lsp/lsp-manager.ts');
    if (!fs.existsSync(testFile)) {
      console.log('Skipping: test file not found');
      return;
    }

    // Get hover for "initialize" method (around line 62)
    const result = await client.hover(testFile, 61, 8);

    expect(result.success).toBe(true);
    if (result.contents) {
      expect(result.contents.length).toBeGreaterThan(0);
    }
  }, 60000);

  it('should get document symbols', async () => {
    if (!initialized) return;

    const testFile = path.join(projectRoot, 'src/core/lsp/lsp-manager.ts');
    if (!fs.existsSync(testFile)) {
      console.log('Skipping: test file not found');
      return;
    }

    const result = await client.documentSymbols(testFile);

    expect(result.success).toBe(true);
    expect(result.symbols).toBeDefined();
    if (result.symbols) {
      expect(result.symbols.length).toBeGreaterThan(0);

      // Should find LSPManager class
      const classNames = result.symbols.map((s) => s.name);
      expect(classNames).toContain('LSPManager');
    }
  }, 60000);

  it('should warm up without errors', async () => {
    if (!initialized) return;

    const result = await client.warmup();
    expect(result).toBe(true);
    expect(client.isWarmedUp()).toBe(true);
  }, 60000);
});

/**
 * Test with isolated fixture files in temp directory
 * Uses symlink to main project's node_modules for tsserver
 */
describe('TsServerClient with test fixture', () => {
  const projectRoot = process.cwd();
  const testDir = path.join(os.tmpdir(), `tsserver-test-${Date.now()}`);
  const testFile = path.join(testDir, 'test.ts');
  let client: TsServerClient;
  let initialized = false;

  const testContent = `
export function sayHello(name: string): string {
  return \`Hello, \${name}!\`;
}

export function greet() {
  return sayHello('World');
}

const message = sayHello('Test');
console.log(message);
`;

  beforeAll(async () => {
    // Create test fixture directory
    fs.mkdirSync(testDir, { recursive: true });

    // Write test file
    fs.writeFileSync(testFile, testContent);

    // Write tsconfig.json
    fs.writeFileSync(
      path.join(testDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          module: 'ESNext',
          moduleResolution: 'node',
          strict: true,
        },
        include: ['*.ts'],
      })
    );

    // Symlink node_modules from main project for tsserver access
    const srcNodeModules = path.join(projectRoot, 'node_modules');
    const destNodeModules = path.join(testDir, 'node_modules');
    if (fs.existsSync(srcNodeModules)) {
      try {
        fs.symlinkSync(srcNodeModules, destNodeModules, 'junction');
      } catch (e) {
        // On some systems, symlink might fail - fall back to skip
        console.log('Could not create node_modules symlink, test will be skipped');
      }
    }

    // Initialize client
    client = new TsServerClient(testDir);
    initialized = await client.initialize();
  }, 30000);

  afterAll(async () => {
    if (initialized) {
      await client.shutdown();
    }

    // Cleanup test fixture
    if (fs.existsSync(testDir)) {
      // Remove symlink first (unlinkSync), then directory
      const nodeModulesLink = path.join(testDir, 'node_modules');
      if (fs.existsSync(nodeModulesLink)) {
        try {
          fs.unlinkSync(nodeModulesLink);
        } catch {
          // Ignore cleanup errors
        }
      }
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should initialize on test fixture', () => {
    // May fail if symlink couldn't be created
    expect(initialized).toBe(true);
  });

  it('should find references in test fixture', async () => {
    if (!initialized) return;

    // sayHello is on line 2 (0-indexed: 1), column 17 (0-indexed: 16)
    const result = await client.findReferences(testFile, 1, 16);

    expect(result.success).toBe(true);
    expect(result.locations).toBeDefined();
    // Should find: definition + greet() call + const message call = 3+
    expect(result.locations.length).toBeGreaterThanOrEqual(2);
  }, 30000);

  it('should get document symbols in test fixture', async () => {
    if (!initialized) return;

    const result = await client.documentSymbols(testFile);

    expect(result.success).toBe(true);
    expect(result.symbols).toBeDefined();
    if (result.symbols) {
      const symbolNames = result.symbols.map((s) => s.name);
      expect(symbolNames).toContain('sayHello');
      expect(symbolNames).toContain('greet');
    }
  }, 30000);

  it('should go to definition in test fixture', async () => {
    if (!initialized) return;

    // Find definition of sayHello called in greet() - line 7 (0-indexed: 6), around col 9
    const result = await client.goToDefinition(testFile, 6, 9);

    expect(result.success).toBe(true);
    expect(result.location).toBeDefined();
    // Definition should be on line 2 (0-indexed: 1)
    expect(result.location.range.start.line).toBe(1);
  }, 30000);
});
