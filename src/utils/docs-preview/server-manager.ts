/**
 * Server manager for Docusaurus dev server
 * Handles port finding, server start/stop, browser opening
 */

import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';
import { execFileNoThrow } from '../execFileNoThrow.js';
import { ServerOptions, ServerProcess } from './types.js';

/**
 * Find an available port in the given range
 */
export async function findAvailablePort(startPort: number = 3000, endPort: number = 3010): Promise<number> {
  for (let port = startPort; port <= endPort; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }

  throw new Error(`No available ports found in range ${startPort}-${endPort}`);
}

/**
 * Check if a port is available
 */
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => {
      resolve(false);
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(port);
  });
}

/**
 * Start Docusaurus dev server
 */
export async function startDevServer(targetDir: string, options: ServerOptions): Promise<ServerProcess> {
  const { port, openBrowser, host = 'localhost' } = options;

  // Check if port is available
  if (!await isPortAvailable(port)) {
    throw new Error(`Port ${port} is already in use`);
  }

  // Start Docusaurus dev server
  const process = spawn('npm', ['run', 'start', '--', '--port', port.toString(), '--host', host], {
    cwd: targetDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true
  });

  const url = `http://${host}:${port}`;

  // Wait for server to be ready
  await waitForServer(url, 30000); // 30 second timeout

  // Open browser if requested
  if (openBrowser) {
    await openBrowserUrl(url);
  }

  return {
    pid: process.pid!,
    port,
    url,
    stop: async () => {
      await stopServer(process);
    }
  };
}

/**
 * Wait for server to be ready
 */
function waitForServer(url: string, timeout: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const check = async () => {
      try {
        const http = await import('http');
        const urlObj = new URL(url);

        const req = http.get(
          {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname,
            timeout: 2000
          },
          (res) => {
            if (res.statusCode === 200 || res.statusCode === 304) {
              resolve();
            } else {
              scheduleNextCheck();
            }
          }
        );

        req.on('error', () => {
          scheduleNextCheck();
        });

        req.on('timeout', () => {
          req.destroy();
          scheduleNextCheck();
        });
      } catch {
        scheduleNextCheck();
      }
    };

    const scheduleNextCheck = () => {
      if (Date.now() - startTime > timeout) {
        reject(new Error(`Server failed to start within ${timeout}ms`));
      } else {
        setTimeout(check, 1000);
      }
    };

    check();
  });
}

/**
 * Stop server process
 */
function stopServer(process: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (!process.pid) {
      resolve();
      return;
    }

    process.once('exit', () => {
      resolve();
    });

    // Try graceful shutdown first
    process.kill('SIGTERM');

    // Force kill after 5 seconds if still running
    setTimeout(() => {
      if (process.pid) {
        process.kill('SIGKILL');
      }
    }, 5000);
  });
}

/**
 * Open URL in default browser
 */
export async function openBrowserUrl(url: string): Promise<void> {
  try {
    const open = (await import('open')).default;
    await open(url);
  } catch (error) {
    console.warn('Could not open browser automatically. Please open manually:', url);
  }
}

/**
 * Kill all Docusaurus processes (SAFE - uses execFileNoThrow)
 */
export async function killAllDocusaurusProcesses(): Promise<number> {
  const platform = process.platform;

  try {
    if (platform === 'win32') {
      // Windows: Use tasklist and taskkill
      const listResult = await execFileNoThrow('tasklist', ['/FI', 'IMAGENAME eq node.exe', '/FO', 'CSV']);

      if (!listResult.success) {
        return 0;
      }

      const processes = listResult.stdout
        .split('\n')
        .filter(line => line.includes('docusaurus'))
        .map(line => {
          const match = line.match(/"([^"]+)","\d+"/);
          return match ? match[1] : null;
        })
        .filter(Boolean) as string[];

      for (const pid of processes) {
        await execFileNoThrow('taskkill', ['/F', '/PID', pid]);
      }

      return processes.length;
    } else {
      // Unix-like (macOS, Linux): Use ps and kill
      const psResult = await execFileNoThrow('ps', ['aux']);

      if (!psResult.success) {
        return 0;
      }

      const processes = psResult.stdout
        .split('\n')
        .filter(line => line.includes('docusaurus') && !line.includes('grep'))
        .map(line => {
          const parts = line.trim().split(/\s+/);
          return parts[1]; // PID is second column
        });

      for (const pid of processes) {
        try {
          await execFileNoThrow('kill', [pid]);
        } catch {
          // Ignore errors (process may have already exited)
        }
      }

      return processes.length;
    }
  } catch (error) {
    // No processes found or error occurred
    return 0;
  }
}

/**
 * Check if Docusaurus server is running
 */
export async function isDocusaurusRunning(port: number): Promise<boolean> {
  return !(await isPortAvailable(port));
}

/**
 * Get server URL
 */
export function getServerUrl(port: number, host: string = 'localhost'): string {
  return `http://${host}:${port}`;
}
