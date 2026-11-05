/** Strips a path's locale base (/ru/, /ja/ ...); "/" comes back for the locale home. */
export function unprefixPathname(pathname: string, baseUrl: string): string {
  if (pathname.startsWith(baseUrl)) return `/${pathname.slice(baseUrl.length)}`;
  if (`${pathname}/` === baseUrl) return '/';
  return pathname;
}
