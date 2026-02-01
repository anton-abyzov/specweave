/**
 * LSP CLI Commands
 *
 * Provides CLI interface to LSP operations: refs, def, hover, symbols, search.
 * Accepts symbol NAME (not line:char) for ease of use.
 *
 * @module cli/commands/lsp
 */

import fs from 'fs';
import path from 'path';
import { Command } from 'commander';
import { getGlobalLSPManager, shutdownGlobalLSPManager } from '../../core/lsp/lsp-manager.js';

/**
 * Position in a file (0-indexed)
 */
export interface SymbolPosition {
  line: number;
  character: number;
}

/**
 * Find the position of a symbol in a file by name.
 * Uses regex with word boundaries to find the symbol declaration.
 *
 * @param filePath - Path to the file
 * @param symbolName - Name of the symbol to find
 * @returns Position (0-indexed) or null if not found
 */
export function findSymbolPosition(filePath: string, symbolName: string): SymbolPosition | null {
  const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(resolvedPath)) {
    return null;
  }

  const content = fs.readFileSync(resolvedPath, 'utf-8');
  const lines = content.split('\n');

  // Patterns to match symbol declarations (in order of specificity)
  const patterns = [
    // Function/method declaration: function name(, async function name(, name(
    new RegExp(`\\b(?:export\\s+)?(?:async\\s+)?function\\s+(${symbolName})\\s*\\(`),
    // Class declaration
    new RegExp(`\\b(?:export\\s+)?class\\s+(${symbolName})\\b`),
    // Interface declaration
    new RegExp(`\\b(?:export\\s+)?interface\\s+(${symbolName})\\b`),
    // Type declaration
    new RegExp(`\\b(?:export\\s+)?type\\s+(${symbolName})\\b`),
    // Const/let/var declaration
    new RegExp(`\\b(?:export\\s+)?(?:const|let|var)\\s+(${symbolName})\\b`),
    // Method in class (indented)
    new RegExp(`^\\s+(?:async\\s+)?(${symbolName})\\s*\\(`),
    // Property assignment in object/class
    new RegExp(`\\b(${symbolName})\\s*[:=]`),
    // Generic word boundary match (fallback)
    new RegExp(`\\b(${symbolName})\\b`),
  ];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];

    for (const pattern of patterns) {
      const match = pattern.exec(line);
      if (match) {
        // Find the position of the captured group (the symbol name)
        const symbolStartIndex = line.indexOf(match[1], match.index);
        if (symbolStartIndex !== -1) {
          return {
            line: lineIndex,
            character: symbolStartIndex,
          };
        }
      }
    }
  }

  return null;
}

/**
 * Find all references to a symbol
 */
export async function handleLspRefs(
  projectRoot: string,
  filePath: string,
  symbolName: string
): Promise<void> {
  const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);

  // Find symbol position
  const position = findSymbolPosition(resolvedPath, symbolName);
  if (!position) {
    console.error(`Symbol '${symbolName}' not found in ${filePath}`);
    return;
  }

  try {
    const lspManager = getGlobalLSPManager(projectRoot);
    await lspManager.initialize();

    // CRITICAL FIX: Warmup before query to ensure workspace is indexed
    // Each CLI call is a fresh process, so we must warmup every time
    // This adds 10-30s on cold start but ensures real LSP (not grep fallback)
    if (!lspManager.isWarmedUp()) {
      console.log('🔥 Indexing workspace for semantic analysis (first-time, 10-30s)...');
      await lspManager.warmup();
    }

    const result = await lspManager.findReferences(resolvedPath, position.line, position.character);

    if (result && result.success && result.locations.length > 0) {
      console.log(`References to '${symbolName}':\n`);
      for (const loc of result.locations) {
        const relPath = path.relative(projectRoot, loc.uri.replace('file://', ''));
        console.log(`  ${relPath}:${loc.range.start.line + 1}:${loc.range.start.character + 1}`);
      }
      console.log(`\nTotal: ${result.locations.length} references`);
    } else {
      // Fall back to grep-based search
      await grepFallbackRefs(projectRoot, symbolName);
    }

    await shutdownGlobalLSPManager();
  } catch {
    // LSP failed, fall back to grep
    await grepFallbackRefs(projectRoot, symbolName);
  }
}

/**
 * Grep fallback for finding references
 */
async function grepFallbackRefs(projectRoot: string, symbolName: string): Promise<void> {
  console.log(`References to '${symbolName}' (grep fallback):\n`);

  const { execSync } = await import('child_process');

  try {
    const result = execSync(
      `grep -rn --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" "\\b${symbolName}\\b" .`,
      { cwd: projectRoot, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );

    const lines = result.trim().split('\n').filter(Boolean);
    for (const line of lines) {
      console.log(`  ${line}`);
    }
    console.log(`\nTotal: ${lines.length} matches (grep)`);
  } catch (error: unknown) {
    const exitCode = (error as { status?: number }).status;
    if (exitCode === 1) {
      console.log('  No references found');
    } else {
      console.error('Grep search failed');
    }
  }
}

/**
 * Go to definition of a symbol
 */
export async function handleLspDef(
  projectRoot: string,
  filePath: string,
  symbolName: string
): Promise<void> {
  const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);

  const position = findSymbolPosition(resolvedPath, symbolName);
  if (!position) {
    console.error(`Symbol '${symbolName}' not found in ${filePath}`);
    return;
  }

  try {
    const lspManager = getGlobalLSPManager(projectRoot);
    await lspManager.initialize();

    // Warmup before query to ensure workspace is indexed
    if (!lspManager.isWarmedUp()) {
      console.log('🔥 Indexing workspace for semantic analysis...');
      await lspManager.warmup();
    }

    const result = await lspManager.goToDefinition(resolvedPath, position.line, position.character);

    if (result && result.success && result.location) {
      const loc = result.location;
      const relPath = path.relative(projectRoot, loc.uri.replace('file://', ''));
      console.log(`Definition of '${symbolName}':\n`);
      console.log(`  ${relPath}:${loc.range.start.line + 1}:${loc.range.start.character + 1}`);
    } else {
      // Symbol is likely defined at the position we found
      const relPath = path.relative(projectRoot, resolvedPath);
      console.log(`Definition of '${symbolName}':\n`);
      console.log(`  ${relPath}:${position.line + 1}:${position.character + 1}`);
    }

    await shutdownGlobalLSPManager();
  } catch {
    // Fall back to showing found position
    const relPath = path.relative(projectRoot, resolvedPath);
    console.log(`Definition of '${symbolName}' (fallback):\n`);
    console.log(`  ${relPath}:${position.line + 1}:${position.character + 1}`);
  }
}

/**
 * Get hover/type information for a symbol
 */
export async function handleLspHover(
  projectRoot: string,
  filePath: string,
  symbolName: string
): Promise<void> {
  const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);

  const position = findSymbolPosition(resolvedPath, symbolName);
  if (!position) {
    console.error(`Symbol '${symbolName}' not found in ${filePath}`);
    return;
  }

  try {
    const lspManager = getGlobalLSPManager(projectRoot);
    await lspManager.initialize();

    // Warmup before query to ensure workspace is indexed
    if (!lspManager.isWarmedUp()) {
      console.log('🔥 Indexing workspace for semantic analysis...');
      await lspManager.warmup();
    }

    const result = await lspManager.hover(resolvedPath, position.line, position.character);

    if (result && result.success && result.contents) {
      console.log(`Type info for '${symbolName}':\n`);
      console.log(result.contents);
    } else {
      // Fall back to showing the line content
      await hoverFallback(resolvedPath, symbolName, position);
    }

    await shutdownGlobalLSPManager();
  } catch {
    await hoverFallback(resolvedPath, symbolName, position);
  }
}

/**
 * Fallback hover showing line content
 */
async function hoverFallback(
  filePath: string,
  symbolName: string,
  position: SymbolPosition
): Promise<void> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const line = lines[position.line];

  console.log(`Type info for '${symbolName}' (from source):\n`);
  console.log(`  ${line.trim()}`);

  // Try to infer type from declaration
  if (line.includes('function')) {
    console.log(`\n  Kind: function`);
  } else if (line.includes('class')) {
    console.log(`\n  Kind: class`);
  } else if (line.includes('interface')) {
    console.log(`\n  Kind: interface`);
  } else if (line.includes('type')) {
    console.log(`\n  Kind: type alias`);
  } else if (line.includes('const') || line.includes('let') || line.includes('var')) {
    console.log(`\n  Kind: variable`);
  }
}

/**
 * List all symbols in a file
 */
export async function handleLspSymbols(projectRoot: string, filePath: string): Promise<void> {
  const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }

  try {
    const lspManager = getGlobalLSPManager(projectRoot);
    await lspManager.initialize();

    // Warmup before query to ensure workspace is indexed
    if (!lspManager.isWarmedUp()) {
      console.log('🔥 Indexing workspace for semantic analysis...');
      await lspManager.warmup();
    }

    const result = await lspManager.documentSymbols(resolvedPath);

    if (result && result.success && result.symbols.length > 0) {
      console.log(`Symbols in ${path.basename(filePath)}:\n`);
      for (const sym of result.symbols) {
        const kind = getSymbolKindName(sym.kind);
        const line = sym.location?.range?.start?.line ?? 0;
        console.log(`  ${kind.padEnd(12)} ${sym.name} (line ${line + 1})`);
      }
      console.log(`\nTotal: ${result.symbols.length} symbols`);
    } else {
      await symbolsFallback(resolvedPath);
    }

    await shutdownGlobalLSPManager();
  } catch {
    await symbolsFallback(resolvedPath);
  }
}

/**
 * Fallback symbol extraction using regex
 */
async function symbolsFallback(filePath: string): Promise<void> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  console.log(`Symbols in ${path.basename(filePath)} (regex fallback):\n`);

  const symbols: Array<{ kind: string; name: string; line: number }> = [];

  const patterns = [
    { kind: 'function', regex: /(?:export\s+)?(?:async\s+)?function\s+(\w+)/ },
    { kind: 'class', regex: /(?:export\s+)?class\s+(\w+)/ },
    { kind: 'interface', regex: /(?:export\s+)?interface\s+(\w+)/ },
    { kind: 'type', regex: /(?:export\s+)?type\s+(\w+)/ },
    { kind: 'const', regex: /(?:export\s+)?const\s+(\w+)\s*[:=]/ },
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const { kind, regex } of patterns) {
      const match = regex.exec(line);
      if (match) {
        symbols.push({ kind, name: match[1], line: i + 1 });
      }
    }
  }

  for (const sym of symbols) {
    console.log(`  ${sym.kind.padEnd(12)} ${sym.name} (line ${sym.line})`);
  }

  console.log(`\nTotal: ${symbols.length} symbols`);
}

/**
 * Search for symbols in workspace
 */
export async function handleLspSearch(projectRoot: string, query: string): Promise<void> {
  try {
    const lspManager = getGlobalLSPManager(projectRoot);
    await lspManager.initialize();

    // Warmup before query to ensure workspace is indexed
    if (!lspManager.isWarmedUp()) {
      console.log('🔥 Indexing workspace for semantic analysis...');
      await lspManager.warmup();
    }

    const result = await lspManager.workspaceSymbols(query);

    if (result && result.success && result.symbols.length > 0) {
      console.log(`Workspace symbols matching '${query}':\n`);
      for (const sym of result.symbols) {
        const kind = getSymbolKindName(sym.kind);
        const relPath = sym.location?.uri
          ? path.relative(projectRoot, sym.location.uri.replace('file://', ''))
          : 'unknown';
        const line = sym.location?.range?.start?.line ?? 0;
        console.log(`  ${kind.padEnd(12)} ${sym.name} (${relPath}:${line + 1})`);
      }
      console.log(`\nTotal: ${result.symbols.length} symbols`);
    } else {
      await searchFallback(projectRoot, query);
    }

    await shutdownGlobalLSPManager();
  } catch {
    await searchFallback(projectRoot, query);
  }
}

/**
 * Fallback workspace search using grep
 */
async function searchFallback(projectRoot: string, query: string): Promise<void> {
  console.log(`Workspace symbols matching '${query}' (grep fallback):\n`);

  const { execSync } = await import('child_process');

  try {
    // Search for declarations matching the query
    const patterns = [
      `function\\s+\\w*${query}\\w*`,
      `class\\s+\\w*${query}\\w*`,
      `interface\\s+\\w*${query}\\w*`,
      `type\\s+\\w*${query}\\w*`,
    ];

    const combinedPattern = patterns.join('|');
    const result = execSync(
      `grep -rn --include="*.ts" --include="*.tsx" -E "${combinedPattern}" .`,
      { cwd: projectRoot, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );

    const lines = result.trim().split('\n').filter(Boolean);
    for (const line of lines.slice(0, 20)) {
      // Limit to 20 results
      console.log(`  ${line}`);
    }

    if (lines.length > 20) {
      console.log(`  ... and ${lines.length - 20} more`);
    }

    console.log(`\nTotal: ${lines.length} matches`);
  } catch (error: unknown) {
    const exitCode = (error as { status?: number }).status;
    if (exitCode === 1) {
      console.log('  No symbols found matching query');
    } else {
      console.error('Search failed');
    }
  }
}

/**
 * Convert LSP symbol kind number to name
 */
function getSymbolKindName(kind: number): string {
  const kinds: Record<number, string> = {
    1: 'File',
    2: 'Module',
    3: 'Namespace',
    4: 'Package',
    5: 'Class',
    6: 'Method',
    7: 'Property',
    8: 'Field',
    9: 'Constructor',
    10: 'Enum',
    11: 'Interface',
    12: 'Function',
    13: 'Variable',
    14: 'Constant',
    15: 'String',
    16: 'Number',
    17: 'Boolean',
    18: 'Array',
  };
  return kinds[kind] || 'Unknown';
}

/**
 * Create the LSP command for Commander.js
 */
export function createLspCommand(): Command {
  const lsp = new Command('lsp').description('LSP code intelligence operations');

  // specweave lsp refs <file> <symbol>
  lsp
    .command('refs <file> <symbol>')
    .description('Find all references to a symbol')
    .action(async (file: string, symbol: string) => {
      const projectRoot = process.cwd();
      await handleLspRefs(projectRoot, file, symbol);
    });

  // specweave lsp def <file> <symbol>
  lsp
    .command('def <file> <symbol>')
    .description('Go to definition of a symbol')
    .action(async (file: string, symbol: string) => {
      const projectRoot = process.cwd();
      await handleLspDef(projectRoot, file, symbol);
    });

  // specweave lsp hover <file> <symbol>
  lsp
    .command('hover <file> <symbol>')
    .description('Get type information for a symbol')
    .action(async (file: string, symbol: string) => {
      const projectRoot = process.cwd();
      await handleLspHover(projectRoot, file, symbol);
    });

  // specweave lsp symbols <file>
  lsp
    .command('symbols <file>')
    .description('List all symbols in a file')
    .action(async (file: string) => {
      const projectRoot = process.cwd();
      await handleLspSymbols(projectRoot, file);
    });

  // specweave lsp search <query>
  lsp
    .command('search <query>')
    .description('Search for symbols in workspace')
    .action(async (query: string) => {
      const projectRoot = process.cwd();
      await handleLspSearch(projectRoot, query);
    });

  // specweave lsp warmup [files...]
  lsp
    .command('warmup [files...]')
    .description('Warm up LSP by pre-indexing workspace (run on session start)')
    .option('--quiet', 'Suppress output')
    .action(async (files: string[], options: { quiet?: boolean }) => {
      const projectRoot = process.cwd();
      await handleLspWarmup(projectRoot, files, options.quiet ?? false);
    });

  // specweave lsp status
  lsp
    .command('status')
    .description('Show LSP status and warm-up state')
    .action(async () => {
      const projectRoot = process.cwd();
      await handleLspStatus(projectRoot);
    });

  return lsp;
}

/**
 * Warm up LSP by pre-indexing the workspace
 * v1.0.197: Added for session-start integration
 */
export async function handleLspWarmup(
  projectRoot: string,
  entryFiles: string[],
  quiet: boolean
): Promise<void> {
  const startTime = Date.now();

  if (!quiet) {
    console.log('Starting LSP warm-up (workspace indexing)...\n');
  }

  try {
    const lspManager = getGlobalLSPManager(projectRoot);
    await lspManager.initialize();

    const result = await lspManager.warmup(entryFiles.length > 0 ? entryFiles : undefined);

    const elapsed = Date.now() - startTime;

    if (!quiet) {
      if (result.warmedUp.length > 0) {
        console.log(`✅ Warmed up: ${result.warmedUp.join(', ')}`);
      }
      if (result.failed.length > 0) {
        console.log(`⚠️ Failed: ${result.failed.join(', ')}`);
      }
      console.log(`\nWarm-up completed in ${elapsed}ms`);
    }

    // Write status file for session-start.sh to read
    const stateDir = path.join(projectRoot, '.specweave/state');
    const stateFile = path.join(stateDir, 'lsp-warmup.json');
    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(stateFile, JSON.stringify({
      status: result.success ? 'ready' : 'partial',
      warmedUp: result.warmedUp,
      failed: result.failed,
      elapsedMs: elapsed,
      timestamp: new Date().toISOString()
    }, null, 2));

    // Keep server running for subsequent queries (don't shutdown)
    // await shutdownGlobalLSPManager();

  } catch (error) {
    if (!quiet) {
      console.error(`Warm-up failed: ${error}`);
    }
    process.exit(1);
  }
}

/**
 * Show LSP status
 */
export async function handleLspStatus(projectRoot: string): Promise<void> {
  try {
    // Read warm-up state
    const stateFile = path.join(projectRoot, '.specweave/state/lsp-warmup.json');
    let warmupState = null;
    if (fs.existsSync(stateFile)) {
      warmupState = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
    }

    // Read check state
    const checkFile = path.join(projectRoot, '.specweave/state/lsp-check.json');
    let checkState = null;
    if (fs.existsSync(checkFile)) {
      checkState = JSON.parse(fs.readFileSync(checkFile, 'utf-8'));
    }

    console.log('LSP Status:\n');

    // Binary/plugin check status
    if (checkState) {
      console.log(`📋 LSP Check: ${checkState.status === 'ok' ? '✅ All servers available' : '⚠️ Some servers missing'}`);
      console.log(`   Languages detected: ${checkState.stats?.checkedLanguages || 0}`);
      console.log(`   LSP env ready: ${checkState.lspEnvReady ? 'yes' : 'no (set ENABLE_LSP_TOOL=1)'}`);
      if (checkState.missing && checkState.missing.length > 0) {
        console.log(`   Missing:`);
        for (const m of checkState.missing) {
          console.log(`     - ${m.language}: ${m.message}`);
        }
      }
    } else {
      console.log('📋 LSP Check: not run yet (will run on next session start)');
    }

    console.log('');

    // Warm-up status
    if (warmupState) {
      console.log(`🔥 Warm-up: ${warmupState.status === 'ready' ? '✅ Ready' : '⏳ ' + warmupState.status}`);
      if (warmupState.warmedUp && warmupState.warmedUp.length > 0) {
        console.log(`   Indexed: ${warmupState.warmedUp.join(', ')}`);
      }
      if (warmupState.elapsedMs) {
        console.log(`   Time: ${warmupState.elapsedMs}ms`);
      }
    } else {
      console.log('🔥 Warm-up: not run yet (run `specweave lsp warmup`)');
    }

  } catch (error) {
    console.error(`Failed to get status: ${error}`);
  }
}
