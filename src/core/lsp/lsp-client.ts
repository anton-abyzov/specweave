/**
 * LSP Client Wrapper
 *
 * Provides TypeScript wrapper for Language Server Protocol operations.
 * Supports semantic code understanding (goToDefinition, findReferences, etc.)
 *
 * @module core/lsp/lsp-client
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { consoleLogger as logger } from '../../utils/logger.js';

export interface LSPPosition {
  line: number;
  character: number;
}

export interface LSPLocation {
  uri: string;
  range: {
    start: LSPPosition;
    end: LSPPosition;
  };
}

export interface LSPDefinitionResult {
  location: LSPLocation;
  success: boolean;
}

export interface LSPReferencesResult {
  locations: LSPLocation[];
  success: boolean;
}

export interface LSPHoverResult {
  contents: string;
  range?: {
    start: LSPPosition;
    end: LSPPosition;
  };
  success: boolean;
}

export interface LSPSymbolInformation {
  name: string;
  kind: number;
  location: LSPLocation;
  containerName?: string;
}

export interface LSPDocumentSymbolsResult {
  symbols: LSPSymbolInformation[];
  success: boolean;
}

export interface LSPWorkspaceSymbolsResult {
  symbols: LSPSymbolInformation[];
  success: boolean;
}

/** Empty location for failed operations */
const EMPTY_LOCATION: LSPLocation = {
  uri: '',
  range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }
};

export interface LSPServerConfig {
  command: string;
  args: string[];
  rootPath: string;
  /** Request timeout in milliseconds (default: 60000) */
  timeoutMs?: number;
}

/** Default request timeout in milliseconds */
const DEFAULT_TIMEOUT_MS = 60000;

/**
 * LSP Client for semantic code analysis
 */
export class LSPClient {
  private serverProcess: ChildProcess | null = null;
  private requestId = 0;
  private config: LSPServerConfig;
  private initialized = false;
  private responseHandlers: Map<number, (response: any) => void> = new Map();
  private buffer = '';
  /** Track opened documents to avoid redundant didOpen + 500ms delays */
  private openedDocuments: Set<string> = new Set();
  /** Track if workspace has been indexed (first query triggers this) */
  private workspaceIndexed = false;
  /** Request timeout in milliseconds */
  private readonly timeoutMs: number;

  constructor(config: LSPServerConfig) {
    this.config = config;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /**
   * Initialize the LSP server
   */
  async initialize(): Promise<boolean> {
    try {
      logger.debug(`Starting LSP server: ${this.config.command} ${this.config.args.join(' ')}`);

      // Use a promise to handle spawn errors properly
      const spawnPromise = new Promise<ChildProcess>((resolve, reject) => {
        const proc = spawn(this.config.command, this.config.args, {
          cwd: this.config.rootPath,
          stdio: ['pipe', 'pipe', 'pipe']
        });

        // Handle spawn error (e.g., command not found)
        proc.on('error', (err) => {
          reject(err);
        });

        // Give it a moment to either error or succeed
        setTimeout(() => {
          if (proc.pid) {
            resolve(proc);
          }
        }, 100);
      });

      try {
        this.serverProcess = await Promise.race([
          spawnPromise,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Spawn timeout')), 5000)
          )
        ]);
      } catch (spawnError) {
        logger.error(`Failed to spawn LSP server: ${spawnError}`);
        return false;
      }

      if (!this.serverProcess || !this.serverProcess.stdout || !this.serverProcess.stdin) {
        logger.error('Failed to create LSP server process');
        return false;
      }

      // Handle process errors after spawn
      this.serverProcess.on('error', (err) => {
        logger.error(`LSP server error: ${err}`);
      });

      // Handle stdout
      this.serverProcess.stdout.on('data', (data: Buffer) => {
        const str = data.toString();
        logger.debug(`LSP stdout (${str.length} bytes)`);
        this.handleServerMessage(str);
      });

      // Handle stderr - log all output from TS server
      this.serverProcess.stderr?.on('data', (data: Buffer) => {
        const str = data.toString();
        // Log stderr at info level so it's always visible
        console.error(`[LSP stderr] ${str}`);
      });

      // Send initialize request with proper workspace configuration
      // TypeScript Language Server requires workspaceFolders to find tsconfig.json
      const rootUri = `file://${this.config.rootPath}`;
      const initializeResult = await this.sendRequest('initialize', {
        processId: process.pid,
        rootPath: this.config.rootPath, // Deprecated but needed by some servers
        rootUri,
        workspaceFolders: [
          {
            uri: rootUri,
            name: path.basename(this.config.rootPath)
          }
        ],
        capabilities: {
          textDocument: {
            definition: { dynamicRegistration: true },
            references: { dynamicRegistration: true },
            hover: { dynamicRegistration: true },
            documentSymbol: { dynamicRegistration: true }
          },
          workspace: {
            workspaceFolders: true,
            symbol: { dynamicRegistration: true }
          }
        }
      });

      if (!initializeResult) {
        logger.error('LSP initialization failed');
        return false;
      }

      // Send initialized notification
      this.sendNotification('initialized', {});

      this.initialized = true;
      logger.info('LSP server initialized successfully');
      return true;

    } catch (error) {
      logger.error(`Failed to initialize LSP: ${error}`);
      return false;
    }
  }

  /**
   * Warm up the LSP server by triggering workspace indexing
   * This prevents the first real query from timing out
   * v1.0.197: Added for session-start warm-up
   */
  async warmup(entryFiles?: string[]): Promise<boolean> {
    if (!this.initialized) {
      logger.warn('Cannot warm up - LSP not initialized');
      return false;
    }

    try {
      logger.info('Starting LSP warm-up (workspace indexing)...');
      const startTime = Date.now();

      // 1. First, open at least one file to establish project context
      // TypeScript language server requires a document to be open before workspace queries work
      const filesToOpen = entryFiles && entryFiles.length > 0
        ? entryFiles.slice(0, 5)
        : this.findDefaultEntryFiles();

      logger.debug(`Warm-up: will open ${filesToOpen.length} files: ${filesToOpen.join(', ')}`);

      if (filesToOpen.length === 0) {
        logger.warn('Warm-up: No TypeScript files found to open!');
        return false;
      }

      let firstOpenedUri: string | null = null;
      for (const filePath of filesToOpen) {
        try {
          const uri = `file://${path.resolve(this.config.rootPath, filePath)}`;
          await this.openDocument(filePath, uri);
          if (!firstOpenedUri) firstOpenedUri = uri;
          logger.debug(`Warm-up: opened ${filePath}`);
        } catch (err) {
          logger.debug(`Warm-up: failed to open ${filePath}: ${err}`);
        }
      }

      // 2. Verify project is loaded by sending a hover request on first file
      // This is more reliable than workspace/symbol which requires full project loading
      if (firstOpenedUri) {
        try {
          // Send hover at position (0, 0) - just to trigger project loading
          const hoverResult = await this.sendRequest('textDocument/hover', {
            textDocument: { uri: firstOpenedUri },
            position: { line: 0, character: 0 }
          });
          // If we get here, project is loaded (even if hover returns null)
          this.workspaceIndexed = true;
          logger.debug('Warm-up: hover request succeeded, project is loaded');
        } catch (hoverError) {
          logger.debug(`Warm-up: hover request failed: ${hoverError}`);
          // Try workspace/symbol as fallback
          try {
            await this.sendRequest('workspace/symbol', { query: '' });
            this.workspaceIndexed = true;
          } catch {
            // Even if both fail, mark as indexed since files are open
            this.workspaceIndexed = true;
          }
        }
      } else {
        this.workspaceIndexed = true; // No files to verify, assume OK
      }

      const elapsed = Date.now() - startTime;
      logger.info(`LSP warm-up completed in ${elapsed}ms`);
      return true;

    } catch (error) {
      logger.warn(`LSP warm-up failed (will retry on first query): ${error}`);
      return false;
    }
  }

  /**
   * Find default entry files for warm-up when none specified
   * Searches common patterns and falls back to recursive search
   */
  private findDefaultEntryFiles(): string[] {
    const candidates = [
      'src/index.ts',
      'src/main.ts',
      'src/app.ts',
      'index.ts',
      'main.ts',
      // Common subdirectory patterns
      'src/cli/index.ts',
      'src/core/index.ts',
      'src/lib/index.ts',
    ];

    const found: string[] = [];
    for (const candidate of candidates) {
      const fullPath = path.resolve(this.config.rootPath, candidate);
      if (fs.existsSync(fullPath)) {
        found.push(candidate);
        if (found.length >= 3) break; // Max 3 files
      }
    }

    // Fallback: find .ts files in src/ subdirectories (not just root)
    if (found.length === 0) {
      try {
        const srcDir = path.join(this.config.rootPath, 'src');
        if (fs.existsSync(srcDir)) {
          // Check first-level subdirectories
          const subdirs = fs.readdirSync(srcDir)
            .filter(d => {
              const fullPath = path.join(srcDir, d);
              return fs.statSync(fullPath).isDirectory();
            })
            .slice(0, 5); // Check first 5 subdirs

          for (const subdir of subdirs) {
            const subPath = path.join(srcDir, subdir);
            const files = fs.readdirSync(subPath)
              .filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts') && !f.endsWith('.spec.ts'))
              .slice(0, 2);

            for (const file of files) {
              found.push(`src/${subdir}/${file}`);
              if (found.length >= 3) break;
            }
            if (found.length >= 3) break;
          }
        }
      } catch {
        // Ignore errors
      }
    }

    return found;
  }

  /**
   * Check if workspace has been indexed
   */
  isWarmedUp(): boolean {
    return this.workspaceIndexed;
  }

  /**
   * Handle messages from LSP server
   */
  private handleServerMessage(data: string): void {
    this.buffer += data;

    while (true) {
      const headerEnd = this.buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) break;

      const header = this.buffer.substring(0, headerEnd);
      const contentLengthMatch = header.match(/Content-Length: (\d+)/);

      if (!contentLengthMatch) {
        logger.error('Invalid LSP message header');
        this.buffer = this.buffer.substring(headerEnd + 4);
        continue;
      }

      const contentLength = parseInt(contentLengthMatch[1], 10);
      const messageStart = headerEnd + 4;
      const messageEnd = messageStart + contentLength;

      if (this.buffer.length < messageEnd) {
        // Wait for more data
        break;
      }

      const messageContent = this.buffer.substring(messageStart, messageEnd);
      this.buffer = this.buffer.substring(messageEnd);

      try {
        const message = JSON.parse(messageContent);
        logger.debug(`LSP received: ${message.method || `response id=${message.id}`}`);
        this.handleMessage(message);
      } catch (error) {
        logger.error(`Failed to parse LSP message: ${error}`);
      }
    }
  }

  /**
   * Handle parsed LSP message
   */
  private handleMessage(message: any): void {
    if (message.id && this.responseHandlers.has(message.id)) {
      const handler = this.responseHandlers.get(message.id);
      if (handler) {
        handler(message);
        this.responseHandlers.delete(message.id);
      }
    }
  }

  /** Track timeouts so we can clear them on response */
  private timeouts: Map<number, ReturnType<typeof setTimeout>> = new Map();

  /**
   * Send request to LSP server
   */
  private async sendRequest(method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.serverProcess || !this.serverProcess.stdin) {
        reject(new Error('LSP server not running'));
        return;
      }

      const id = ++this.requestId;
      const request = {
        jsonrpc: '2.0',
        id,
        method,
        params
      };

      const content = JSON.stringify(request);
      const message = `Content-Length: ${content.length}\r\n\r\n${content}`;

      logger.debug(`LSP request id=${id} method=${method}`);

      // Wrap handler to clear timeout on success
      this.responseHandlers.set(id, (response) => {
        const timeout = this.timeouts.get(id);
        if (timeout) {
          clearTimeout(timeout);
          this.timeouts.delete(id);
        }
        logger.debug(`LSP response id=${id} received`);
        if (response.error) {
          reject(new Error(response.error.message));
        } else {
          resolve(response.result);
        }
      });

      // Write and ensure flush
      const written = this.serverProcess.stdin.write(message);
      logger.debug(`LSP request id=${id} written=${written}, pending handlers: ${this.responseHandlers.size}`);

      // Timeout - store so we can clear on success
      const timeoutSecs = Math.round(this.timeoutMs / 1000);
      const timeout = setTimeout(() => {
        if (this.responseHandlers.has(id)) {
          this.responseHandlers.delete(id);
          this.timeouts.delete(id);
          logger.debug(`LSP request id=${id} timed out after ${timeoutSecs}s`);
          reject(new Error('LSP request timeout'));
        }
      }, this.timeoutMs);
      this.timeouts.set(id, timeout);
    });
  }

  /**
   * Send notification to LSP server (no response expected)
   */
  private sendNotification(method: string, params: any): void {
    if (!this.serverProcess || !this.serverProcess.stdin) {
      return;
    }

    const notification = {
      jsonrpc: '2.0',
      method,
      params
    };

    const content = JSON.stringify(notification);
    const message = `Content-Length: ${content.length}\r\n\r\n${content}`;
    this.serverProcess.stdin.write(message);
  }

  /**
   * Go to definition for a symbol at given position
   */
  async goToDefinition(filePath: string, line: number, character: number): Promise<LSPDefinitionResult> {
    if (!this.initialized) {
      return { location: EMPTY_LOCATION, success: false };
    }

    try {
      const uri = `file://${path.resolve(this.config.rootPath, filePath)}`;
      await this.openDocument(filePath, uri);

      const result = await this.sendRequest('textDocument/definition', {
        textDocument: { uri },
        position: { line, character }
      });

      if (!result) {
        return { location: EMPTY_LOCATION, success: false };
      }

      const location = Array.isArray(result) ? result[0] : result;
      return { location, success: true };
    } catch (error) {
      logger.error(`goToDefinition failed: ${error}`);
      return { location: EMPTY_LOCATION, success: false };
    }
  }

  /**
   * Find all references to a symbol at given position
   */
  async findReferences(filePath: string, line: number, character: number): Promise<LSPReferencesResult> {
    if (!this.initialized) {
      return { locations: [], success: false };
    }

    try {
      const uri = `file://${path.resolve(this.config.rootPath, filePath)}`;
      await this.openDocument(filePath, uri);

      const result = await this.sendRequest('textDocument/references', {
        textDocument: { uri },
        position: { line, character },
        context: { includeDeclaration: true }
      });

      if (!result || !Array.isArray(result)) {
        return { locations: [], success: false };
      }

      return { locations: result, success: true };
    } catch (error) {
      logger.error(`findReferences failed: ${error}`);
      return { locations: [], success: false };
    }
  }

  /**
   * Get hover information for a symbol at given position
   */
  async hover(filePath: string, line: number, character: number): Promise<LSPHoverResult> {
    if (!this.initialized) {
      return { contents: '', success: false };
    }

    try {
      const uri = `file://${path.resolve(this.config.rootPath, filePath)}`;
      await this.openDocument(filePath, uri);

      const result = await this.sendRequest('textDocument/hover', {
        textDocument: { uri },
        position: { line, character }
      });

      if (!result) {
        return { contents: '', success: false };
      }

      // Extract contents from hover result
      let contents = '';
      if (typeof result.contents === 'string') {
        contents = result.contents;
      } else if (Array.isArray(result.contents)) {
        contents = result.contents.map((c: any) =>
          typeof c === 'string' ? c : c.value || ''
        ).join('\n');
      } else if (result.contents.value) {
        contents = result.contents.value;
      }

      return { contents, range: result.range, success: true };
    } catch (error) {
      logger.error(`hover failed: ${error}`);
      return { contents: '', success: false };
    }
  }

  /**
   * Get all symbols in a document
   */
  async documentSymbols(filePath: string): Promise<LSPDocumentSymbolsResult> {
    if (!this.initialized) {
      return { symbols: [], success: false };
    }

    try {
      const uri = `file://${path.resolve(this.config.rootPath, filePath)}`;
      await this.openDocument(filePath, uri);

      const result = await this.sendRequest('textDocument/documentSymbol', {
        textDocument: { uri }
      });

      if (!result || !Array.isArray(result)) {
        return { symbols: [], success: false };
      }

      // Convert to LSPSymbolInformation format (handle both flat and hierarchical responses)
      const symbols = this.flattenSymbols(result, uri);
      return { symbols, success: true };
    } catch (error) {
      logger.error(`documentSymbols failed: ${error}`);
      return { symbols: [], success: false };
    }
  }

  /**
   * Flatten hierarchical document symbols into flat list
   */
  private flattenSymbols(symbols: any[], uri: string, containerName?: string): LSPSymbolInformation[] {
    const result: LSPSymbolInformation[] = [];

    for (const symbol of symbols) {
      const location = symbol.location || {
        uri,
        range: symbol.range || symbol.selectionRange
      };

      result.push({
        name: symbol.name,
        kind: symbol.kind,
        location,
        containerName
      });

      // Recurse into children if present (DocumentSymbol format)
      if (symbol.children && Array.isArray(symbol.children)) {
        result.push(...this.flattenSymbols(symbol.children, uri, symbol.name));
      }
    }

    return result;
  }

  /**
   * Search for symbols across workspace
   */
  async workspaceSymbols(query: string): Promise<LSPWorkspaceSymbolsResult> {
    if (!this.initialized) {
      return { symbols: [], success: false };
    }

    try {
      const result = await this.sendRequest('workspace/symbol', {
        query
      });

      if (!result || !Array.isArray(result)) {
        return { symbols: [], success: false };
      }

      return { symbols: result, success: true };
    } catch (error) {
      logger.error(`workspaceSymbols failed: ${error}`);
      return { symbols: [], success: false };
    }
  }

  /**
   * Open a document in the LSP server
   * Tracks already-opened documents to avoid redundant 500ms delays
   * v1.0.197: Performance fix - skip delay for already-open documents
   */
  private async openDocument(filePath: string, uri: string): Promise<void> {
    // Skip if document already opened (avoid redundant 500ms delay)
    if (this.openedDocuments.has(uri)) {
      return;
    }

    const absolutePath = path.resolve(this.config.rootPath, filePath);
    const fileContent = fs.readFileSync(absolutePath, 'utf-8');
    this.sendNotification('textDocument/didOpen', {
      textDocument: { uri, languageId: this.getLanguageId(filePath), version: 1, text: fileContent }
    });

    // Track as opened
    this.openedDocuments.add(uri);

    // Give the LSP server time to parse the document AND load the project
    // TypeScript needs more time to find tsconfig.json and create project
    // 500ms was too short - increased to 2000ms for reliable project loading
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  /**
   * Close a document in the LSP server
   * v1.0.197: Added to prevent memory leaks
   */
  private closeDocument(uri: string): void {
    if (!this.openedDocuments.has(uri)) {
      return;
    }
    this.sendNotification('textDocument/didClose', {
      textDocument: { uri }
    });
    this.openedDocuments.delete(uri);
  }

  /**
   * Get language ID for LSP
   */
  private getLanguageId(filePath: string): string {
    const ext = path.extname(filePath);
    const langMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescriptreact',
      '.js': 'javascript',
      '.jsx': 'javascriptreact',
      '.py': 'python',
      '.go': 'go',
      '.rs': 'rust',
      '.java': 'java',
      '.cs': 'csharp'
    };
    return langMap[ext] || 'plaintext';
  }

  /**
   * Shutdown and cleanup LSP server
   * v1.0.197: Now properly closes all open documents to prevent memory leaks
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) return;

    // Clear all pending timeouts first to avoid keeping process alive
    for (const timeout of this.timeouts.values()) {
      clearTimeout(timeout);
    }
    this.timeouts.clear();
    this.responseHandlers.clear();

    try {
      // Close all open documents first
      for (const uri of this.openedDocuments) {
        this.closeDocument(uri);
      }

      // Send shutdown without timeout handling (we already cleared them)
      this.sendNotification('shutdown', {});
      this.sendNotification('exit', {});
    } catch (error) {
      logger.error(`LSP shutdown failed: ${error}`);
    }

    if (this.serverProcess) {
      this.serverProcess.kill();
      this.serverProcess = null;
    }

    this.initialized = false;
    this.openedDocuments.clear();
    this.workspaceIndexed = false;
    logger.info('LSP server stopped');
  }
}

/**
 * LSP Server Configuration Registry
 * Defines how to detect and launch each language server.
 *
 * Supported: TypeScript, Python, Go, Rust, Java, C#, Kotlin, Swift, PHP, Ruby
 */
interface LSPServerDefinition {
  name: string;
  projectFiles: string[];  // Files that indicate this language is used
  commands: Array<{ cmd: string; args: string[] }>;  // Servers to try in order
}

const LSP_SERVERS: LSPServerDefinition[] = [
  // 1. TypeScript/JavaScript (NOTE: TsServerClient is preferred, this is fallback)
  {
    name: 'typescript',
    projectFiles: ['tsconfig.json', 'jsconfig.json', 'package.json'],
    commands: [
      { cmd: 'typescript-language-server', args: ['--stdio'] },
    ],
  },
  // 2. Python - pyright preferred over pylsp (faster, better types)
  {
    name: 'python',
    projectFiles: ['pyproject.toml', 'setup.py', 'requirements.txt', 'Pipfile', 'setup.cfg'],
    commands: [
      { cmd: 'pyright-langserver', args: ['--stdio'] },
      { cmd: 'pylsp', args: [] },
    ],
  },
  // 3. Go
  {
    name: 'go',
    projectFiles: ['go.mod', 'go.sum'],
    commands: [
      { cmd: 'gopls', args: ['serve'] },
    ],
  },
  // 4. Rust
  {
    name: 'rust',
    projectFiles: ['Cargo.toml', 'Cargo.lock'],
    commands: [
      { cmd: 'rust-analyzer', args: [] },
    ],
  },
  // 5. Java
  {
    name: 'java',
    projectFiles: ['pom.xml', 'build.gradle', 'build.gradle.kts', 'settings.gradle'],
    commands: [
      { cmd: 'jdtls', args: [] },
    ],
  },
  // 6. C# / .NET
  {
    name: 'csharp',
    projectFiles: ['*.csproj', '*.sln', 'Directory.Build.props'],
    commands: [
      { cmd: 'csharp-ls', args: [] },
      { cmd: 'OmniSharp', args: ['-lsp'] },
    ],
  },
  // 7. Kotlin
  {
    name: 'kotlin',
    projectFiles: ['build.gradle.kts', '*.kt'],
    commands: [
      { cmd: 'kotlin-language-server', args: [] },
    ],
  },
  // 8. Swift
  {
    name: 'swift',
    projectFiles: ['Package.swift', '*.xcodeproj', '*.xcworkspace'],
    commands: [
      { cmd: 'sourcekit-lsp', args: [] },
    ],
  },
  // 9. PHP
  {
    name: 'php',
    projectFiles: ['composer.json', 'composer.lock', '*.php'],
    commands: [
      { cmd: 'intelephense', args: ['--stdio'] },
      { cmd: 'phpactor', args: ['language-server'] },
    ],
  },
  // 10. Ruby
  {
    name: 'ruby',
    projectFiles: ['Gemfile', 'Gemfile.lock', '*.gemspec'],
    commands: [
      { cmd: 'solargraph', args: ['stdio'] },
    ],
  },
];

/**
 * Check if a command is available in PATH
 */
async function isCommandAvailable(command: string): Promise<boolean> {
  try {
    const { execSync } = await import('child_process');
    const whichCmd = process.platform === 'win32' ? 'where' : 'which';
    execSync(`${whichCmd} ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if project has any of the specified files (supports glob patterns)
 */
function hasProjectFiles(projectRoot: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    if (pattern.includes('*')) {
      // Glob pattern - check if any matching files exist
      const dir = fs.readdirSync(projectRoot).filter(f =>
        f.match(new RegExp(pattern.replace('*', '.*')))
      );
      if (dir.length > 0) return true;
    } else {
      // Exact file
      if (fs.existsSync(path.join(projectRoot, pattern))) return true;
    }
  }
  return false;
}

/**
 * Detect available LSP servers for a project
 *
 * Supports 10 languages: TypeScript, Python, Go, Rust, Java, C#, Kotlin, Swift, PHP, Ruby
 * For each language, tries multiple server implementations in priority order.
 */
export async function detectLSPServers(projectRoot: string): Promise<LSPServerConfig[]> {
  const servers: LSPServerConfig[] = [];

  for (const serverDef of LSP_SERVERS) {
    // Check if project uses this language
    if (!hasProjectFiles(projectRoot, serverDef.projectFiles)) {
      continue;
    }

    // Try each command in priority order
    for (const { cmd, args } of serverDef.commands) {
      if (await isCommandAvailable(cmd)) {
        servers.push({
          command: cmd,
          args,
          rootPath: projectRoot,
        });
        logger.debug(`Found ${serverDef.name} LSP server: ${cmd}`);
        break; // Use first available
      }
    }

    if (!servers.find(s => s.command.includes(serverDef.name))) {
      logger.debug(`No LSP server found for ${serverDef.name}`);
    }
  }

  return servers;
}
