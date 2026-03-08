import * as fs from 'fs';
import * as path from 'path';
import * as net from 'net';

export interface HooksStatusResult {
  serverRunning: boolean;
  port?: number;
  pid?: number;
  startedAt?: string;
  stalePidFile: boolean;
  eventCount?: number;
}

interface PidFileData {
  port: number;
  pid: number;
  startedAt: string;
}

export function isPortReachable(port: number, timeoutMs = 500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, '127.0.0.1');
  });
}

async function fetchStatus(port: number): Promise<{ totalEvents?: number } | null> {
  try {
    const http = await import('http');
    return new Promise((resolve) => {
      const req = http.request(
        { hostname: '127.0.0.1', port, path: '/api/hooks/status', method: 'GET', timeout: 1000 },
        (res) => {
          let data = '';
          res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch {
              resolve(null);
            }
          });
        },
      );
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
      req.end();
    });
  } catch {
    return null;
  }
}

export async function getHooksStatus(projectRoot: string): Promise<HooksStatusResult> {
  const pidFilePath = path.join(projectRoot, '.specweave', 'state', 'hooks', 'server.pid');

  if (!fs.existsSync(pidFilePath)) {
    return { serverRunning: false, stalePidFile: false };
  }

  let pidData: PidFileData;
  try {
    pidData = JSON.parse(fs.readFileSync(pidFilePath, 'utf-8'));
  } catch {
    return { serverRunning: false, stalePidFile: true };
  }

  const reachable = await isPortReachable(pidData.port);
  if (!reachable) {
    return {
      serverRunning: false,
      port: pidData.port,
      pid: pidData.pid,
      startedAt: pidData.startedAt,
      stalePidFile: true,
    };
  }

  // Server is reachable — try to get event count
  const stats = await fetchStatus(pidData.port);

  return {
    serverRunning: true,
    port: pidData.port,
    pid: pidData.pid,
    startedAt: pidData.startedAt,
    stalePidFile: false,
    eventCount: stats?.totalEvents,
  };
}

export function formatHooksStatus(result: HooksStatusResult): string {
  const lines: string[] = [];

  if (!result.serverRunning) {
    lines.push('Dashboard server: not running');
    if (result.stalePidFile) {
      lines.push(`  Stale PID file detected (port ${result.port}, pid ${result.pid})`);
      lines.push('  The server may have crashed. PID file can be safely removed.');
    }
  } else {
    lines.push(`Dashboard server: running on port ${result.port} (pid ${result.pid})`);
    if (result.startedAt) {
      lines.push(`  Started: ${result.startedAt}`);
    }
    if (result.eventCount != null) {
      lines.push(`  Events received: ${result.eventCount}`);
    }
  }

  return lines.join('\n');
}
