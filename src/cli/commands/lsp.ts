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

  // Two-pass search: first try declaration patterns (specific),
  // then fall back to generic word boundary (usage).
  // This ensures we find "class LSPManager" instead of "import { LSPManager }".
  const declarationPatterns = patterns.slice(0, -1); // All except generic fallback
  const fallbackPattern = patterns[patterns.length - 1]; // Generic \b match

  // Pass 1: Look for declarations (specific patterns)
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];

    for (const pattern of declarationPatterns) {
      const match = pattern.exec(line);
      if (match) {
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

  // Pass 2: Fall back to generic word boundary match (first usage)
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const match = fallbackPattern.exec(lines[lineIndex]);
    if (match) {
      const symbolStartIndex = lines[lineIndex].indexOf(match[1], match.index);
      if (symbolStartIndex !== -1) {
        return {
          line: lineIndex,
          character: symbolStartIndex,
        };
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

  // specweave lsp setup - Multi-repo language scanning with user prompts
  lsp
    .command('setup')
    .description('Scan project for languages and interactively install LSP plugins')
    .option('-n, --max <number>', 'Maximum number of languages to suggest', '5')
    .option('--min-files <number>', 'Minimum file count to consider a language', '5')
    .option('--dry-run', 'Show what would be installed without installing')
    .option('--scope <scope>', 'Installation scope: user, project, local', 'project')
    .action(async (options: { max: string; minFiles: string; dryRun?: boolean; scope: string }) => {
      const projectRoot = process.cwd();
      await handleLspSetup(projectRoot, {
        maxLanguages: parseInt(options.max, 10),
        minFileCount: parseInt(options.minFiles, 10),
        dryRun: options.dryRun ?? false,
        scope: options.scope as 'user' | 'project' | 'local',
      });
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

// ============================================================================
// LSP SETUP - Multi-repo Language Scanning (v1.0.203)
// ============================================================================

/**
 * Language to LSP plugin mapping
 * Uses boostvolt/claude-code-lsps marketplace
 */
/**
 * Language to LSP plugin mapping
 * 22 languages supported (matching boostvolt/claude-code-lsps marketplace)
 */
export const LANGUAGE_TO_LSP_PLUGIN: Record<string, string> = {
  // Original 8 languages
  TypeScript: 'vtsls',
  Python: 'pyright',
  'C#': 'csharp-lsp',
  Go: 'gopls',
  Rust: 'rust-analyzer',
  Java: 'jdtls',
  PHP: 'intelephense',
  Ruby: 'solargraph',
  // NEW: 14 additional languages from boostvolt/claude-code-lsps
  Bash: 'bash-language-server',
  'C/C++': 'clangd',
  Clojure: 'clojure-lsp',
  Dart: 'dart-analyzer',
  Elixir: 'elixir-ls',
  Kotlin: 'kotlin-lsp',
  Lua: 'lua-language-server',
  Swift: 'sourcekit-lsp',
  Terraform: 'terraform-ls',
  YAML: 'yaml-language-server',
  Zig: 'zls',
  OCaml: 'ocaml-lsp',
  Nix: 'nixd',
  Gleam: 'gleam',
};

/**
 * Language configuration for detection
 */
interface LanguageConfig {
  name: string;
  extensions: string[];
  binaryInstallCommand: string;
  plugin: string;
}

const LANGUAGE_CONFIGS: LanguageConfig[] = [
  {
    name: 'TypeScript',
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
    binaryInstallCommand: 'npm install -g typescript-language-server typescript',
    plugin: 'vtsls',
  },
  {
    name: 'Python',
    extensions: ['.py', '.pyw'],
    binaryInstallCommand: 'pip install pyright',
    plugin: 'pyright',
  },
  {
    name: 'C#',
    extensions: ['.cs'],
    binaryInstallCommand: 'dotnet tool install -g csharp-ls',
    plugin: 'csharp-lsp',
  },
  {
    name: 'Go',
    extensions: ['.go'],
    binaryInstallCommand: 'go install golang.org/x/tools/gopls@latest',
    plugin: 'gopls',
  },
  {
    name: 'Rust',
    extensions: ['.rs'],
    binaryInstallCommand: 'rustup component add rust-analyzer',
    plugin: 'rust-analyzer',
  },
  {
    name: 'Java',
    extensions: ['.java'],
    binaryInstallCommand: 'Download from https://download.eclipse.org/jdtls/ (or: brew install jdtls)',
    plugin: 'jdtls',
  },
  {
    name: 'PHP',
    extensions: ['.php'],
    binaryInstallCommand: 'npm install -g intelephense',
    plugin: 'intelephense',
  },
  {
    name: 'Ruby',
    extensions: ['.rb'],
    binaryInstallCommand: 'gem install solargraph',
    plugin: 'solargraph',
  },
  // NEW: 14 additional languages from boostvolt/claude-code-lsps
  {
    name: 'Bash',
    extensions: ['.sh', '.bash', '.zsh', '.ksh'],
    binaryInstallCommand: 'npm install -g bash-language-server',
    plugin: 'bash-language-server',
  },
  {
    name: 'C/C++',
    extensions: ['.c', '.h', '.cpp', '.hpp', '.cc', '.cxx', '.hxx', '.m', '.mm'],
    binaryInstallCommand: 'apt install clangd (Linux) | brew install llvm (macOS) | choco install llvm (Windows)',
    plugin: 'clangd',
  },
  {
    name: 'Clojure',
    extensions: ['.clj', '.cljs', '.cljc', '.edn'],
    binaryInstallCommand: 'Download from https://clojure-lsp.io/installation/ (or: brew install clojure-lsp)',
    plugin: 'clojure-lsp',
  },
  {
    name: 'Dart',
    extensions: ['.dart'],
    binaryInstallCommand: 'Bundled with Dart SDK: https://dart.dev/get-dart (or: brew install dart)',
    plugin: 'dart-analyzer',
  },
  {
    name: 'Elixir',
    extensions: ['.ex', '.exs'],
    binaryInstallCommand: 'Download from https://github.com/elixir-lsp/elixir-ls/releases (or: brew install elixir-ls)',
    plugin: 'elixir-ls',
  },
  {
    name: 'Kotlin',
    extensions: ['.kt', '.kts'],
    binaryInstallCommand: 'Download from https://github.com/fwcd/kotlin-language-server/releases (or: brew install kotlin-language-server)',
    plugin: 'kotlin-lsp',
  },
  {
    name: 'Lua',
    extensions: ['.lua'],
    binaryInstallCommand: 'Download from https://github.com/LuaLS/lua-language-server/releases (or: brew install lua-language-server)',
    plugin: 'lua-language-server',
  },
  {
    name: 'Swift',
    extensions: ['.swift'],
    binaryInstallCommand: 'Bundled with Swift toolchain: https://swift.org/download/ (macOS: xcode-select --install)',
    plugin: 'sourcekit-lsp',
  },
  {
    name: 'Terraform',
    extensions: ['.tf', '.tfvars'],
    binaryInstallCommand: 'Download from https://releases.hashicorp.com/terraform-ls/ (or: brew install hashicorp/tap/terraform-ls)',
    plugin: 'terraform-ls',
  },
  {
    name: 'YAML',
    extensions: ['.yaml', '.yml'],
    binaryInstallCommand: 'npm install -g yaml-language-server',
    plugin: 'yaml-language-server',
  },
  {
    name: 'Zig',
    extensions: ['.zig', '.zon'],
    binaryInstallCommand: 'Download from https://github.com/zigtools/zls/releases (or: brew install zls)',
    plugin: 'zls',
  },
  {
    name: 'OCaml',
    extensions: ['.ml', '.mli'],
    binaryInstallCommand: 'opam install ocaml-lsp-server',
    plugin: 'ocaml-lsp',
  },
  {
    name: 'Nix',
    extensions: ['.nix'],
    binaryInstallCommand: 'nix profile install nixpkgs#nixd',
    plugin: 'nixd',
  },
  {
    name: 'Gleam',
    extensions: ['.gleam'],
    binaryInstallCommand: 'Download from https://gleam.run/getting-started/installing/ (or: brew install gleam)',
    plugin: 'gleam',
  },
];

/**
 * Directories to exclude from scanning
 */
const EXCLUDED_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  'target',
  '.next',
  '.nuxt',
  'coverage',
  '__pycache__',
  '.venv',
  'venv',
  'vendor',
  'bin',
  'obj',
];

/**
 * Directories that typically contain nested repositories
 */
const REPO_CONTAINER_DIRS = ['repositories', 'packages', 'services', 'apps', 'libs', 'modules'];

/**
 * Information about a detected language
 */
export interface LanguageInfo {
  name: string;
  fileCount: number;
  plugin: string;
  binaryInstallCommand: string;
  pluginInstallCommand: string;
  foundInRepos: string[];
}

/**
 * Result of scanning languages across repositories
 */
export interface LanguageScanResult {
  success: boolean;
  languages: LanguageInfo[];
  reposScanned: string[];
  totalFiles: number;
  error?: string;
}

/**
 * Options for language scanning
 */
export interface ScanOptions {
  maxLanguages?: number;
  minFileCount?: number;
  maxDepth?: number;
}

/**
 * Scan for languages across a project and its nested repositories
 *
 * @param projectRoot - Root directory to scan
 * @param options - Scan options
 * @returns Language scan results
 */
export async function scanLanguagesAcrossRepos(
  projectRoot: string,
  options: ScanOptions = {}
): Promise<LanguageScanResult> {
  const { maxLanguages, minFileCount = 0, maxDepth = 10 } = options;

  const languageCounts: Map<string, { count: number; repos: Set<string> }> = new Map();
  const reposScanned: string[] = [];

  // Initialize counts for all languages
  for (const config of LANGUAGE_CONFIGS) {
    languageCounts.set(config.name, { count: 0, repos: new Set() });
  }

  // Build set of directories to exclude from root scan
  // (they'll be scanned separately as nested repos)
  const rootExcludeDirs = new Set([...EXCLUDED_DIRS, ...REPO_CONTAINER_DIRS]);

  try {
    // Scan main project directory (excluding repo container dirs)
    await scanDirectory(projectRoot, projectRoot, languageCounts, maxDepth, 'root', 0, rootExcludeDirs);
    reposScanned.push('root');

    // Scan nested repository containers
    for (const containerDir of REPO_CONTAINER_DIRS) {
      const containerPath = path.join(projectRoot, containerDir);

      if (fs.existsSync(containerPath) && fs.statSync(containerPath).isDirectory()) {
        const entries = fs.readdirSync(containerPath, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.isDirectory() && !EXCLUDED_DIRS.includes(entry.name)) {
            const repoPath = path.join(containerPath, entry.name);
            // Nested repos use standard excluded dirs (not repo containers)
            await scanDirectory(repoPath, projectRoot, languageCounts, maxDepth, entry.name, 0, new Set(EXCLUDED_DIRS));
            reposScanned.push(entry.name);
          }
        }
      }
    }

    // Build results
    const languages: LanguageInfo[] = [];
    let totalFiles = 0;

    for (const config of LANGUAGE_CONFIGS) {
      const data = languageCounts.get(config.name);
      if (data && data.count >= minFileCount) {
        totalFiles += data.count;

        if (data.count > 0) {
          languages.push({
            name: config.name,
            fileCount: data.count,
            plugin: config.plugin,
            binaryInstallCommand: config.binaryInstallCommand,
            pluginInstallCommand: `claude plugin install ${config.plugin}@claude-code-lsps`,
            foundInRepos: Array.from(data.repos),
          });
        }
      }
    }

    // Sort by file count (descending)
    languages.sort((a, b) => b.fileCount - a.fileCount);

    // Limit to max languages if specified
    const finalLanguages = maxLanguages ? languages.slice(0, maxLanguages) : languages;

    return {
      success: true,
      languages: finalLanguages,
      reposScanned: [...new Set(reposScanned)],
      totalFiles,
    };
  } catch (error) {
    return {
      success: false,
      languages: [],
      reposScanned,
      totalFiles: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Recursively scan a directory for language files
 */
async function scanDirectory(
  dirPath: string,
  projectRoot: string,
  counts: Map<string, { count: number; repos: Set<string> }>,
  maxDepth: number,
  repoName: string,
  currentDepth: number = 0,
  excludeDirs: Set<string> = new Set(EXCLUDED_DIRS)
): Promise<void> {
  if (currentDepth > maxDepth) return;

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Skip excluded directories
        if (excludeDirs.has(entry.name)) continue;

        // Recurse into subdirectories
        await scanDirectory(fullPath, projectRoot, counts, maxDepth, repoName, currentDepth + 1, excludeDirs);
      } else if (entry.isFile()) {
        // Check file extension against language configs
        const ext = path.extname(entry.name).toLowerCase();

        for (const config of LANGUAGE_CONFIGS) {
          if (config.extensions.includes(ext)) {
            const data = counts.get(config.name);
            if (data) {
              data.count++;
              data.repos.add(repoName);
            }
            break; // File can only belong to one language
          }
        }
      }
    }
  } catch {
    // Directory read error - skip silently
  }
}

// ============================================================================
// LSP SETUP - Interactive Plugin Installation (v1.0.203)
// ============================================================================

interface SetupOptions {
  maxLanguages: number;
  minFileCount: number;
  dryRun: boolean;
  scope: 'user' | 'project' | 'local';
}

/**
 * Interactive LSP setup - scans project and prompts user for plugin installation
 */
export async function handleLspSetup(projectRoot: string, options: SetupOptions): Promise<void> {
  const { maxLanguages, minFileCount, dryRun, scope } = options;

  console.log('🔍 Scanning project for languages...\n');

  // Check ENABLE_LSP_TOOL env var
  const lspEnvEnabled = Boolean(process.env.ENABLE_LSP_TOOL);
  if (!lspEnvEnabled) {
    console.log('⚠️  ENABLE_LSP_TOOL environment variable is not set.');
    console.log('   LSP plugins require this to be enabled in your shell profile.\n');
    console.log('   Add to ~/.zshrc or ~/.bashrc:');
    console.log('   export ENABLE_LSP_TOOL=1\n');
  }

  // Scan for languages
  const result = await scanLanguagesAcrossRepos(projectRoot, {
    maxLanguages,
    minFileCount,
  });

  if (!result.success) {
    console.error(`❌ Scan failed: ${result.error}`);
    return;
  }

  if (result.languages.length === 0) {
    console.log('No supported languages detected with enough files.');
    console.log(`(Minimum file count: ${minFileCount})`);
    return;
  }

  // Display scan results
  console.log('📊 Languages detected:\n');
  console.log('   Language        Files   Found In');
  console.log('   ─────────────────────────────────────────────');

  for (const lang of result.languages) {
    const name = lang.name.padEnd(15);
    const files = String(lang.fileCount).padStart(5);
    const repos = lang.foundInRepos.slice(0, 3).join(', ') + (lang.foundInRepos.length > 3 ? '...' : '');
    console.log(`   ${name} ${files}   ${repos}`);
  }

  console.log(`\n   Total: ${result.totalFiles} files across ${result.reposScanned.length} locations\n`);

  // Show implications
  console.log('📋 Before installing LSP plugins, please note:\n');
  console.log('   1. 🔄 Claude Code RESTART REQUIRED after installation');
  console.log('   2. ⏱️  Startup time may increase slightly (LSP server initialization)');
  console.log('   3. 💾 Plugins install to:', getScopeDescription(scope));
  console.log('   4. 🔧 Language server BINARIES must be installed separately\n');

  if (dryRun) {
    console.log('🔍 DRY RUN - Would install:\n');
    for (const lang of result.languages) {
      console.log(`   ${lang.name}:`);
      console.log(`     Plugin:  claude plugin install ${lang.plugin}@claude-code-lsps --scope ${scope}`);
      console.log(`     Binary:  ${lang.binaryInstallCommand}\n`);
    }
    return;
  }

  // Interactive selection using @inquirer/prompts
  const { checkbox, confirm } = await import('@inquirer/prompts');

  // Ask which languages to install
  const selectedLanguages = await checkbox({
    message: 'Select languages to install LSP plugins for:',
    choices: result.languages.map((lang) => ({
      name: `${lang.name} (${lang.fileCount} files) - ${lang.plugin}`,
      value: lang.name,
      checked: true, // Pre-select all
    })),
  });

  if (selectedLanguages.length === 0) {
    console.log('\n❌ No languages selected. Setup cancelled.');
    return;
  }

  // Confirmation
  const confirmed = await confirm({
    message: `Install ${selectedLanguages.length} LSP plugin(s)? (Requires restart after)`,
    default: true,
  });

  if (!confirmed) {
    console.log('\n❌ Setup cancelled.');
    return;
  }

  // Install selected plugins
  console.log('\n📦 Installing LSP plugins...\n');

  const selectedLangs = result.languages.filter((l) => selectedLanguages.includes(l.name));
  const { spawnSync } = await import('child_process');

  const installed: string[] = [];
  const failed: string[] = [];
  const binaryCommands: string[] = [];

  for (const lang of selectedLangs) {
    console.log(`   Installing ${lang.plugin}@claude-code-lsps...`);

    const installResult = spawnSync('claude', ['plugin', 'install', `${lang.plugin}@claude-code-lsps`, '--scope', scope], {
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    if (installResult.status === 0) {
      console.log(`   ✅ ${lang.name} plugin installed`);
      installed.push(lang.name);
      binaryCommands.push(lang.binaryInstallCommand);
    } else {
      console.log(`   ❌ ${lang.name} plugin failed: ${installResult.stderr || 'Unknown error'}`);
      failed.push(lang.name);
    }
  }

  // Summary
  console.log('\n📋 Installation Summary:\n');

  if (installed.length > 0) {
    console.log(`   ✅ Installed: ${installed.join(', ')}`);
  }

  if (failed.length > 0) {
    console.log(`   ❌ Failed: ${failed.join(', ')}`);
  }

  // Binary installation reminders
  if (binaryCommands.length > 0) {
    console.log('\n🔧 Language Server Binaries (install manually):\n');
    for (let i = 0; i < installed.length; i++) {
      console.log(`   ${installed[i]}: ${binaryCommands[i]}`);
    }
  }

  // Final reminder
  console.log('\n⚠️  IMPORTANT: Restart Claude Code for changes to take effect!');

  // Write setup state for hooks
  const stateDir = path.join(projectRoot, '.specweave/state');
  const stateFile = path.join(stateDir, 'lsp-setup.json');
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(
    stateFile,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        scannedLanguages: result.languages.map((l) => l.name),
        installedPlugins: installed,
        failedPlugins: failed,
        scope,
        requiresRestart: installed.length > 0,
      },
      null,
      2
    )
  );
}

/**
 * Get human-readable description of installation scope
 */
function getScopeDescription(scope: 'user' | 'project' | 'local'): string {
  switch (scope) {
    case 'user':
      return '~/.claude/settings.json (all projects)';
    case 'project':
      return '.claude/settings.json (shared via git)';
    case 'local':
      return '.claude/settings.local.json (gitignored)';
  }
}
