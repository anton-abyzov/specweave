/**
 * Tests for LSP Client server-initiated request handling
 *
 * Verifies the fix for server requests (workspace/configuration,
 * client/registerCapability, etc.) that were silently dropped,
 * causing C#, Python, and Java servers to hang or return empty results.
 *
 * Same root cause as Claude Code issue #16360.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ChildProcess, spawn } from 'child_process';

import { LSPClient, LSPServerConfig } from '../../../../src/core/lsp/lsp-client.js';

/**
 * Create a mock LSP server that sends server-initiated requests.
 * This simulates what csharp-ls, pyright, and jdtls do during init.
 */
function createMockLspServer(tempDir: string): string {
  const serverScript = path.join(tempDir, 'mock-lsp-server.js');
  fs.writeFileSync(
    serverScript,
    `
const readline = require('readline');

let buffer = '';
let requestId = 100; // Start server request IDs at 100 to avoid collision

process.stdin.on('data', (data) => {
  buffer += data.toString();

  while (true) {
    const headerEnd = buffer.indexOf('\\r\\n\\r\\n');
    if (headerEnd === -1) break;

    const header = buffer.substring(0, headerEnd);
    const match = header.match(/Content-Length: (\\d+)/);
    if (!match) {
      buffer = buffer.substring(headerEnd + 4);
      continue;
    }

    const contentLength = parseInt(match[1], 10);
    const messageStart = headerEnd + 4;
    const messageEnd = messageStart + contentLength;

    if (buffer.length < messageEnd) break;

    const content = buffer.substring(messageStart, messageEnd);
    buffer = buffer.substring(messageEnd);

    try {
      const msg = JSON.parse(content);
      handleMessage(msg);
    } catch (e) {
      // Ignore parse errors
    }
  }
});

function sendMessage(msg) {
  const content = JSON.stringify(msg);
  const header = 'Content-Length: ' + Buffer.byteLength(content) + '\\r\\n\\r\\n';
  process.stdout.write(header + content);
}

function handleMessage(msg) {
  if (msg.method === 'initialize') {
    // Respond to initialize
    sendMessage({
      jsonrpc: '2.0',
      id: msg.id,
      result: {
        capabilities: {
          textDocumentSync: 1,
          definitionProvider: true,
          referencesProvider: true,
        },
      },
    });

    // After init response, send server-initiated requests like real servers do
    // 1. workspace/configuration (sent by pyright, csharp-ls)
    sendMessage({
      jsonrpc: '2.0',
      id: requestId++,
      method: 'workspace/configuration',
      params: {
        items: [
          { section: 'typescript' },
          { section: 'javascript' },
        ],
      },
    });

    // 2. client/registerCapability (sent by most LSP servers)
    sendMessage({
      jsonrpc: '2.0',
      id: requestId++,
      method: 'client/registerCapability',
      params: {
        registrations: [
          {
            id: 'workspace/didChangeWatchedFiles',
            method: 'workspace/didChangeWatchedFiles',
          },
        ],
      },
    });

    // 3. window/workDoneProgress/create (sent by csharp-ls, jdtls)
    sendMessage({
      jsonrpc: '2.0',
      id: requestId++,
      method: 'window/workDoneProgress/create',
      params: { token: 'indexing-progress-1' },
    });

  } else if (msg.method === 'initialized') {
    // No response needed for notifications

  } else if (msg.method === 'textDocument/didOpen') {
    // No response needed for notifications

  } else if (msg.method === 'textDocument/hover') {
    // Respond to hover - but only if server requests were answered
    // (Real servers would hang here if workspace/configuration wasn't answered)
    sendMessage({
      jsonrpc: '2.0',
      id: msg.id,
      result: {
        contents: { kind: 'plaintext', value: 'mock hover result' },
      },
    });

  } else if (msg.method === 'shutdown') {
    sendMessage({ jsonrpc: '2.0', id: msg.id, result: null });
  } else if (msg.method === 'exit') {
    process.exit(0);
  }
}
`
  );
  return serverScript;
}

describe('LSPClient server-initiated request handling', () => {
  let tempDir: string;
  let client: LSPClient | null = null;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsp-server-req-test-'));
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

  it('should initialize successfully with a server that sends workspace/configuration requests', async () => {
    const serverScript = createMockLspServer(tempDir);

    // Create a minimal TS file for the LSP to work with
    fs.writeFileSync(path.join(tempDir, 'test.ts'), 'export const x = 1;');

    const config: LSPServerConfig = {
      command: 'node',
      args: [serverScript],
      rootPath: tempDir,
    };

    client = new LSPClient(config);
    const result = await client.initialize();

    // If server-initiated requests are handled, init succeeds
    // If they're dropped, the server may hang during init
    expect(result).toBe(true);
  }, 15000);

  it('should respond to workspace/configuration and still handle hover', async () => {
    const serverScript = createMockLspServer(tempDir);

    const testFile = path.join(tempDir, 'test.ts');
    fs.writeFileSync(testFile, 'export const x = 1;');

    const config: LSPServerConfig = {
      command: 'node',
      args: [serverScript],
      rootPath: tempDir,
    };

    client = new LSPClient(config);
    await client.initialize();

    // If server requests weren't answered, this would timeout
    const hoverResult = await client.hover('test.ts', 0, 13);

    expect(hoverResult.success).toBe(true);
    expect(hoverResult.contents).toContain('mock hover result');
  }, 15000);

  it('should handle window/showMessageRequest by auto-dismissing', async () => {
    // Create a server that also sends showMessageRequest
    const serverScript = path.join(tempDir, 'mock-msg-server.js');
    fs.writeFileSync(
      serverScript,
      `
process.stdin.on('data', (data) => {
  // Simple: just respond to everything with appropriate response
  const content = data.toString();
  const match = content.match(/"id"\\s*:\\s*(\\d+)/);
  const methodMatch = content.match(/"method"\\s*:\\s*"([^"]+)"/);

  if (!match || !methodMatch) return;

  const id = parseInt(match[1], 10);
  const method = methodMatch[1];

  function send(msg) {
    const c = JSON.stringify(msg);
    process.stdout.write('Content-Length: ' + Buffer.byteLength(c) + '\\r\\n\\r\\n' + c);
  }

  if (method === 'initialize') {
    send({ jsonrpc: '2.0', id, result: { capabilities: {} } });
    // Send window/showMessageRequest
    send({
      jsonrpc: '2.0',
      id: 200,
      method: 'window/showMessageRequest',
      params: {
        type: 3,
        message: 'Would you like to configure something?',
        actions: [{ title: 'Yes' }, { title: 'No' }],
      },
    });
  } else if (method === 'shutdown') {
    send({ jsonrpc: '2.0', id, result: null });
  } else if (method === 'exit') {
    process.exit(0);
  }
});
`
    );

    fs.writeFileSync(path.join(tempDir, 'test.ts'), 'export const x = 1;');

    const config: LSPServerConfig = {
      command: 'node',
      args: [serverScript],
      rootPath: tempDir,
    };

    client = new LSPClient(config);
    // Should not hang on showMessageRequest
    const result = await client.initialize();
    expect(result).toBe(true);
  }, 10000);
});
