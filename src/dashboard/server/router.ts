import * as http from 'http';
import type { RouteHandler } from '../types.js';

interface Route {
  method: string;
  pattern: RegExp;
  paramNames: string[];
  handler: RouteHandler;
}

export class Router {
  private routes: Route[] = [];

  get(path: string, handler: RouteHandler): void {
    this.addRoute('GET', path, handler);
  }

  post(path: string, handler: RouteHandler): void {
    this.addRoute('POST', path, handler);
  }

  put(path: string, handler: RouteHandler): void {
    this.addRoute('PUT', path, handler);
  }

  delete(path: string, handler: RouteHandler): void {
    this.addRoute('DELETE', path, handler);
  }

  private addRoute(method: string, path: string, handler: RouteHandler): void {
    const paramNames: string[] = [];
    const pattern = path.replace(/:([^/]+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });
    this.routes.push({
      method,
      pattern: new RegExp(`^${pattern}$`),
      paramNames,
      handler,
    });
  }

  async handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<boolean> {
    const method = req.method || 'GET';
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    for (const route of this.routes) {
      if (route.method !== method) continue;
      const match = pathname.match(route.pattern);
      if (!match) continue;

      const params: Record<string, string> = {};
      route.paramNames.forEach((name, i) => {
        params[name] = decodeURIComponent(match[i + 1]);
      });

      try {
        await route.handler(req, res, params);
      } catch (err) {
        if (!res.headersSent) {
          // Sanitize: don't leak internal paths or stack traces
          const message = err instanceof Error ? err.message : 'Internal server error';
          const sanitized = message.replace(/\/[^\s:]+/g, '<path>');
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: sanitized }));
        }
      }
      return true;
    }
    return false;
  }
}

/** Helper: send JSON response. Restricts CORS to localhost origins only. */
export function sendJson(res: http.ServerResponse, data: unknown, status = 200, req?: http.IncomingMessage): void {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
  };
  const origin = req?.headers?.origin;
  if (origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  res.writeHead(status, headers);
  res.end(JSON.stringify(data));
}

/** Helper: read JSON body from request (1MB limit, 10s timeout) */
export async function readBody(req: http.IncomingMessage): Promise<unknown> {
  const MAX_BODY_SIZE = 1024 * 1024; // 1MB
  const TIMEOUT_MS = 10_000;
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    const timer = setTimeout(() => {
      req.destroy();
      reject(new Error('Request body timeout'));
    }, TIMEOUT_MS);
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        clearTimeout(timer);
        req.destroy();
        reject(new Error('Request body too large'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      clearTimeout(timer);
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString()));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}
