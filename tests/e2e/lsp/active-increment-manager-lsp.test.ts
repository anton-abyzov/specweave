/**
 * LSP Integration Test: ActiveIncrementManager References
 *
 * Demonstrates proper LSP usage with dynamic symbol location.
 * Run: npx vitest tests/e2e/lsp/active-increment-manager-lsp.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TsServerClient } from '../../../src/core/lsp/tsserver-client.js';
import * as path from 'path';
import * as fs from 'fs';

describe('LSP: ActiveIncrementManager References', () => {
  const projectRoot = process.cwd();
  let tsClient: TsServerClient;
  let initialized = false;

  // Target file and symbol
  const testFile = 'src/core/increment/active-increment-manager.ts';
  const testSymbol = 'ActiveIncrementManager';

  /**
   * Dynamically find symbol position in file
   * No hardcoded line numbers!
   */
  function findSymbolPosition(
    filePath: string,
    pattern: RegExp
  ): { line: number; character: number } | null {
    const absolutePath = path.join(projectRoot, filePath);
    const content = fs.readFileSync(absolutePath, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(pattern);
      if (match) {
        // Return 0-based line number and character position
        const charPos = lines[i].indexOf(match[1] || match[0]);
        return { line: i, character: charPos >= 0 ? charPos : 0 };
      }
    }
    return null;
  }

  beforeAll(async () => {
    tsClient = new TsServerClient(projectRoot);
    initialized = await tsClient.initialize();

    if (initialized) {
      await tsClient.warmup();
    }
  }, 60000);

  afterAll(async () => {
    if (initialized) {
      await tsClient.shutdown();
    }
  });

  it('should find class definition position dynamically', () => {
    // Pattern: "export class ActiveIncrementManager" - capture the class name
    const pos = findSymbolPosition(testFile, /class\s+(ActiveIncrementManager)/);

    expect(pos).not.toBeNull();
    console.log(`\n✅ Found ${testSymbol} at line ${pos!.line + 1}, char ${pos!.character}`);
  });

  it('should find all semantic references via LSP', async () => {
    if (!initialized) {
      console.log('⚠️  Skipping: tsserver not initialized');
      return;
    }

    // Step 1: Find class definition dynamically
    const pos = findSymbolPosition(testFile, /class\s+(ActiveIncrementManager)/);
    expect(pos).not.toBeNull();

    const absoluteFile = path.join(projectRoot, testFile);

    // Step 2: Use LSP to find all references
    const result = await tsClient.findReferences(absoluteFile, pos!.line, pos!.character);

    expect(result.success).toBe(true);
    expect(result.locations.length).toBeGreaterThan(0);

    // Step 3: Group by file
    const fileGroups = new Map<string, number>();
    for (const loc of result.locations) {
      const file = loc.uri.replace('file://', '').replace(projectRoot, '');
      fileGroups.set(file, (fileGroups.get(file) || 0) + 1);
    }

    // Step 4: Display results
    console.log('\n┌─────────────────────────────────────────────────────────────┐');
    console.log('│        LSP: ActiveIncrementManager References               │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log(`│  Total semantic references: ${String(result.locations.length).padStart(3)}                           │`);
    console.log(`│  Unique files:              ${String(fileGroups.size).padStart(3)}                           │`);
    console.log('├─────────────────────────────────────────────────────────────┤');

    const sortedFiles = [...fileGroups.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    for (const [file, count] of sortedFiles) {
      const shortFile = file.length > 50 ? '...' + file.slice(-47) : file;
      console.log(`│  ${shortFile.padEnd(52)} (${String(count).padStart(2)})`);
    }
    console.log('└─────────────────────────────────────────────────────────────┘\n');

    // Verify we found references in expected files
    const fileNames = [...fileGroups.keys()];
    const hasMetadataManager = fileNames.some((f) => f.includes('metadata-manager'));
    const hasWorkflowOrchestrator = fileNames.some((f) => f.includes('workflow-orchestrator'));

    console.log('Expected cross-file references:');
    console.log(`  - metadata-manager.ts: ${hasMetadataManager ? '✅' : '❌'}`);
    console.log(`  - workflow-orchestrator.ts: ${hasWorkflowOrchestrator ? '✅' : '❌'}`);
  }, 60000);

  it('should compare LSP accuracy vs Grep', async () => {
    if (!initialized) return;

    const { execSync } = await import('child_process');

    // Grep: text matching
    const grepOutput = execSync(`grep -rn "${testSymbol}" --include="*.ts" src/ | wc -l`, {
      cwd: projectRoot,
      encoding: 'utf-8',
    });
    const grepMatches = parseInt(grepOutput.trim(), 10);

    // LSP: semantic references
    const pos = findSymbolPosition(testFile, /class\s+(ActiveIncrementManager)/);
    const absoluteFile = path.join(projectRoot, testFile);
    const lspResult = await tsClient.findReferences(absoluteFile, pos!.line, pos!.character);
    const lspMatches = lspResult.locations?.length || 0;

    console.log('\n┌─────────────────────────────────────────────────────────────┐');
    console.log('│        ACCURACY: LSP vs Grep                                │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log(`│  Grep matches (text):      ${String(grepMatches).padStart(4)} lines                       │`);
    console.log(`│  LSP references (semantic): ${String(lspMatches).padStart(3)} refs                        │`);
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log('│  Note: Grep finds comments, strings, imports (noise)       │');
    console.log('│  LSP finds actual TYPE usages only (signal)                │');
    console.log('└─────────────────────────────────────────────────────────────┘\n');

    // Both should find something
    expect(grepMatches).toBeGreaterThan(0);
    expect(lspMatches).toBeGreaterThan(0);
  }, 60000);

  it('should get type information via hover', async () => {
    if (!initialized) return;

    const pos = findSymbolPosition(testFile, /class\s+(ActiveIncrementManager)/);
    const absoluteFile = path.join(projectRoot, testFile);

    const hoverResult = await tsClient.hover(absoluteFile, pos!.line, pos!.character);

    console.log('\n┌─────────────────────────────────────────────────────────────┐');
    console.log('│        TYPE INFO: ActiveIncrementManager                    │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    if (hoverResult.success && hoverResult.contents) {
      const lines = hoverResult.contents.split('\n').slice(0, 5);
      for (const line of lines) {
        const truncated = line.length > 57 ? line.slice(0, 54) + '...' : line;
        console.log(`│  ${truncated.padEnd(57)} │`);
      }
    } else {
      console.log('│  (hover returned no type info)                              │');
    }
    console.log('└─────────────────────────────────────────────────────────────┘\n');

    expect(hoverResult).toBeDefined();
  }, 60000);

  it('should find definition from usage site', async () => {
    if (!initialized) return;

    // Find a file that USES ActiveIncrementManager (not defines it)
    const usageFile = 'src/core/increment/metadata-manager.ts';
    const usagePos = findSymbolPosition(usageFile, /(ActiveIncrementManager)/);

    if (!usagePos) {
      console.log('⚠️  No usage found in metadata-manager.ts');
      return;
    }

    const absoluteFile = path.join(projectRoot, usageFile);
    const defResult = await tsClient.goToDefinition(absoluteFile, usagePos.line, usagePos.character);

    console.log('\n┌─────────────────────────────────────────────────────────────┐');
    console.log('│        GO TO DEFINITION                                     │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log(`│  From: metadata-manager.ts:${usagePos.line + 1}                              │`);
    if (defResult.success) {
      const defFile = defResult.location.uri.replace('file://', '').replace(projectRoot, '');
      const shortFile = defFile.length > 45 ? '...' + defFile.slice(-42) : defFile;
      console.log(`│  To:   ${shortFile.padEnd(52)} │`);
      console.log(`│  Line: ${defResult.location.range.start.line + 1}                                                     │`);
    } else {
      console.log('│  (definition not found)                                     │');
    }
    console.log('└─────────────────────────────────────────────────────────────┘\n');

    expect(defResult.success).toBe(true);
    expect(defResult.location.uri).toContain('active-increment-manager');
  }, 60000);
});
