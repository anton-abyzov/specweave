/**
 * Tests for LSPManager.hasTypeScriptProject() fix
 *
 * Verifies that TypeScript project detection requires tsconfig.json or
 * jsconfig.json, NOT just package.json (which Python/Go/etc. projects
 * may also have for tooling like linters or formatters).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Track constructor calls and control behavior via module-level state
// vi.hoisted ensures these are available before vi.mock runs
const { state, MockTsServerClient } = vi.hoisted(() => {
  const state = {
    constructorCalls: [] as any[][],
    initResolve: true,
  };

  // Must be a regular class (not arrow function) since it's used with `new`
  class MockTsServerClient {
    constructor(...args: any[]) {
      state.constructorCalls.push(args);
    }

    async initialize() { return state.initResolve; }
    async warmup() { return true; }
    isWarmedUp() { return true; }
    async goToDefinition() { return { location: {}, success: false }; }
    async findReferences() { return { locations: [], success: false }; }
    async hover() { return { contents: '', success: false }; }
    async documentSymbols() { return { symbols: [], success: false }; }
    async workspaceSymbols() { return { symbols: [], success: false }; }
    async shutdown() {}
  }

  return { state, MockTsServerClient };
});

vi.mock('../../../../src/core/lsp/tsserver-client.js', () => ({
  TsServerClient: MockTsServerClient,
}));

vi.mock('../../../../src/core/lsp/lsp-client.js', () => ({
  LSPClient: vi.fn(),
  detectLSPServers: vi.fn().mockResolvedValue([]),
}));

// Suppress logger output during tests
vi.mock('../../../../src/utils/logger.js', () => ({
  consoleLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { LSPManager } from '../../../../src/core/lsp/lsp-manager.js';

describe('LSPManager TypeScript project detection', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsp-ts-detect-'));
    state.constructorCalls = [];
    state.initResolve = true;
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should detect TypeScript project when tsconfig.json exists', async () => {
    fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), '{}');

    const manager = new LSPManager({ projectRoot: tempDir });
    await manager.initialize();

    expect(state.constructorCalls.length).toBe(1);
    const stats = manager.getStatistics();
    expect(stats.availableLanguages).toContain('typescript');

    await manager.shutdown();
  });

  it('should detect TypeScript project when jsconfig.json exists', async () => {
    fs.writeFileSync(path.join(tempDir, 'jsconfig.json'), '{}');

    const manager = new LSPManager({ projectRoot: tempDir });
    await manager.initialize();

    expect(state.constructorCalls.length).toBe(1);
    const stats = manager.getStatistics();
    expect(stats.availableLanguages).toContain('typescript');

    await manager.shutdown();
  });

  it('should NOT detect TypeScript project with only package.json (BUG FIX)', async () => {
    // This was the bug: a Python project with package.json for eslint
    // would incorrectly trigger TypeScript server initialization
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ name: 'python-project', devDependencies: { eslint: '*' } })
    );

    const manager = new LSPManager({ projectRoot: tempDir });
    await manager.initialize();

    expect(state.constructorCalls.length).toBe(0);
    const stats = manager.getStatistics();
    expect(stats.availableLanguages).not.toContain('typescript');

    await manager.shutdown();
  });

  it('should NOT detect TypeScript project in empty directory', async () => {
    const manager = new LSPManager({ projectRoot: tempDir });
    await manager.initialize();

    expect(state.constructorCalls.length).toBe(0);
    const stats = manager.getStatistics();
    expect(stats.clientCount).toBe(0);

    await manager.shutdown();
  });

  it('should detect TypeScript when both tsconfig.json and package.json exist', async () => {
    fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), '{}');
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ name: 'ts-project' })
    );

    const manager = new LSPManager({ projectRoot: tempDir });
    await manager.initialize();

    expect(state.constructorCalls.length).toBe(1);
    const stats = manager.getStatistics();
    expect(stats.availableLanguages).toContain('typescript');

    await manager.shutdown();
  });

  it('should handle TsServerClient initialization failure gracefully', async () => {
    fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), '{}');
    state.initResolve = false;

    const manager = new LSPManager({ projectRoot: tempDir });
    await manager.initialize();

    expect(state.constructorCalls.length).toBe(1);
    const stats = manager.getStatistics();
    expect(stats.availableLanguages).not.toContain('typescript');
    expect(stats.clientCount).toBe(0);

    await manager.shutdown();
  });
});
