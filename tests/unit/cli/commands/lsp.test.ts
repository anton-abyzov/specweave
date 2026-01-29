/**
 * Tests for LSP CLI commands
 *
 * @module tests/unit/cli/commands/lsp
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// These will be implemented in src/cli/commands/lsp.ts
import {
  findSymbolPosition,
  handleLspRefs,
  handleLspDef,
  handleLspHover,
  handleLspSymbols,
  handleLspSearch,
  createLspCommand,
} from '../../../../src/cli/commands/lsp.js';

describe('LSP CLI Commands', () => {
  let tempDir: string;
  let testFile: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsp-test-'));

    // Create a sample TypeScript file for testing
    testFile = path.join(tempDir, 'sample.ts');
    fs.writeFileSync(
      testFile,
      `// Sample TypeScript file for LSP testing
export function handleAutoCommand(args: string[]): void {
  console.log('Handling auto command');
  processArgs(args);
}

function processArgs(args: string[]): void {
  for (const arg of args) {
    console.log(arg);
  }
}

export class CommandProcessor {
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  execute(): void {
    handleAutoCommand([this.name]);
  }
}

export interface CommandOptions {
  verbose: boolean;
  dryRun: boolean;
}
`
    );
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    vi.clearAllMocks();
  });

  describe('findSymbolPosition', () => {
    it('should find position of a function declaration', () => {
      const position = findSymbolPosition(testFile, 'handleAutoCommand');

      expect(position).not.toBeNull();
      expect(position!.line).toBe(1); // 0-indexed, line 2 in editor
      expect(position!.character).toBeGreaterThanOrEqual(16); // After "export function "
    });

    it('should find position of a class declaration', () => {
      const position = findSymbolPosition(testFile, 'CommandProcessor');

      expect(position).not.toBeNull();
      expect(position!.line).toBe(12); // 0-indexed (line 13 in editor)
    });

    it('should find position of an interface declaration', () => {
      const position = findSymbolPosition(testFile, 'CommandOptions');

      expect(position).not.toBeNull();
      expect(position!.line).toBe(24); // 0-indexed
    });

    it('should find position of a method within a class', () => {
      const position = findSymbolPosition(testFile, 'execute');

      expect(position).not.toBeNull();
      expect(position!.line).toBe(19); // 0-indexed (line 20 in editor)
    });

    it('should return null for non-existent symbol', () => {
      const position = findSymbolPosition(testFile, 'nonExistentSymbol');

      expect(position).toBeNull();
    });

    it('should handle symbols with word boundaries correctly', () => {
      // Should not match partial words
      const position = findSymbolPosition(testFile, 'handle');

      // 'handle' appears in 'handleAutoCommand', but we want exact matches
      // If it finds it, it should be at word boundary
      if (position !== null) {
        // Read the line and verify it's an actual symbol, not substring
        const content = fs.readFileSync(testFile, 'utf-8');
        const lines = content.split('\n');
        const line = lines[position.line];
        // Should match as a complete word
        expect(line).toMatch(/\bhandle\b/);
      }
    });
  });

  describe('handleLspRefs', () => {
    it('should find references to a symbol', async () => {
      const consoleSpy = vi.spyOn(console, 'log');

      await handleLspRefs(tempDir, testFile, 'handleAutoCommand');

      // Should output reference locations
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should output in parseable format', async () => {
      const consoleSpy = vi.spyOn(console, 'log');

      await handleLspRefs(tempDir, testFile, 'handleAutoCommand');

      // Output should include file:line format
      const calls = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(calls).toMatch(/sample\.ts:\d+/);

      consoleSpy.mockRestore();
    });

    it('should handle symbol not found gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error');

      await handleLspRefs(tempDir, testFile, 'nonExistentSymbol');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('not found')
      );
      consoleSpy.mockRestore();
    });

    it('should fall back to grep when LSP unavailable', async () => {
      const consoleSpy = vi.spyOn(console, 'log');

      // Even if LSP fails, should fall back to grep
      await handleLspRefs(tempDir, testFile, 'handleAutoCommand');

      // Should still find some references via grep fallback
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('handleLspDef', () => {
    it('should find definition of a symbol', async () => {
      const consoleSpy = vi.spyOn(console, 'log');

      await handleLspDef(tempDir, testFile, 'processArgs');

      // Should output definition location
      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toMatch(/sample\.ts:\d+/);

      consoleSpy.mockRestore();
    });

    it('should handle symbol not found', async () => {
      const consoleSpy = vi.spyOn(console, 'error');

      await handleLspDef(tempDir, testFile, 'nonExistentSymbol');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('not found')
      );
      consoleSpy.mockRestore();
    });
  });

  describe('handleLspHover', () => {
    it('should get type information for a function', async () => {
      const consoleSpy = vi.spyOn(console, 'log');

      await handleLspHover(tempDir, testFile, 'handleAutoCommand');

      // Should output type signature
      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
      // Should contain function signature info
      expect(output).toMatch(/function|handleAutoCommand/i);

      consoleSpy.mockRestore();
    });

    it('should get type information for a class', async () => {
      const consoleSpy = vi.spyOn(console, 'log');

      await handleLspHover(tempDir, testFile, 'CommandProcessor');

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toMatch(/class|CommandProcessor/i);

      consoleSpy.mockRestore();
    });

    it('should handle symbol not found', async () => {
      const consoleSpy = vi.spyOn(console, 'error');

      await handleLspHover(tempDir, testFile, 'nonExistentSymbol');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('not found')
      );
      consoleSpy.mockRestore();
    });
  });

  describe('handleLspSymbols', () => {
    it('should list all symbols in a file', async () => {
      const consoleSpy = vi.spyOn(console, 'log');

      await handleLspSymbols(tempDir, testFile);

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');

      // Should list exported symbols
      expect(output).toContain('handleAutoCommand');
      expect(output).toContain('CommandProcessor');
      expect(output).toContain('CommandOptions');

      consoleSpy.mockRestore();
    });

    it('should include symbol kinds', async () => {
      const consoleSpy = vi.spyOn(console, 'log');

      await handleLspSymbols(tempDir, testFile);

      const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');

      // Should indicate symbol types
      expect(output).toMatch(/function|class|interface/i);

      consoleSpy.mockRestore();
    });

    it('should handle non-existent file gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error');

      await handleLspSymbols(tempDir, '/nonexistent/file.ts');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('not found')
      );
      consoleSpy.mockRestore();
    });
  });

  describe('handleLspSearch', () => {
    it('should search for symbols in workspace', async () => {
      const consoleSpy = vi.spyOn(console, 'log');

      await handleLspSearch(tempDir, 'Command');

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');

      // Should find CommandProcessor and CommandOptions
      expect(output).toMatch(/CommandProcessor|CommandOptions/);

      consoleSpy.mockRestore();
    });

    it('should return empty for no matches', async () => {
      const consoleSpy = vi.spyOn(console, 'log');

      await handleLspSearch(tempDir, 'XyzNonExistent123');

      // Should indicate no results
      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toMatch(/no.*(results|symbols|found)/i);

      consoleSpy.mockRestore();
    });
  });

  describe('createLspCommand', () => {
    it('should create a Commander.js command', () => {
      const command = createLspCommand();

      expect(command).toBeDefined();
      expect(command.name()).toBe('lsp');
    });

    it('should have subcommands for all operations', () => {
      const command = createLspCommand();
      const subcommands = command.commands.map((c: { name: () => string }) =>
        c.name()
      );

      expect(subcommands).toContain('refs');
      expect(subcommands).toContain('def');
      expect(subcommands).toContain('hover');
      expect(subcommands).toContain('symbols');
      expect(subcommands).toContain('search');
    });
  });

  describe('integration scenarios', () => {
    it('should handle file path with spaces', async () => {
      const dirWithSpaces = path.join(tempDir, 'path with spaces');
      fs.mkdirSync(dirWithSpaces, { recursive: true });
      const fileWithSpaces = path.join(dirWithSpaces, 'test file.ts');
      fs.writeFileSync(fileWithSpaces, 'export function testFunc() {}');

      const position = findSymbolPosition(fileWithSpaces, 'testFunc');
      expect(position).not.toBeNull();
    });

    it('should handle relative file paths', async () => {
      const originalCwd = process.cwd();
      try {
        process.chdir(tempDir);
        const position = findSymbolPosition('sample.ts', 'handleAutoCommand');
        expect(position).not.toBeNull();
      } finally {
        process.chdir(originalCwd);
      }
    });
  });
});
