/**
 * Test Helper: Force Enable Locks and Session Registry
 *
 * Some tests need to validate lock and session registry behavior
 * regardless of execution context (VSCode, CI, etc.)
 *
 * Use this helper in beforeEach/afterEach to force enable these features for tests.
 */

export interface OriginalEnv {
  SPECWEAVE_FORCE_SESSION_REGISTRY?: string;
  SPECWEAVE_FORCE_LOCKS?: string;
  SPECWEAVE_DISABLE_SESSION_REGISTRY?: string;
  SPECWEAVE_DISABLE_LOCKS?: string;
}

/**
 * Force enable session registry and locks for tests
 *
 * Call in beforeEach() and save the return value
 */
export function forceEnableLocksForTest(): OriginalEnv {
  const original: OriginalEnv = {
    SPECWEAVE_FORCE_SESSION_REGISTRY: process.env.SPECWEAVE_FORCE_SESSION_REGISTRY,
    SPECWEAVE_FORCE_LOCKS: process.env.SPECWEAVE_FORCE_LOCKS,
    SPECWEAVE_DISABLE_SESSION_REGISTRY: process.env.SPECWEAVE_DISABLE_SESSION_REGISTRY,
    SPECWEAVE_DISABLE_LOCKS: process.env.SPECWEAVE_DISABLE_LOCKS,
  };

  // Force enable both session registry and locks
  process.env.SPECWEAVE_FORCE_SESSION_REGISTRY = '1';
  process.env.SPECWEAVE_FORCE_LOCKS = '1';

  // Clear any disable flags
  delete process.env.SPECWEAVE_DISABLE_SESSION_REGISTRY;
  delete process.env.SPECWEAVE_DISABLE_LOCKS;

  return original;
}

/**
 * Restore original environment after test
 *
 * Call in afterEach() with the value returned from forceEnableLocksForTest()
 */
export function restoreEnvironment(original: OriginalEnv): void {
  if (original.SPECWEAVE_FORCE_SESSION_REGISTRY !== undefined) {
    process.env.SPECWEAVE_FORCE_SESSION_REGISTRY = original.SPECWEAVE_FORCE_SESSION_REGISTRY;
  } else {
    delete process.env.SPECWEAVE_FORCE_SESSION_REGISTRY;
  }

  if (original.SPECWEAVE_FORCE_LOCKS !== undefined) {
    process.env.SPECWEAVE_FORCE_LOCKS = original.SPECWEAVE_FORCE_LOCKS;
  } else {
    delete process.env.SPECWEAVE_FORCE_LOCKS;
  }

  if (original.SPECWEAVE_DISABLE_SESSION_REGISTRY !== undefined) {
    process.env.SPECWEAVE_DISABLE_SESSION_REGISTRY = original.SPECWEAVE_DISABLE_SESSION_REGISTRY;
  } else {
    delete process.env.SPECWEAVE_DISABLE_SESSION_REGISTRY;
  }

  if (original.SPECWEAVE_DISABLE_LOCKS !== undefined) {
    process.env.SPECWEAVE_DISABLE_LOCKS = original.SPECWEAVE_DISABLE_LOCKS;
  } else {
    delete process.env.SPECWEAVE_DISABLE_LOCKS;
  }
}
