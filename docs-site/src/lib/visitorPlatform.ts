/**
 * Which computer a visitor is on, so download buttons can lead with the installer
 * that runs there. The server render knows nothing about the visitor, so pages
 * render the Mac default and switch after hydration.
 *
 * The user-agent string is frozen in Chromium ("Win64; x64" even on Arm, and
 * "Intel Mac OS X" on every Mac), so the architecture comes from User-Agent
 * Client Hints where the browser offers them. Safari and Firefox do not, which
 * leaves a Mac's chip unknown; Apple silicon is assumed there.
 */
export type VisitorOs = 'mac' | 'windows' | 'linux' | 'mobile' | 'unknown';
export type VisitorArch = 'arm64' | 'x64' | null;

export interface VisitorPlatform {
  os: VisitorOs;
  arch: VisitorArch;
}

export function platformFromUserAgent(ua: string, maxTouchPoints = 0): VisitorPlatform {
  if (/iPhone|iPad|iPod|Android/i.test(ua)) return {os: 'mobile', arch: null};
  // iPadOS Safari asks for desktop pages with a Mac user agent; a Mac has no touch screen.
  if (/Macintosh|Mac OS X/i.test(ua)) return maxTouchPoints > 1 ? {os: 'mobile', arch: null} : {os: 'mac', arch: null};
  if (/Windows/i.test(ua)) return {os: 'windows', arch: /\b(ARM64|aarch64)\b/i.test(ua) ? 'arm64' : 'x64'};
  if (/CrOS/i.test(ua)) return {os: 'unknown', arch: null};
  if (/Linux|X11/i.test(ua)) {
    if (/\b(aarch64|arm64|armv8)/i.test(ua)) return {os: 'linux', arch: 'arm64'};
    if (/\b(x86_64|amd64|x64)\b/i.test(ua)) return {os: 'linux', arch: 'x64'};
    return {os: 'linux', arch: null};
  }
  return {os: 'unknown', arch: null};
}

interface HighEntropyValues {
  platform?: string;
  architecture?: string;
  bitness?: string;
}

interface NavigatorUAData {
  getHighEntropyValues?: (hints: string[]) => Promise<HighEntropyValues>;
}

type NavigatorLike = Pick<Navigator, 'userAgent'> & {maxTouchPoints?: number; userAgentData?: NavigatorUAData};

export function archFromClientHints(values: HighEntropyValues): VisitorArch {
  const arch = (values.architecture ?? '').toLowerCase();
  if (values.bitness && values.bitness !== '64') return null;
  if (arch === 'arm') return 'arm64';
  if (arch === 'x86') return 'x64';
  return null;
}

export async function detectVisitorPlatform(nav: NavigatorLike): Promise<VisitorPlatform> {
  const base = platformFromUserAgent(nav.userAgent ?? '', nav.maxTouchPoints ?? 0);
  if (base.os === 'mobile' || base.os === 'unknown') return base;
  const getValues = nav.userAgentData?.getHighEntropyValues;
  if (!getValues) return base;
  try {
    const arch = archFromClientHints(await getValues.call(nav.userAgentData, ['architecture', 'bitness']));
    return arch ? {...base, arch} : base;
  } catch {
    return base;
  }
}
