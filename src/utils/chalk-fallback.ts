/**
 * Chalk Fallback Utility
 *
 * Provides chalk-like API for colored console output with graceful fallback
 * to plain text when chalk is not available (e.g., in marketplace plugins).
 *
 * This enables AC test validator to work in both:
 * 1. Full npm-installed environments (uses real chalk)
 * 2. Marketplace plugin environments (uses ANSI codes or plain text)
 */

// Simple ANSI color codes for terminal output
const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

// Check if we're in a TTY that supports colors
const supportsColor = process.stdout?.isTTY ?? false;

// Type that chalk functions accept (string or number, like real chalk)
type ChalkInput = string | number;

/**
 * Creates a chalk-like color function
 */
function createColorFn(colorCode: string): ChalkFn {
  const fn = ((text: ChalkInput) => {
    const str = String(text);
    if (!supportsColor) return str;
    return `${colorCode}${str}${ANSI.reset}`;
  }) as ChalkFn;

  // Add chainable modifiers
  fn.bold = ((text: ChalkInput) => {
    const str = String(text);
    if (!supportsColor) return str;
    return `${ANSI.bold}${colorCode}${str}${ANSI.reset}`;
  }) as ChalkFn;

  return fn;
}

/**
 * Creates a bold color function
 */
function createBoldColorFn(colorCode: string): ChalkFn {
  const fn = ((text: ChalkInput) => {
    const str = String(text);
    if (!supportsColor) return str;
    return `${ANSI.bold}${colorCode}${str}${ANSI.reset}`;
  }) as ChalkFn;

  fn.bold = fn;
  return fn;
}

interface ChalkFn {
  (text: ChalkInput): string;
  bold: ChalkFn;
}

interface ChalkInstance {
  red: ChalkFn;
  green: ChalkFn;
  yellow: ChalkFn;
  blue: ChalkFn;
  gray: ChalkFn;
  bold: ChalkFn & {
    (text: string): string;
  };
}

/**
 * Chalk-compatible API using ANSI codes
 * Falls back to plain text if terminal doesn't support colors
 */
export const chalkFallback: ChalkInstance = {
  red: createColorFn(ANSI.red),
  green: createColorFn(ANSI.green),
  yellow: createColorFn(ANSI.yellow),
  blue: createColorFn(ANSI.blue),
  gray: createColorFn(ANSI.gray),
  bold: Object.assign(
    ((text: ChalkInput) => {
      const str = String(text);
      if (!supportsColor) return str;
      return `${ANSI.bold}${str}${ANSI.reset}`;
    }) as ChalkFn,
    {
      bold: ((text: ChalkInput) => {
        const str = String(text);
        if (!supportsColor) return str;
        return `${ANSI.bold}${str}${ANSI.reset}`;
      }) as ChalkFn,
    }
  ),
};

// Add nested color methods to bold
(chalkFallback.bold as any).red = createBoldColorFn(ANSI.red);
(chalkFallback.bold as any).green = createBoldColorFn(ANSI.green);
(chalkFallback.bold as any).yellow = createBoldColorFn(ANSI.yellow);
(chalkFallback.bold as any).blue = createBoldColorFn(ANSI.blue);
(chalkFallback.bold as any).gray = createBoldColorFn(ANSI.gray);

// Add bold method to color functions for chaining like chalk.green.bold()
chalkFallback.red.bold = createBoldColorFn(ANSI.red);
chalkFallback.green.bold = createBoldColorFn(ANSI.green);
chalkFallback.yellow.bold = createBoldColorFn(ANSI.yellow);
chalkFallback.blue.bold = createBoldColorFn(ANSI.blue);
chalkFallback.gray.bold = createBoldColorFn(ANSI.gray);

/**
 * Try to import chalk, fall back to ANSI implementation
 */
let resolvedChalk: ChalkInstance | null = null;

export async function getChalk(): Promise<ChalkInstance> {
  if (resolvedChalk) return resolvedChalk;

  try {
    // Try to dynamically import chalk
    const chalkModule = await import('chalk');
    resolvedChalk = chalkModule.default as unknown as ChalkInstance;
    return resolvedChalk;
  } catch {
    // Chalk not available, use fallback
    resolvedChalk = chalkFallback;
    return resolvedChalk;
  }
}

/**
 * Synchronous chalk getter - uses fallback if chalk wasn't pre-loaded
 * Call getChalk() at module init to try loading real chalk first
 */
export function getChalkSync(): ChalkInstance {
  return resolvedChalk ?? chalkFallback;
}

export default chalkFallback;
