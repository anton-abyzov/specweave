import { execFileSync } from 'child_process';

export interface CliDetectionResult {
  installed: boolean;
  version?: string;
  path?: string;
}

export interface DetectOptions {
  useCache?: boolean;
}

let cachedResult: CliDetectionResult | null = null;

export function clearCache(): void {
  cachedResult = null;
}

export function detectPlaywrightCli(options: DetectOptions = {}): CliDetectionResult {
  const { useCache = false } = options;

  if (useCache && cachedResult) {
    return cachedResult;
  }

  const whichCmd = process.platform === 'win32' ? 'where' : 'which';
  let path: string | undefined;
  let version: string | undefined;

  try {
    path = execFileSync(whichCmd, ['playwright-cli'], {
      encoding: 'utf-8',
      timeout: 5_000,
    }).trim();
  } catch {
    const result: CliDetectionResult = { installed: false };
    if (useCache) cachedResult = result;
    return result;
  }

  try {
    version = execFileSync('playwright-cli', ['--version'], {
      encoding: 'utf-8',
      timeout: 5_000,
    }).trim();
  } catch {
    // Version check failed but binary exists
  }

  const result: CliDetectionResult = { installed: true, path, version };
  if (useCache) cachedResult = result;
  return result;
}
