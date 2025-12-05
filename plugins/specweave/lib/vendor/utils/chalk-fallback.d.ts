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
type ChalkInput = string | number;
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
export declare const chalkFallback: ChalkInstance;
export declare function getChalk(): Promise<ChalkInstance>;
/**
 * Synchronous chalk getter - uses fallback if chalk wasn't pre-loaded
 * Call getChalk() at module init to try loading real chalk first
 */
export declare function getChalkSync(): ChalkInstance;
export default chalkFallback;
//# sourceMappingURL=chalk-fallback.d.ts.map