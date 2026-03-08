#!/usr/bin/env node

/**
 * Command Bridge for SpecWeave HTTP Hook Server
 *
 * Reads hook event payload from stdin, POSTs to the dashboard server's
 * HTTP hook endpoint. Used for the 9 command-only events that Claude Code
 * cannot send via HTTP natively.
 *
 * Usage: echo '{"sessionId":"..."}' | node command-bridge.mjs EventName
 *
 * For SessionStart events, auto-starts the dashboard server if not running.
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as net from 'net';
import { spawn } from 'child_process';

const eventName = process.argv[2];
if (!eventName) {
  process.exit(0);
}

// Find project root by walking up from cwd looking for .specweave/
function findProjectRoot() {
  let dir = process.cwd();
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, '.specweave'))) return dir;
    dir = path.dirname(dir);
  }
  return process.cwd();
}

const projectRoot = findProjectRoot();
const pidFilePath = path.join(projectRoot, '.specweave', 'state', 'hooks', 'server.pid');

function readPidFile() {
  try {
    const content = fs.readFileSync(pidFilePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1', timeout: 200 });
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('error', () => { resolve(false); });
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
  });
}

function postToServer(port, payload) {
  return new Promise((resolve) => {
    const data = JSON.stringify(payload);
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: `/api/hooks/${eventName}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      timeout: 2000,
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        if (body) process.stdout.write(body);
        resolve();
      });
    });
    req.on('error', () => resolve());
    req.on('timeout', () => { req.destroy(); resolve(); });
    req.end(data);
  });
}

function waitForPidFile(timeoutMs) {
  const start = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      const pid = readPidFile();
      if (pid) return resolve(pid);
      if (Date.now() - start > timeoutMs) return resolve(null);
      setTimeout(check, 200);
    };
    check();
  });
}

async function autoStartServer() {
  try {
    const child = spawn('specweave', ['dashboard', '--hooks'], {
      detached: true,
      stdio: 'ignore',
      env: { ...process.env },
    });
    child.unref();
    return waitForPidFile(3000);
  } catch {
    return null;
  }
}

async function main() {
  try {
    // Read stdin
    let input = '';
    process.stdin.setEncoding('utf-8');
    for await (const chunk of process.stdin) {
      input += chunk;
    }

    let payload;
    try {
      payload = JSON.parse(input);
    } catch {
      payload = {};
    }

    // Check if server is running
    let pidData = readPidFile();

    if (pidData) {
      const alive = await isPortOpen(pidData.port);
      if (alive) {
        await postToServer(pidData.port, payload);
        process.exit(0);
      }
      // Stale PID file
      pidData = null;
    }

    // Auto-start for SessionStart event
    if (eventName === 'SessionStart' && !pidData) {
      pidData = await autoStartServer();
      if (pidData) {
        await postToServer(pidData.port, payload);
      }
    }

    process.exit(0);
  } catch {
    process.exit(0);
  }
}

main();
