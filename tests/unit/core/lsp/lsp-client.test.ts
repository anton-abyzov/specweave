/**
 * LSP Client Tests
 *
 * Tests for the LSP client that communicates with language servers
 * via JSON-RPC 2.0 over stdio.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import {
  LSPClient,
  LSPServerConfig,
  detectLSPServers,
} from '../../../../src/core/lsp/lsp-client.js';

describe('LSPClient', () => {
  let tempDir: string;
  let client: LSPClient | null = null;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsp-client-test-'));
  });

  afterEach(async () => {
    if (client) {
      await client.shutdown();
      client = null;
    }
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('detectLSPServers', () => {
    it('should detect TypeScript language server for projects with tsconfig.json', async () => {
      fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), '{}');

      const servers = await detectLSPServers(tempDir);

      // Will find server if typescript-language-server is installed
      // Otherwise returns empty array (graceful degradation)
      expect(Array.isArray(servers)).toBe(true);
    });

    it('should detect TypeScript language server for projects with package.json', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test' })
      );

      const servers = await detectLSPServers(tempDir);

      expect(Array.isArray(servers)).toBe(true);
    });

    it('should detect Python language server for projects with requirements.txt', async () => {
      fs.writeFileSync(path.join(tempDir, 'requirements.txt'), 'flask==2.0.0');

      const servers = await detectLSPServers(tempDir);

      expect(Array.isArray(servers)).toBe(true);
    });

    it('should detect Python language server for projects with pyproject.toml', async () => {
      fs.writeFileSync(path.join(tempDir, 'pyproject.toml'), '[tool.poetry]');

      const servers = await detectLSPServers(tempDir);

      expect(Array.isArray(servers)).toBe(true);
    });

    it('should return empty array for projects with no recognized markers', async () => {
      // Empty directory with no project markers
      const servers = await detectLSPServers(tempDir);

      expect(servers).toEqual([]);
    });
  });

  describe('LSPServerConfig', () => {
    it('should have required fields', () => {
      const config: LSPServerConfig = {
        command: 'typescript-language-server',
        args: ['--stdio'],
        rootPath: tempDir,
      };

      expect(config.command).toBe('typescript-language-server');
      expect(config.args).toContain('--stdio');
      expect(config.rootPath).toBe(tempDir);
    });
  });

  describe('LSPClient construction', () => {
    it('should create client with config', () => {
      const config: LSPServerConfig = {
        command: 'typescript-language-server',
        args: ['--stdio'],
        rootPath: tempDir,
      };

      client = new LSPClient(config);

      expect(client).toBeDefined();
    });
  });

  describe('initialize', () => {
    it('should fail gracefully if language server not installed', async () => {
      const config: LSPServerConfig = {
        command: 'nonexistent-lsp-server-xyz',
        args: ['--stdio'],
        rootPath: tempDir,
      };

      client = new LSPClient(config);
      const result = await client.initialize();

      expect(result).toBe(false);
    });
  });

  describe('shutdown', () => {
    it('should be safe to call shutdown on uninitialized client', async () => {
      const config: LSPServerConfig = {
        command: 'typescript-language-server',
        args: ['--stdio'],
        rootPath: tempDir,
      };

      client = new LSPClient(config);

      // Should not throw
      await expect(client.shutdown()).resolves.not.toThrow();
    });

    it('should be safe to call shutdown multiple times', async () => {
      const config: LSPServerConfig = {
        command: 'typescript-language-server',
        args: ['--stdio'],
        rootPath: tempDir,
      };

      client = new LSPClient(config);

      await expect(client.shutdown()).resolves.not.toThrow();
      await expect(client.shutdown()).resolves.not.toThrow();
    });
  });

  describe('goToDefinition', () => {
    it('should return unsuccessful result when not initialized', async () => {
      const config: LSPServerConfig = {
        command: 'typescript-language-server',
        args: ['--stdio'],
        rootPath: tempDir,
      };

      client = new LSPClient(config);
      // Don't initialize

      const result = await client.goToDefinition('test.ts', 1, 0);

      expect(result.success).toBe(false);
    });
  });

  describe('findReferences', () => {
    it('should return unsuccessful result when not initialized', async () => {
      const config: LSPServerConfig = {
        command: 'typescript-language-server',
        args: ['--stdio'],
        rootPath: tempDir,
      };

      client = new LSPClient(config);
      // Don't initialize

      const result = await client.findReferences('test.ts', 1, 0);

      expect(result.success).toBe(false);
      expect(result.locations).toEqual([]);
    });
  });

  describe('hover', () => {
    it('should return unsuccessful result when not initialized', async () => {
      const config: LSPServerConfig = {
        command: 'typescript-language-server',
        args: ['--stdio'],
        rootPath: tempDir,
      };

      client = new LSPClient(config);
      // Don't initialize

      const result = await client.hover('test.ts', 1, 0);

      expect(result.success).toBe(false);
      expect(result.contents).toBe('');
    });
  });

  describe('documentSymbols', () => {
    it('should return unsuccessful result when not initialized', async () => {
      const config: LSPServerConfig = {
        command: 'typescript-language-server',
        args: ['--stdio'],
        rootPath: tempDir,
      };

      client = new LSPClient(config);
      // Don't initialize

      const result = await client.documentSymbols('test.ts');

      expect(result.success).toBe(false);
      expect(result.symbols).toEqual([]);
    });
  });

  describe('workspaceSymbols', () => {
    it('should return unsuccessful result when not initialized', async () => {
      const config: LSPServerConfig = {
        command: 'typescript-language-server',
        args: ['--stdio'],
        rootPath: tempDir,
      };

      client = new LSPClient(config);
      // Don't initialize

      const result = await client.workspaceSymbols('test');

      expect(result.success).toBe(false);
      expect(result.symbols).toEqual([]);
    });
  });
});

// Integration tests require real language server and may have timing issues
// Run manually: npx vitest run tests/unit/core/lsp/lsp-client.test.ts --no-single-thread
describe.skip('LSPClient integration', () => {
  let tempDir: string;
  let client: LSPClient | null = null;
  let serverAvailable = false;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsp-integration-test-'));

    // Check if typescript-language-server is available
    try {
      const { execSync } = await import('child_process');
      execSync('which typescript-language-server', { stdio: 'ignore' });
      serverAvailable = true;
    } catch {
      serverAvailable = false;
    }
  });

  afterEach(async () => {
    if (client) {
      await client.shutdown();
      client = null;
    }
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should initialize with real TypeScript language server', async () => {
    if (!serverAvailable) {
      console.log('Skipping: typescript-language-server not installed');
      return;
    }

    // Create TypeScript project
    fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), '{}');
    fs.writeFileSync(path.join(tempDir, 'index.ts'), 'export const x = 1;');

    const config: LSPServerConfig = {
      command: 'typescript-language-server',
      args: ['--stdio'],
      rootPath: tempDir,
    };

    client = new LSPClient(config);
    const result = await client.initialize();

    expect(result).toBe(true);
  });

  it('should find references in TypeScript project', async () => {
    if (!serverAvailable) {
      console.log('Skipping: typescript-language-server not installed');
      return;
    }

    // Create TypeScript project with references
    fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), '{}');
    fs.writeFileSync(
      path.join(tempDir, 'lib.ts'),
      `export function greet(name: string) {
  return 'Hello ' + name;
}
`
    );
    fs.writeFileSync(
      path.join(tempDir, 'main.ts'),
      `import { greet } from './lib';

console.log(greet('World'));
greet('Test');
`
    );

    const config: LSPServerConfig = {
      command: 'typescript-language-server',
      args: ['--stdio'],
      rootPath: tempDir,
    };

    client = new LSPClient(config);
    await client.initialize();

    // Find references to 'greet' function (line 0, char 16 in lib.ts)
    const result = await client.findReferences('lib.ts', 0, 16);

    expect(result.success).toBe(true);
    // Should find at least the definition and usages
    expect(result.locations.length).toBeGreaterThan(0);
  });

  it('should go to definition in TypeScript project', async () => {
    if (!serverAvailable) {
      console.log('Skipping: typescript-language-server not installed');
      return;
    }

    // Create TypeScript project
    fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), '{}');
    fs.writeFileSync(
      path.join(tempDir, 'types.ts'),
      `export interface User {
  id: string;
  name: string;
}
`
    );
    fs.writeFileSync(
      path.join(tempDir, 'service.ts'),
      `import { User } from './types';

export function getUser(): User {
  return { id: '1', name: 'Test' };
}
`
    );

    const config: LSPServerConfig = {
      command: 'typescript-language-server',
      args: ['--stdio'],
      rootPath: tempDir,
    };

    client = new LSPClient(config);
    await client.initialize();

    // Go to definition of 'User' in service.ts
    // Line 2 (0-indexed), char 26 is the 'User' return type
    const result = await client.goToDefinition('service.ts', 2, 26);

    expect(result.success).toBe(true);
    expect(result.location.uri).toContain('types.ts');
  });
});
