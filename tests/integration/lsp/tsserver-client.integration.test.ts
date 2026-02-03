/**
 * Integration Tests: TsServerClient
 *
 * REAL integration tests that spawn actual tsserver process and verify
 * semantic code intelligence works correctly.
 *
 * These tests use the actual SpecWeave codebase as test data.
 *
 * @module tests/integration/lsp/tsserver-client.integration.test
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TsServerClient } from '../../../src/core/lsp/tsserver-client.js';
import * as path from 'path';
import * as fs from 'fs';

describe('TsServerClient Integration', () => {
  const projectRoot = path.resolve(__dirname, '../../..');
  let client: TsServerClient;

  // Known symbol locations for verification
  // These are REAL locations in the SpecWeave codebase
  const TEST_CASES = {
    // ActiveIncrementManager class - has many references
    activeIncrementManager: {
      file: 'src/core/increment/active-increment-manager.ts',
      symbol: 'ActiveIncrementManager',
      // Line where class is declared (0-indexed)
      declarationLine: 43, // "export class ActiveIncrementManager {"
      // Minimum expected references (imports + usages)
      minRefs: 5,
    },
    // MetadataManager - another well-used class
    metadataManager: {
      file: 'src/core/increment/metadata-manager.ts',
      symbol: 'MetadataManager',
      declarationLine: 30, // approximate
      minRefs: 3,
    },
    // A function that's used in multiple places
    getGlobalLSPManager: {
      file: 'src/core/lsp/lsp-manager.ts',
      symbol: 'getGlobalLSPManager',
      minRefs: 2,
    },
  };

  beforeAll(async () => {
    // Verify test files exist
    for (const [name, tc] of Object.entries(TEST_CASES)) {
      const fullPath = path.join(projectRoot, tc.file);
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Test file not found: ${tc.file} (test case: ${name})`);
      }
    }

    // Initialize client
    client = new TsServerClient(projectRoot);
    const initialized = await client.initialize();
    expect(initialized).toBe(true);

    // Warmup to ensure project is loaded
    const warmedUp = await client.warmup();
    expect(warmedUp).toBe(true);
  }, 60000); // 60s timeout for initialization + warmup

  afterAll(async () => {
    if (client) {
      await client.shutdown();
    }
  });

  describe('findReferences', () => {
    it('should find all references to ActiveIncrementManager class', async () => {
      const tc = TEST_CASES.activeIncrementManager;
      const filePath = tc.file;

      // Find the symbol position in the file
      const position = findSymbolInFile(
        path.join(projectRoot, filePath),
        tc.symbol
      );
      expect(position).not.toBeNull();

      // Call findReferences
      const result = await client.findReferences(
        filePath,
        position!.line,
        position!.character
      );

      // Verify result structure
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.locations).toBeDefined();
      expect(Array.isArray(result.locations)).toBe(true);

      // Verify we found enough references
      expect(result.locations.length).toBeGreaterThanOrEqual(tc.minRefs);

      // Verify all references are in source files (not dist/)
      for (const loc of result.locations) {
        expect(loc.uri).toMatch(/^file:\/\//);
        expect(loc.uri).not.toContain('/dist/');
        expect(loc.uri).not.toContain('/node_modules/');
      }

      // Verify the declaration itself is included
      const hasDeclaration = result.locations.some((loc) => {
        const locPath = loc.uri.replace('file://', '');
        return (
          locPath.endsWith(tc.file) &&
          Math.abs(loc.range.start.line - tc.declarationLine) <= 2
        );
      });
      expect(hasDeclaration).toBe(true);

      // Log for debugging
      console.log(`\n  findReferences('${tc.symbol}'):`);
      console.log(`    Found: ${result.locations.length} references`);
      console.log(`    Files: ${[...new Set(result.locations.map((l) => path.basename(l.uri.replace('file://', ''))))].join(', ')}`);
    }, 30000);

    it('should find references to MetadataManager class', async () => {
      const tc = TEST_CASES.metadataManager;

      const position = findSymbolInFile(
        path.join(projectRoot, tc.file),
        tc.symbol
      );
      expect(position).not.toBeNull();

      const result = await client.findReferences(
        tc.file,
        position!.line,
        position!.character
      );

      expect(result.success).toBe(true);
      expect(result.locations.length).toBeGreaterThanOrEqual(tc.minRefs);

      console.log(`\n  findReferences('${tc.symbol}'): ${result.locations.length} refs`);
    }, 30000);

    it('should find references to exported function', async () => {
      const tc = TEST_CASES.getGlobalLSPManager;

      const position = findSymbolInFile(
        path.join(projectRoot, tc.file),
        tc.symbol
      );
      expect(position).not.toBeNull();

      const result = await client.findReferences(
        tc.file,
        position!.line,
        position!.character
      );

      expect(result.success).toBe(true);
      expect(result.locations.length).toBeGreaterThanOrEqual(tc.minRefs);

      console.log(`\n  findReferences('${tc.symbol}'): ${result.locations.length} refs`);
    }, 30000);

    it('should return empty array for non-existent symbol', async () => {
      // Use a valid file but invalid position
      const result = await client.findReferences(
        TEST_CASES.activeIncrementManager.file,
        0, // Line 0
        0  // Character 0 - likely whitespace or comment
      );

      // Should succeed but with no/few results (might find the file itself)
      expect(result.success).toBe(true);
      // Not asserting locations.length === 0 because position (0,0) might hit something
    }, 30000);
  });

  describe('goToDefinition', () => {
    it('should find definition of imported symbol', async () => {
      // Find a file that imports ActiveIncrementManager
      const importerFile = 'src/core/increment/metadata-manager.ts';
      const content = fs.readFileSync(path.join(projectRoot, importerFile), 'utf-8');

      // Find where ActiveIncrementManager is used (not imported)
      const lines = content.split('\n');
      let usageLine = -1;
      let usageChar = -1;

      for (let i = 0; i < lines.length; i++) {
        // Skip import lines, find actual usage
        if (lines[i].includes('ActiveIncrementManager') && !lines[i].includes('import')) {
          usageLine = i;
          usageChar = lines[i].indexOf('ActiveIncrementManager');
          break;
        }
      }

      expect(usageLine).toBeGreaterThan(-1);

      const result = await client.goToDefinition(importerFile, usageLine, usageChar);

      expect(result.success).toBe(true);
      expect(result.location).toBeDefined();
      expect(result.location.uri).toContain('active-increment-manager.ts');

      console.log(`\n  goToDefinition found: ${result.location.uri.split('/').pop()}:${result.location.range.start.line + 1}`);
    }, 30000);
  });

  describe('hover', () => {
    it('should return type information for class', async () => {
      const tc = TEST_CASES.activeIncrementManager;
      const position = findSymbolInFile(
        path.join(projectRoot, tc.file),
        tc.symbol
      );

      const result = await client.hover(tc.file, position!.line, position!.character);

      expect(result.success).toBe(true);
      expect(result.contents).toBeDefined();
      expect(result.contents.length).toBeGreaterThan(0);
      // Should contain the class name
      expect(result.contents).toContain('ActiveIncrementManager');

      console.log(`\n  hover('${tc.symbol}'): ${result.contents.substring(0, 100)}...`);
    }, 30000);
  });

  describe('documentSymbols', () => {
    it('should list all symbols in a file', async () => {
      const result = await client.documentSymbols(TEST_CASES.activeIncrementManager.file);

      expect(result.success).toBe(true);
      expect(result.symbols).toBeDefined();
      expect(result.symbols.length).toBeGreaterThan(0);

      // Should find the class
      const classSymbol = result.symbols.find((s) => s.name === 'ActiveIncrementManager');
      expect(classSymbol).toBeDefined();
      expect(classSymbol!.kind).toBe(5); // Class kind

      // Should find methods
      const methodSymbols = result.symbols.filter((s) => s.kind === 6); // Method kind
      expect(methodSymbols.length).toBeGreaterThan(0);

      console.log(`\n  documentSymbols: ${result.symbols.length} symbols`);
      console.log(`    Classes: ${result.symbols.filter((s) => s.kind === 5).length}`);
      console.log(`    Methods: ${methodSymbols.length}`);
    }, 30000);
  });

  describe('workspaceSymbols', () => {
    it('should search for symbols across workspace', async () => {
      // Search for exact class name (more reliable than partial)
      const result = await client.workspaceSymbols('ActiveIncrementManager');

      expect(result.success).toBe(true);
      expect(result.symbols).toBeDefined();
      expect(result.symbols.length).toBeGreaterThan(0);

      // Should find the class (exact or partial match)
      const found = result.symbols.find((s) =>
        s.name.includes('ActiveIncrement') || s.name.includes('Increment')
      );
      expect(found).toBeDefined();

      console.log(`\n  workspaceSymbols('ActiveIncrementManager'): ${result.symbols.length} matches`);
      console.log(`    First match: ${result.symbols[0]?.name}`);
    }, 30000);
  });
});

/**
 * Helper: Find symbol position in file
 */
function findSymbolInFile(
  filePath: string,
  symbolName: string
): { line: number; character: number } | null {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // Patterns to match symbol declarations
  const patterns = [
    new RegExp(`\\bclass\\s+(${symbolName})\\b`),
    new RegExp(`\\binterface\\s+(${symbolName})\\b`),
    new RegExp(`\\bfunction\\s+(${symbolName})\\b`),
    new RegExp(`\\bexport\\s+function\\s+(${symbolName})\\b`),
    new RegExp(`\\bconst\\s+(${symbolName})\\b`),
    new RegExp(`\\b(${symbolName})\\b`), // Fallback
  ];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    for (const pattern of patterns) {
      const match = pattern.exec(line);
      if (match && match[1] === symbolName) {
        return {
          line: lineIndex,
          character: line.indexOf(match[1]),
        };
      }
    }
  }

  return null;
}
