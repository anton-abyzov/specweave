/**
 * Credential Masker - Security Utility
 *
 * Automatically masks sensitive credentials in logs, console output, and file writes.
 * Prevents accidental exposure of secrets in debugging output and log files.
 *
 * Features:
 * - Pattern-based detection of common credential formats
 * - Context-aware masking (preserves first/last characters for debugging)
 * - Zero-config (works out of the box)
 * - Handles JSON, environment variables, URLs, and more
 */
/**
 * Masking options
 */
export interface MaskOptions {
    /**
     * Show first N characters (default: 4)
     */
    showFirst?: number;
    /**
     * Show last N characters (default: 4)
     */
    showLast?: number;
    /**
     * Mask character (default: '*')
     */
    maskChar?: string;
    /**
     * Minimum length to mask (default: 8)
     * Shorter values are completely masked
     */
    minLength?: number;
    /**
     * Enable aggressive mode (masks more patterns)
     */
    aggressive?: boolean;
}
/**
 * Mask a credential value
 *
 * @param value - Credential to mask
 * @param options - Masking options
 * @returns Masked credential
 *
 * @example
 * maskValue('ghp_1234567890abcdef') // 'ghp_****def'
 * maskValue('short') // '********'
 */
export declare function maskValue(value: string, options?: MaskOptions): string;
/**
 * Mask all credentials in a string
 *
 * @param text - Text potentially containing credentials
 * @param options - Masking options
 * @returns Text with credentials masked
 *
 * @example
 * maskCredentials('GITHUB_TOKEN=ghp_123456') // 'GITHUB_TOKEN=ghp_****'
 * maskCredentials('Bearer eyJhbGc...') // 'Bearer eyJh****...'
 */
export declare function maskCredentials(text: string, options?: MaskOptions): string;
/**
 * Mask credentials in structured data (objects, arrays)
 *
 * @param data - Data structure
 * @param options - Masking options
 * @returns Data with credentials masked
 */
export declare function maskCredentialsInData(data: any, options?: MaskOptions): any;
/**
 * Sanitize bash command output
 *
 * Masks credentials in bash command outputs (especially grep results)
 *
 * @param output - Command output
 * @param options - Masking options
 * @returns Sanitized output
 *
 * @example
 * sanitizeBashOutput('GITHUB_TOKEN=ghp_123456\nAPI_KEY=sk_test_123')
 * // 'GITHUB_TOKEN=ghp_****\nAPI_KEY=sk_t****123'
 */
export declare function sanitizeBashOutput(output: string, options?: MaskOptions): string;
/**
 * Check if text contains potential credentials
 *
 * @param text - Text to check
 * @returns True if credentials detected
 */
export declare function containsCredentials(text: string): boolean;
/**
 * Create a credential-safe logger wrapper
 *
 * Wraps a logger to automatically mask credentials
 *
 * @param logger - Original logger
 * @param options - Masking options
 * @returns Wrapped logger with automatic masking
 */
export declare function createSecureLogger(logger: any, options?: MaskOptions): {
    log: (message: string, ...args: any[]) => void;
    info: (message: string, ...args: any[]) => void;
    error: (message: string, error?: any) => void;
    warn: (message: string) => void;
    debug: (message: string) => void;
};
/**
 * Environment variable masking helper
 *
 * Masks sensitive environment variables before logging
 *
 * @param env - Environment object
 * @param options - Masking options
 * @returns Masked environment object
 */
export declare function maskEnvironment(env?: NodeJS.ProcessEnv, options?: MaskOptions): Record<string, string>;
//# sourceMappingURL=credential-masker.d.ts.map