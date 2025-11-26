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
/**
 * Creates a chalk-like color function
 */
function createColorFn(colorCode) {
    const fn = ((text) => {
        const str = String(text);
        if (!supportsColor)
            return str;
        return `${colorCode}${str}${ANSI.reset}`;
    });
    // Add chainable modifiers
    fn.bold = ((text) => {
        const str = String(text);
        if (!supportsColor)
            return str;
        return `${ANSI.bold}${colorCode}${str}${ANSI.reset}`;
    });
    return fn;
}
/**
 * Creates a bold color function
 */
function createBoldColorFn(colorCode) {
    const fn = ((text) => {
        const str = String(text);
        if (!supportsColor)
            return str;
        return `${ANSI.bold}${colorCode}${str}${ANSI.reset}`;
    });
    fn.bold = fn;
    return fn;
}
/**
 * Chalk-compatible API using ANSI codes
 * Falls back to plain text if terminal doesn't support colors
 */
export const chalkFallback = {
    red: createColorFn(ANSI.red),
    green: createColorFn(ANSI.green),
    yellow: createColorFn(ANSI.yellow),
    blue: createColorFn(ANSI.blue),
    gray: createColorFn(ANSI.gray),
    bold: Object.assign(((text) => {
        const str = String(text);
        if (!supportsColor)
            return str;
        return `${ANSI.bold}${str}${ANSI.reset}`;
    }), {
        bold: ((text) => {
            const str = String(text);
            if (!supportsColor)
                return str;
            return `${ANSI.bold}${str}${ANSI.reset}`;
        }),
    }),
};
// Add nested color methods to bold
chalkFallback.bold.red = createBoldColorFn(ANSI.red);
chalkFallback.bold.green = createBoldColorFn(ANSI.green);
chalkFallback.bold.yellow = createBoldColorFn(ANSI.yellow);
chalkFallback.bold.blue = createBoldColorFn(ANSI.blue);
chalkFallback.bold.gray = createBoldColorFn(ANSI.gray);
// Add bold method to color functions for chaining like chalk.green.bold()
chalkFallback.red.bold = createBoldColorFn(ANSI.red);
chalkFallback.green.bold = createBoldColorFn(ANSI.green);
chalkFallback.yellow.bold = createBoldColorFn(ANSI.yellow);
chalkFallback.blue.bold = createBoldColorFn(ANSI.blue);
chalkFallback.gray.bold = createBoldColorFn(ANSI.gray);
/**
 * Try to import chalk, fall back to ANSI implementation
 */
let resolvedChalk = null;
export async function getChalk() {
    if (resolvedChalk)
        return resolvedChalk;
    try {
        // Try to dynamically import chalk
        const chalkModule = await import('chalk');
        resolvedChalk = chalkModule.default;
        return resolvedChalk;
    }
    catch {
        // Chalk not available, use fallback
        resolvedChalk = chalkFallback;
        return resolvedChalk;
    }
}
/**
 * Synchronous chalk getter - uses fallback if chalk wasn't pre-loaded
 * Call getChalk() at module init to try loading real chalk first
 */
export function getChalkSync() {
    return resolvedChalk ?? chalkFallback;
}
export default chalkFallback;
//# sourceMappingURL=chalk-fallback.js.map