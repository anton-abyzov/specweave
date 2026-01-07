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

export interface LSPServerConfig {
  command: string;
  args: string[];
  rootPath: string;
}

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

  constructor(config: LSPServerConfig) {
    this.config = config;
  }

  /**
   * Initialize the LSP server
   */
  async initialize(): Promise<boolean> {
    try {
      logger.debug(`Starting LSP server: ${this.config.command} ${this.config.args.join(' ')}`);

      this.serverProcess = spawn(this.config.command, this.config.args, {
        cwd: this.config.rootPath,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      if (!this.serverProcess || !this.serverProcess.stdout || !this.serverProcess.stdin) {
        logger.error('Failed to create LSP server process');
        return false;
      }

      // Handle stdout
      this.serverProcess.stdout.on('data', (data: Buffer) => {
        this.handleServerMessage(data.toString());
      });

      // Handle stderr
      this.serverProcess.stderr?.on('data', (data: Buffer) => {
        logger.debug(`LSP stderr: ${data.toString()}`);
      });

      // Send initialize request
      const initializeResult = await this.sendRequest('initialize', {
        processId: process.pid,
        rootUri: `file://${this.config.rootPath}`,
        capabilities: {
          textDocument: {
            definition: { dynamicRegistration: true },
            references: { dynamicRegistration: true },
            hover: { dynamicRegistration: true }
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

      this.responseHandlers.set(id, (response) => {
        if (response.error) {
          reject(new Error(response.error.message));
        } else {
          resolve(response.result);
        }
      });

      this.serverProcess.stdin.write(message);

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.responseHandlers.has(id)) {
          this.responseHandlers.delete(id);
          reject(new Error('LSP request timeout'));
        }
      }, 10000);
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
      return { location: { uri: '', range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } } }, success: false };
    }

    try {
      const uri = `file://${path.resolve(this.config.rootPath, filePath)}`;

      // Open document
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      this.sendNotification('textDocument/didOpen', {
        textDocument: {
          uri,
          languageId: this.getLanguageId(filePath),
          version: 1,
          text: fileContent
        }
      });

      // Request definition
      const result = await this.sendRequest('textDocument/definition', {
        textDocument: { uri },
        position: { line, character }
      });

      if (!result) {
        return { location: { uri: '', range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } } }, success: false };
      }

      const location = Array.isArray(result) ? result[0] : result;
      return { location, success: true };

    } catch (error) {
      logger.error(`goToDefinition failed: ${error}`);
      return { location: { uri: '', range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } } }, success: false };
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

      // Open document if not already open
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      this.sendNotification('textDocument/didOpen', {
        textDocument: {
          uri,
          languageId: this.getLanguageId(filePath),
          version: 1,
          text: fileContent
        }
      });

      // Request references
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
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) return;

    try {
      await this.sendRequest('shutdown', {});
      this.sendNotification('exit', {});
    } catch (error) {
      logger.error(`LSP shutdown failed: ${error}`);
    }

    if (this.serverProcess) {
      this.serverProcess.kill();
      this.serverProcess = null;
    }

    this.initialized = false;
    logger.info('LSP server stopped');
  }
}

/**
 * Detect available LSP servers for a project
 */
export async function detectLSPServers(projectRoot: string): Promise<LSPServerConfig[]> {
  const servers: LSPServerConfig[] = [];

  // Check for TypeScript/JavaScript
  if (fs.existsSync(path.join(projectRoot, 'tsconfig.json')) ||
      fs.existsSync(path.join(projectRoot, 'package.json'))) {
    try {
      // Check if typescript-language-server is available
      const { execSync } = await import('child_process');
      execSync('which typescript-language-server', { stdio: 'ignore' });
      servers.push({
        command: 'typescript-language-server',
        args: ['--stdio'],
        rootPath: projectRoot
      });
    } catch {
      logger.debug('typescript-language-server not found');
    }
  }

  // Check for Python
  if (fs.existsSync(path.join(projectRoot, 'setup.py')) ||
      fs.existsSync(path.join(projectRoot, 'pyproject.toml')) ||
      fs.existsSync(path.join(projectRoot, 'requirements.txt'))) {
    try {
      const { execSync } = await import('child_process');
      execSync('which pylsp', { stdio: 'ignore' });
      servers.push({
        command: 'pylsp',
        args: [],
        rootPath: projectRoot
      });
    } catch {
      logger.debug('pylsp not found');
    }
  }

  return servers;
}
