import type { IncomingMessage } from 'node:http';

/** Loopback binding plus Host validation prevents DNS rebinding; writes require same-origin browser requests. */
export function localRequestError(
  req: Pick<IncomingMessage, 'headers' | 'method'>,
  port: number,
): string | null {
  const hosts = new Set([`localhost:${port}`, `127.0.0.1:${port}`, `[::1]:${port}`]);
  const host = req.headers.host || '';
  if (!hosts.has(host)) return 'Dashboard accepts loopback requests only';
  const origin = req.headers.origin;
  if (origin) {
    try {
      const url = new URL(origin);
      if (url.protocol !== 'http:' || url.host !== host)
        return 'Cross-origin dashboard requests are not allowed';
    } catch {
      return 'Invalid request origin';
    }
  }
  if (req.headers['sec-fetch-site'] === 'cross-site') return 'Cross-site dashboard requests are not allowed';
  // Native CLI requests have no Origin; browsers posting forms must use JSON.
  if (
    ['POST', 'PUT', 'PATCH'].includes(req.method || '') &&
    Number(req.headers['content-length'] || 0) > 0 &&
    !String(req.headers['content-type'] || '')
      .toLowerCase()
      .startsWith('application/json')
  )
    return 'Dashboard writes require application/json';
  return null;
}
