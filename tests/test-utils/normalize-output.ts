/**
 * Output normalization utilities for CLI test assertions
 *
 * Inspired by OpenClaw's test/helpers/normalize-text.ts and
 * Bubbletea's lipgloss.SetColorProfile(termenv.Ascii) pattern.
 *
 * Strips ANSI escape codes, normalizes line endings, and provides
 * reliable text comparison for terminal output.
 */

// eslint-disable-next-line no-control-regex
const ANSI_REGEX = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;

/**
 * Strip all ANSI escape codes from a string.
 * Handles colors, cursor movement, clearing, and other terminal sequences.
 */
export function stripAnsi(text: string): string {
  return text.replace(ANSI_REGEX, '');
}

/**
 * Normalize line endings to \n (Unix-style).
 */
export function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Remove spinner/progress bar artifacts from output.
 * These appear as partial lines with \r (carriage return) overwrites.
 */
export function stripSpinnerOutput(text: string): string {
  // Remove lines that are just spinner frames
  const lines = text.split('\n');
  return lines
    .filter(line => {
      const stripped = line.trim();
      // Common spinner characters
      if (/^[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏|\\/-]+$/.test(stripped)) return false;
      // Lines that are just whitespace after stripping ANSI
      if (stripAnsi(stripped) === '') return false;
      return true;
    })
    .join('\n');
}

/**
 * Full normalization: strip ANSI + normalize line endings + trim.
 * Use this for comparing CLI output in assertions.
 */
export function normalizeOutput(text: string): string {
  return stripSpinnerOutput(normalizeLineEndings(stripAnsi(text))).trim();
}

/**
 * Extract JSON from mixed stdout that may contain non-JSON lines.
 * Handles common cases:
 * - Pure JSON output
 * - JSON preceded by log lines
 * - JSON followed by trailing output
 * - Multiple JSON objects (returns first valid one)
 */
export function extractJson<T = unknown>(text: string): T | null {
  const normalized = normalizeLineEndings(stripAnsi(text));

  // Try parsing the entire string first
  try {
    return JSON.parse(normalized) as T;
  } catch {
    // Not pure JSON, try extracting
  }

  // Try to find JSON object boundaries
  const lines = normalized.split('\n');
  let jsonStart = -1;
  let braceCount = 0;
  let jsonLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (jsonStart === -1) {
      // Look for line starting with { or [
      const trimmed = line.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        jsonStart = i;
        braceCount = 0;
      } else {
        continue;
      }
    }

    if (jsonStart >= 0) {
      jsonLines.push(line);

      // Count braces to find complete JSON
      for (const char of line) {
        if (char === '{' || char === '[') braceCount++;
        if (char === '}' || char === ']') braceCount--;
      }

      if (braceCount === 0) {
        try {
          return JSON.parse(jsonLines.join('\n')) as T;
        } catch {
          // Not valid JSON, reset and keep looking
          jsonStart = -1;
          jsonLines = [];
        }
      }
    }
  }

  return null;
}

/**
 * Extract all JSON objects from mixed output.
 * Useful when a CLI outputs multiple JSON blocks.
 */
export function extractAllJson<T = unknown>(text: string): T[] {
  const normalized = normalizeLineEndings(stripAnsi(text));
  const results: T[] = [];
  const lines = normalized.split('\n');
  let jsonStart = -1;
  let braceCount = 0;
  let jsonLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (jsonStart === -1) {
      const trimmed = line.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        jsonStart = i;
        braceCount = 0;
        jsonLines = [];
      } else {
        continue;
      }
    }

    if (jsonStart >= 0) {
      jsonLines.push(line);

      for (const char of line) {
        if (char === '{' || char === '[') braceCount++;
        if (char === '}' || char === ']') braceCount--;
      }

      if (braceCount === 0) {
        try {
          results.push(JSON.parse(jsonLines.join('\n')) as T);
        } catch {
          // Not valid JSON, skip
        }
        jsonStart = -1;
        jsonLines = [];
      }
    }
  }

  return results;
}
