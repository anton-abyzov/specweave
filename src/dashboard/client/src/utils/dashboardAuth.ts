declare global {
  interface Window {
    __SPECWEAVE_DASHBOARD_TOKEN__?: string;
  }
}

/** Read dashboard auth token injected by the server into index.html. */
export function getDashboardToken(): string | null {
  const token = window.__SPECWEAVE_DASHBOARD_TOKEN__;
  if (typeof token !== 'string' || token.length === 0) {
    return null;
  }
  return token;
}

/** Append dashboard auth token as query param (used for EventSource). */
export function appendDashboardToken(url: string): string {
  const token = getDashboardToken();
  if (!token) {
    return url;
  }

  const parsed = new URL(url, window.location.origin);
  parsed.searchParams.set('token', token);
  return parsed.pathname + parsed.search + parsed.hash;
}
