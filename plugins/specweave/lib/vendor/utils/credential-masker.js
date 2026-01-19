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
 * Sensitive patterns to mask
 */
const SENSITIVE_PATTERNS = [
    // Environment variable assignments
    { pattern: /\b(GITHUB_TOKEN|GH_TOKEN)=([^\s]+)/gi, name: 'GitHub Token' },
    { pattern: /\b(JIRA_API_TOKEN|JIRA_TOKEN)=([^\s]+)/gi, name: 'JIRA Token' },
    { pattern: /\b(JIRA_EMAIL)=([^\s@]+@[^\s]+)/gi, name: 'JIRA Email' },
    { pattern: /\b(AZURE_DEVOPS_PAT|AZURE_DEVOPS_TOKEN|ADO_PAT)=([^\s]+)/gi, name: 'Azure DevOps PAT' },
    { pattern: /\b(AWS_SECRET_ACCESS_KEY)=([^\s]+)/gi, name: 'AWS Secret Key' },
    { pattern: /\b(AWS_ACCESS_KEY_ID)=([^\s]+)/gi, name: 'AWS Access Key' },
    { pattern: /\b(OPENAI_API_KEY|ANTHROPIC_API_KEY)=([^\s]+)/gi, name: 'API Key' },
    { pattern: /\b(DATABASE_URL|DB_URL|POSTGRES_URL|MYSQL_URL)=([^\s]+)/gi, name: 'Database URL' },
    { pattern: /\b(SUPABASE_KEY|SUPABASE_ANON_KEY|SUPABASE_SERVICE_KEY)=([^\s]+)/gi, name: 'Supabase Key' },
    { pattern: /\b(CF_API_TOKEN|CLOUDFLARE_API_TOKEN)=([^\s]+)/gi, name: 'Cloudflare Token' },
    { pattern: /\b(VERCEL_TOKEN)=([^\s]+)/gi, name: 'Vercel Token' },
    // JSON-style credentials
    { pattern: /"(token|apiToken|api_token|accessToken|access_token|password|secret|apiKey|api_key)"\s*:\s*"([^"]{8,})"/gi, name: 'JSON Token' },
    // URLs with credentials (http/https)
    { pattern: /https?:\/\/[^:]+:([^@]{8,})@[^\s]+/gi, name: 'HTTP URL with credentials' },
    // URLs with credentials (redis, postgresql, mysql, mongodb)
    { pattern: /(redis|postgresql|postgres|mysql|mongodb):\/\/[^:]*:([^@]{6,})@[^\s]+/gi, name: 'Database URL with credentials' },
    // Bearer tokens
    { pattern: /Bearer\s+([A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_.+/=]+)/gi, name: 'Bearer JWT' },
    { pattern: /Bearer\s+([A-Za-z0-9_\-]{20,})/gi, name: 'Bearer Token' },
    // Generic tokens (alphanumeric strings 32+ chars)
    { pattern: /\b([a-zA-Z0-9_\-]{40,})\b/g, name: 'Generic Token' },
];
/**
 * Default masking options
 */
const DEFAULT_OPTIONS = {
    showFirst: 4,
    showLast: 4,
    maskChar: '*',
    minLength: 8,
    aggressive: false,
};
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
export function maskValue(value, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    if (!value || value.length < opts.minLength) {
        // Short values - completely mask
        return opts.maskChar.repeat(8);
    }
    const showCount = opts.showFirst + opts.showLast;
    if (value.length <= showCount) {
        // Value too short to show partial
        return opts.maskChar.repeat(8);
    }
    const first = value.slice(0, opts.showFirst);
    const last = value.slice(-opts.showLast);
    const maskLength = Math.max(8, value.length - showCount);
    const mask = opts.maskChar.repeat(maskLength);
    return `${first}${mask}${last}`;
}
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
export function maskCredentials(text, options = {}) {
    if (!text)
        return text;
    let maskedText = text;
    for (const { pattern, name } of SENSITIVE_PATTERNS) {
        maskedText = maskedText.replace(pattern, (match, key, value) => {
            // For environment variables: KEY=value
            if (key && value && typeof value === 'string') {
                return `${key}=${maskValue(value, options)}`;
            }
            // For JSON: "key": "value"
            if (match.includes(':') && value && typeof value === 'string') {
                return match.replace(value, maskValue(value, options));
            }
            // For URLs: http://user:pass@host
            if (match.includes('://') && value && typeof value === 'string') {
                return match.replace(value, maskValue(value, options));
            }
            // For Bearer tokens: Bearer <token>
            if (match.toLowerCase().includes('bearer') && key && typeof key === 'string') {
                return `Bearer ${maskValue(key, options)}`;
            }
            // Generic token (single capture group)
            if (key && !value && typeof key === 'string') {
                return maskValue(key, options);
            }
            // Fallback: mask the whole match
            return maskValue(match, options);
        });
    }
    return maskedText;
}
/**
 * Mask credentials in structured data (objects, arrays)
 *
 * @param data - Data structure
 * @param options - Masking options
 * @returns Data with credentials masked
 */
export function maskCredentialsInData(data, options = {}) {
    if (typeof data === 'string') {
        return maskCredentials(data, options);
    }
    if (Array.isArray(data)) {
        return data.map(item => maskCredentialsInData(item, options));
    }
    if (data && typeof data === 'object') {
        const masked = {};
        for (const [key, value] of Object.entries(data)) {
            const lowerKey = key.toLowerCase();
            // Check if key suggests sensitive data
            const isSensitiveKey = [
                'token', 'password', 'secret', 'key', 'credential',
                'apitoken', 'api_token', 'accesstoken', 'access_token',
                'pat', 'apikey', 'api_key'
            ].some(sensitive => lowerKey.includes(sensitive));
            if (isSensitiveKey && typeof value === 'string') {
                masked[key] = maskValue(value, options);
            }
            else if (typeof value === 'object') {
                masked[key] = maskCredentialsInData(value, options);
            }
            else {
                masked[key] = value;
            }
        }
        return masked;
    }
    return data;
}
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
export function sanitizeBashOutput(output, options = {}) {
    if (!output)
        return output;
    // Mask line-by-line to preserve structure
    return output
        .split('\n')
        .map(line => maskCredentials(line, options))
        .join('\n');
}
/**
 * Check if text contains potential credentials
 *
 * @param text - Text to check
 * @returns True if credentials detected
 */
export function containsCredentials(text) {
    if (!text)
        return false;
    return SENSITIVE_PATTERNS.some(({ pattern }) => {
        // Reset regex state
        pattern.lastIndex = 0;
        return pattern.test(text);
    });
}
/**
 * Create a credential-safe logger wrapper
 *
 * Wraps a logger to automatically mask credentials
 *
 * @param logger - Original logger
 * @param options - Masking options
 * @returns Wrapped logger with automatic masking
 */
export function createSecureLogger(logger, options = {}) {
    return {
        log: (message, ...args) => {
            const maskedMsg = maskCredentials(message, options);
            const maskedArgs = args.map(arg => typeof arg === 'string' ? maskCredentials(arg, options) : arg);
            logger.log(maskedMsg, ...maskedArgs);
        },
        info: (message, ...args) => {
            const maskedMsg = maskCredentials(message, options);
            const maskedArgs = args.map(arg => typeof arg === 'string' ? maskCredentials(arg, options) : arg);
            logger.info(maskedMsg, ...maskedArgs);
        },
        error: (message, error) => {
            const maskedMsg = maskCredentials(message, options);
            let maskedError = error;
            if (error && typeof error === 'object') {
                maskedError = maskCredentialsInData(error, options);
            }
            else if (typeof error === 'string') {
                maskedError = maskCredentials(error, options);
            }
            logger.error(maskedMsg, maskedError);
        },
        warn: (message) => {
            const maskedMsg = maskCredentials(message, options);
            logger.warn(maskedMsg);
        },
        debug: (message) => {
            const maskedMsg = maskCredentials(message, options);
            logger.debug(maskedMsg);
        }
    };
}
/**
 * Environment variable masking helper
 *
 * Masks sensitive environment variables before logging
 *
 * @param env - Environment object
 * @param options - Masking options
 * @returns Masked environment object
 */
export function maskEnvironment(env = process.env, options = {}) {
    const masked = {};
    // Never mask these common environment variables
    const neverMask = new Set([
        'PATH', 'HOME', 'USER', 'SHELL', 'LANG', 'PWD', 'OLDPWD',
        'NODE_ENV', 'NODE_VERSION', 'NPM_VERSION', 'TERM', 'EDITOR',
        'TMPDIR', 'TMP', 'TEMP', 'HOSTNAME', 'OSTYPE'
    ]);
    for (const [key, value] of Object.entries(env)) {
        if (!value) {
            masked[key] = '';
            continue;
        }
        // Never mask whitelisted vars
        if (neverMask.has(key.toUpperCase())) {
            masked[key] = value;
            continue;
        }
        const lowerKey = key.toLowerCase();
        const isSensitive = [
            'token', 'password', 'secret', 'key', 'credential',
            'pat', 'api', 'auth'
        ].some(word => lowerKey.includes(word));
        masked[key] = isSensitive ? maskValue(value, options) : value;
    }
    return masked;
}
//# sourceMappingURL=credential-masker.js.map