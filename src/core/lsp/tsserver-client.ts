/**
 * Direct TypeScript Server Client
 *
 * Uses tsserver's native protocol instead of LSP wrappers.
 * This bypasses typescript-language-server which has issues with large projects.
 *
 * @module core/lsp/tsserver-client
 */

import { spawn, execSync, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { consoleLogger as logger } from '../../utils/logger.js';
import type {
  LSPLocation,
  LSPHoverResult,
  LSPReferencesResult,
  LSPDefinitionResult,
  LSPDocumentSymbolsResult,
  LSPWorkspaceSymbolsResult,
  LSPSymbolInformation,
} from './lsp-client.js';

interface TsServerRequest {
  seq: number;
  type: 'request';
  command: string;
  arguments?: Record<string, unknown>;
}

interface TsServerResponse {
  seq: number;
  type: 'response';
  command: string;
  request_seq: number;
  success: boolean;
  message?: string;
  body?: unknown;
}

interface TsServerEvent {
  seq: number;
  type: 'event';
  event: string;
  body?: unknown;
}

type TsServerMessage = TsServerResponse | TsServerEvent;

/** Default request timeout in milliseconds */
const DEFAULT_TIMEOUT_MS = 60000;

/** Options for TsServerClient */
export interface TsServerClientOptions {
  /** Request timeout in milliseconds (default: 60000) */
  timeoutMs?: number;
}

/**
 * Direct tsserver client - works with large TypeScript projects
 * where typescript-language-server times out
 */
export class TsServerClient {
  private serverProcess: ChildProcess | null = null;
  private seq = 0;
  private projectRoot: string;
  private initialized = false;
  private responseHandlers: Map<number, (response: TsServerResponse) => void> = new Map();
  private buffer = '';
  private openedFiles: Set<string> = new Set();
  private projectLoaded = false;
  /** Request timeout in milliseconds */
  private readonly timeoutMs: number;

  constructor(projectRoot: string, options: TsServerClientOptions = {}) {
    this.projectRoot = projectRoot;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /**
   * Initialize the tsserver process
   */
  async initialize(): Promise<boolean> {
    try {
      const tsserverPath = this.findTsServerPath();
      if (!tsserverPath) {
        logger.error('tsserver not found');
        return false;
      }

      logger.debug(`Starting tsserver: ${tsserverPath}`);

      this.serverProcess = spawn('node', [tsserverPath, '--stdio'], {
        cwd: this.projectRoot,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      if (!this.serverProcess.stdout || !this.serverProcess.stdin) {
        logger.error('Failed to create tsserver process');
        return false;
      }

      this.serverProcess.stdout.on('data', (data: Buffer) => {
        this.handleOutput(data.toString());
      });

      this.serverProcess.stderr?.on('data', (data: Buffer) => {
        logger.debug(`[tsserver stderr] ${data.toString().trim()}`);
      });

      this.serverProcess.on('error', (err) => {
        logger.error(`tsserver error: ${err}`);
      });

      // Configure tsserver
      await this.sendRequest('configure', {
        preferences: {
          lazyConfiguredProjectsFromExternalProject: true,
        },
      });

      this.initialized = true;
      logger.info('tsserver initialized successfully');
      return true;
    } catch (error) {
      logger.error(`Failed to initialize tsserver: ${error}`);
      return false;
    }
  }

  /**
   * Find tsserver path in project or globally
   */
  private findTsServerPath(): string | null {
    // Try project-local first
    const localPath = path.join(this.projectRoot, 'node_modules/typescript/lib/tsserver.js');
    if (fs.existsSync(localPath)) {
      return localPath;
    }

    // Try to find global typescript
    try {
      const tsPath = execSync('which tsc', { encoding: 'utf-8' }).trim();
      const tsserverPath = path.join(path.dirname(tsPath), '../lib/node_modules/typescript/lib/tsserver.js');
      if (fs.existsSync(tsserverPath)) {
        return tsserverPath;
      }
    } catch {
      // Ignore
    }

    return null;
  }

  /**
   * Handle output from tsserver
   */
  private handleOutput(data: string): void {
    this.buffer += data;

    // tsserver uses line-delimited JSON
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('{')) continue;

      try {
        const msg = JSON.parse(trimmed) as TsServerMessage;

        if (msg.type === 'response') {
          const handler = this.responseHandlers.get(msg.request_seq);
          if (handler) {
            handler(msg as TsServerResponse);
            this.responseHandlers.delete(msg.request_seq);
          }
        } else if (msg.type === 'event') {
          this.handleEvent(msg as TsServerEvent);
        }
      } catch (e) {
        logger.debug(`Failed to parse tsserver output: ${trimmed.substring(0, 100)}`);
      }
    }
  }

  /**
   * Handle tsserver events
   */
  private handleEvent(event: TsServerEvent): void {
    if (event.event === 'projectLoadingFinish') {
      this.projectLoaded = true;
      logger.debug('tsserver: project loading finished');
    } else if (event.event === 'projectLoadingStart') {
      logger.debug('tsserver: project loading started');
    }
  }

  /** Track timeouts so we can clear them on response */
  private timeouts: Map<number, ReturnType<typeof setTimeout>> = new Map();

  /**
   * Send request to tsserver
   */
  private sendRequest(command: string, args?: Record<string, unknown>): Promise<TsServerResponse> {
    return new Promise((resolve, reject) => {
      if (!this.serverProcess?.stdin) {
        reject(new Error('tsserver not running'));
        return;
      }

      const seq = ++this.seq;
      const request: TsServerRequest = {
        seq,
        type: 'request',
        command,
        arguments: args,
      };

      // Wrap resolve to clear timeout when response received
      this.responseHandlers.set(seq, (response) => {
        const timeout = this.timeouts.get(seq);
        if (timeout) {
          clearTimeout(timeout);
          this.timeouts.delete(seq);
        }
        resolve(response);
      });

      const json = JSON.stringify(request);
      this.serverProcess.stdin.write(json + '\n');

      // Timeout - store so we can clear on success
      const timeout = setTimeout(() => {
        if (this.responseHandlers.has(seq)) {
          this.responseHandlers.delete(seq);
          this.timeouts.delete(seq);
          reject(new Error(`tsserver request timeout: ${command}`));
        }
      }, this.timeoutMs);
      this.timeouts.set(seq, timeout);
    });
  }

  /**
   * Open a file in tsserver
   */
  private async openFile(filePath: string): Promise<void> {
    const absolutePath = path.resolve(this.projectRoot, filePath);
    if (this.openedFiles.has(absolutePath)) return;

    await this.sendRequest('open', {
      file: absolutePath,
      scriptKindName: this.getScriptKind(filePath),
    });

    this.openedFiles.add(absolutePath);

    // Wait briefly for project to load on first file
    if (!this.projectLoaded) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  /**
   * Get script kind for file
   */
  private getScriptKind(filePath: string): string {
    const ext = path.extname(filePath);
    switch (ext) {
      case '.ts':
        return 'TS';
      case '.tsx':
        return 'TSX';
      case '.js':
        return 'JS';
      case '.jsx':
        return 'JSX';
      default:
        return 'TS';
    }
  }

  /**
   * Warm up by opening a file and waiting for project load
   */
  async warmup(entryFiles?: string[]): Promise<boolean> {
    if (!this.initialized) return false;

    try {
      const files = entryFiles?.length ? entryFiles : this.findEntryFiles();
      if (files.length === 0) {
        logger.warn('No entry files found for warmup');
        return false;
      }

      logger.info(`tsserver warmup: opening ${files.length} files...`);
      const startTime = Date.now();

      for (const file of files.slice(0, 3)) {
        await this.openFile(file);
      }

      // Wait for project to fully load
      let attempts = 0;
      while (!this.projectLoaded && attempts < 20) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        attempts++;
      }

      const elapsed = Date.now() - startTime;
      logger.info(`tsserver warmup completed in ${elapsed}ms`);
      return true;
    } catch (error) {
      logger.warn(`tsserver warmup failed: ${error}`);
      return false;
    }
  }

  /**
   * Find default entry files
   */
  private findEntryFiles(): string[] {
    const candidates = [
      'src/index.ts',
      'src/main.ts',
      'src/app.ts',
      'index.ts',
      'src/cli/index.ts',
      'src/core/index.ts',
    ];

    const found: string[] = [];
    for (const candidate of candidates) {
      const fullPath = path.resolve(this.projectRoot, candidate);
      if (fs.existsSync(fullPath)) {
        found.push(candidate);
        if (found.length >= 3) break;
      }
    }

    // Fallback: find files in src subdirectories
    if (found.length === 0) {
      const srcDir = path.join(this.projectRoot, 'src');
      if (fs.existsSync(srcDir)) {
        const subdirs = fs
          .readdirSync(srcDir)
          .filter((d) => fs.statSync(path.join(srcDir, d)).isDirectory())
          .slice(0, 3);

        for (const subdir of subdirs) {
          const files = fs
            .readdirSync(path.join(srcDir, subdir))
            .filter((f) => f.endsWith('.ts') && !f.includes('.test.'))
            .slice(0, 1);
          for (const file of files) {
            found.push(`src/${subdir}/${file}`);
          }
        }
      }
    }

    return found;
  }

  /**
   * Check if warmed up
   */
  isWarmedUp(): boolean {
    return this.projectLoaded;
  }

  /**
   * Get hover info (quick info)
   */
  async hover(filePath: string, line: number, character: number): Promise<LSPHoverResult> {
    if (!this.initialized) return { contents: '', success: false };

    try {
      await this.openFile(filePath);
      const absolutePath = path.resolve(this.projectRoot, filePath);

      const response = await this.sendRequest('quickinfo', {
        file: absolutePath,
        line: line + 1, // tsserver uses 1-based lines
        offset: character + 1,
      });

      if (!response.success || !response.body) {
        return { contents: '', success: false };
      }

      const body = response.body as { displayString?: string; documentation?: string; kind?: string };
      const contents = [body.displayString || '', body.documentation || ''].filter(Boolean).join('\n\n');

      return { contents, success: true };
    } catch (error) {
      logger.error(`hover failed: ${error}`);
      return { contents: '', success: false };
    }
  }

  /**
   * Go to definition
   */
  async goToDefinition(filePath: string, line: number, character: number): Promise<LSPDefinitionResult> {
    const emptyLocation: LSPLocation = {
      uri: '',
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
    };

    if (!this.initialized) return { location: emptyLocation, success: false };

    try {
      await this.openFile(filePath);
      const absolutePath = path.resolve(this.projectRoot, filePath);

      const response = await this.sendRequest('definition', {
        file: absolutePath,
        line: line + 1,
        offset: character + 1,
      });

      if (!response.success || !response.body || !Array.isArray(response.body) || response.body.length === 0) {
        return { location: emptyLocation, success: false };
      }

      const def = response.body[0] as { file: string; start: { line: number; offset: number }; end: { line: number; offset: number } };

      return {
        location: {
          uri: `file://${def.file}`,
          range: {
            start: { line: def.start.line - 1, character: def.start.offset - 1 },
            end: { line: def.end.line - 1, character: def.end.offset - 1 },
          },
        },
        success: true,
      };
    } catch (error) {
      logger.error(`goToDefinition failed: ${error}`);
      return { location: emptyLocation, success: false };
    }
  }

  /**
   * Find all references
   */
  async findReferences(filePath: string, line: number, character: number): Promise<LSPReferencesResult> {
    if (!this.initialized) return { locations: [], success: false };

    try {
      await this.openFile(filePath);
      const absolutePath = path.resolve(this.projectRoot, filePath);

      const response = await this.sendRequest('references', {
        file: absolutePath,
        line: line + 1,
        offset: character + 1,
      });

      if (!response.success || !response.body) {
        return { locations: [], success: false };
      }

      const body = response.body as { refs?: Array<{ file: string; start: { line: number; offset: number }; end: { line: number; offset: number } }> };
      const refs = body.refs || [];

      const locations: LSPLocation[] = refs.map((ref) => ({
        uri: `file://${ref.file}`,
        range: {
          start: { line: ref.start.line - 1, character: ref.start.offset - 1 },
          end: { line: ref.end.line - 1, character: ref.end.offset - 1 },
        },
      }));

      return { locations, success: true };
    } catch (error) {
      logger.error(`findReferences failed: ${error}`);
      return { locations: [], success: false };
    }
  }

  /**
   * Get document symbols
   */
  async documentSymbols(filePath: string): Promise<LSPDocumentSymbolsResult> {
    if (!this.initialized) return { symbols: [], success: false };

    try {
      await this.openFile(filePath);
      const absolutePath = path.resolve(this.projectRoot, filePath);

      const response = await this.sendRequest('navtree', {
        file: absolutePath,
      });

      if (!response.success || !response.body) {
        return { symbols: [], success: false };
      }

      const symbols = this.flattenNavTree(response.body as NavTreeItem, `file://${absolutePath}`);
      return { symbols, success: true };
    } catch (error) {
      logger.error(`documentSymbols failed: ${error}`);
      return { symbols: [], success: false };
    }
  }

  /**
   * Flatten navigation tree into symbols
   */
  private flattenNavTree(item: NavTreeItem, uri: string, containerName?: string): LSPSymbolInformation[] {
    const symbols: LSPSymbolInformation[] = [];

    if (item.text && item.spans && item.spans.length > 0) {
      const span = item.spans[0];
      symbols.push({
        name: item.text,
        kind: this.mapSymbolKind(item.kind),
        location: {
          uri,
          range: {
            start: { line: span.start.line - 1, character: span.start.offset - 1 },
            end: { line: span.end.line - 1, character: span.end.offset - 1 },
          },
        },
        containerName,
      });
    }

    if (item.childItems) {
      for (const child of item.childItems) {
        symbols.push(...this.flattenNavTree(child, uri, item.text));
      }
    }

    return symbols;
  }

  /**
   * Map tsserver kind to LSP kind
   */
  private mapSymbolKind(kind: string): number {
    const kindMap: Record<string, number> = {
      class: 5,
      interface: 11,
      function: 12,
      method: 6,
      property: 7,
      variable: 13,
      const: 14,
      enum: 10,
      module: 2,
      type: 11,
    };
    return kindMap[kind] || 13; // Default to variable
  }

  /**
   * Search workspace for symbols
   */
  async workspaceSymbols(query: string): Promise<LSPWorkspaceSymbolsResult> {
    if (!this.initialized) return { symbols: [], success: false };

    try {
      const response = await this.sendRequest('navto', {
        searchValue: query,
        maxResultCount: 100,
      });

      if (!response.success || !response.body || !Array.isArray(response.body)) {
        return { symbols: [], success: false };
      }

      const symbols: LSPSymbolInformation[] = response.body.map((item: NavToItem) => ({
        name: item.name,
        kind: this.mapSymbolKind(item.kind),
        location: {
          uri: `file://${item.file}`,
          range: {
            start: { line: item.start.line - 1, character: item.start.offset - 1 },
            end: { line: item.end.line - 1, character: item.end.offset - 1 },
          },
        },
        containerName: item.containerName,
      }));

      return { symbols, success: true };
    } catch (error) {
      logger.error(`workspaceSymbols failed: ${error}`);
      return { symbols: [], success: false };
    }
  }

  /**
   * Shutdown the server
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
      // Close all open files
      for (const file of this.openedFiles) {
        // Send close without waiting (no timeout needed during shutdown)
        this.serverProcess?.stdin?.write(
          JSON.stringify({ seq: ++this.seq, type: 'request', command: 'close', arguments: { file } }) + '\n'
        );
      }

      // Exit
      this.serverProcess?.stdin?.write(JSON.stringify({ seq: ++this.seq, type: 'request', command: 'exit' }) + '\n');
    } catch (error) {
      logger.debug(`tsserver shutdown error: ${error}`);
    }

    if (this.serverProcess) {
      this.serverProcess.kill();
      this.serverProcess = null;
    }

    this.initialized = false;
    this.openedFiles.clear();
    this.projectLoaded = false;
    logger.info('tsserver stopped');
  }
}

interface NavTreeItem {
  text: string;
  kind: string;
  spans?: Array<{ start: { line: number; offset: number }; end: { line: number; offset: number } }>;
  childItems?: NavTreeItem[];
}

interface NavToItem {
  name: string;
  kind: string;
  file: string;
  start: { line: number; offset: number };
  end: { line: number; offset: number };
  containerName?: string;
}
