/**
 * Clean Environment Utility for Tests
 *
 * Re-exports getCleanEnv from the source for easy importing in test files.
 * This prevents child processes from inheriting debugger/instrumentation env vars
 * that can cause hangs in VSCode debug mode, CI/CD, etc.
 *
 * @example
 * ```typescript
 * import { getCleanEnv } from '../../test-utils/clean-env.js';
 *
 * execSync('node script.js', { env: getCleanEnv() });
 * spawnSync('claude', ['--version'], { env: getCleanEnv() });
 * ```
 */
export { getCleanEnv } from '../../src/utils/clean-env.js';
