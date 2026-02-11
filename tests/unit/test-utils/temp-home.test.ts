/**
 * Tests for temp-home isolation helper
 *
 * Verifies that:
 * 1. HOME env var is overridden during test
 * 2. Original HOME is restored after test
 * 3. Temp directory is created with expected structure
 * 4. Cleanup removes temp directory
 * 5. getIsolatedEnv returns correct env for child processes
 */
import { describe, it, expect, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { withIsolatedHome, getIsolatedEnv } from '../../test-utils/temp-home.js';

describe('withIsolatedHome', () => {
  let restoreFn: (() => Promise<void>) | null = null;
  const originalHome = process.env.HOME;

  afterEach(async () => {
    // Safety: always restore if test failed mid-way
    if (restoreFn) {
      await restoreFn();
      restoreFn = null;
    }
    // Verify HOME was restored
    expect(process.env.HOME).toBe(originalHome);
  });

  it('should override HOME to a temp directory', async () => {
    const { homePath, restore } = await withIsolatedHome('override-test');
    restoreFn = restore;

    expect(process.env.HOME).toBe(homePath);
    expect(homePath).toContain(os.tmpdir());
    expect(homePath).toContain('specweave-home-override-test');

    await restore();
    restoreFn = null;
  });

  it('should restore original HOME after cleanup', async () => {
    const { restore } = await withIsolatedHome('restore-test');
    restoreFn = restore;

    // HOME is now the temp dir
    expect(process.env.HOME).not.toBe(originalHome);

    await restore();
    restoreFn = null;

    // HOME is restored
    expect(process.env.HOME).toBe(originalHome);
  });

  it('should create .specweave and .claude directories in temp home', async () => {
    const { homePath, restore } = await withIsolatedHome('structure-test');
    restoreFn = restore;

    const specweaveDir = path.join(homePath, '.specweave');
    const claudeDir = path.join(homePath, '.claude');

    const swStat = await fs.stat(specweaveDir);
    const clStat = await fs.stat(claudeDir);
    expect(swStat.isDirectory()).toBe(true);
    expect(clStat.isDirectory()).toBe(true);

    await restore();
    restoreFn = null;
  });

  it('should clean up temp directory on restore', async () => {
    const { homePath, restore } = await withIsolatedHome('cleanup-test');
    restoreFn = restore;

    // Verify it exists
    const exists = await fs.stat(homePath).then(() => true).catch(() => false);
    expect(exists).toBe(true);

    await restore();
    restoreFn = null;

    // Verify it's gone
    const existsAfter = await fs.stat(homePath).then(() => true).catch(() => false);
    expect(existsAfter).toBe(false);
  });

  it('should set USERPROFILE for Windows compatibility', async () => {
    const { homePath, restore } = await withIsolatedHome('windows-test');
    restoreFn = restore;

    expect(process.env.USERPROFILE).toBe(homePath);

    await restore();
    restoreFn = null;
  });

  it('should apply extra env vars and clean them up', async () => {
    const { restore } = await withIsolatedHome('extra-env-test', {
      MY_CUSTOM_VAR: 'test-value',
    });
    restoreFn = restore;

    expect(process.env.MY_CUSTOM_VAR).toBe('test-value');

    await restore();
    restoreFn = null;

    expect(process.env.MY_CUSTOM_VAR).toBeUndefined();
  });

  it('should generate unique directories for parallel tests', async () => {
    const { homePath: home1, restore: restore1 } = await withIsolatedHome('parallel-1');
    const { homePath: home2, restore: restore2 } = await withIsolatedHome('parallel-2');

    expect(home1).not.toBe(home2);

    await restore2();
    await restore1();
  });
});

describe('getIsolatedEnv', () => {
  it('should return env with overridden HOME', () => {
    const env = getIsolatedEnv('/tmp/test-home');

    expect(env.HOME).toBe('/tmp/test-home');
    expect(env.USERPROFILE).toBe('/tmp/test-home');
  });

  it('should strip NODE_OPTIONS to prevent debugger interference', () => {
    const originalNodeOptions = process.env.NODE_OPTIONS;
    process.env.NODE_OPTIONS = '--inspect-brk';

    const env = getIsolatedEnv('/tmp/test-home');

    expect(env.NODE_OPTIONS).toBeUndefined();

    // Restore
    if (originalNodeOptions) {
      process.env.NODE_OPTIONS = originalNodeOptions;
    } else {
      delete process.env.NODE_OPTIONS;
    }
  });

  it('should merge extra env vars', () => {
    const env = getIsolatedEnv('/tmp/test-home', { CI: 'true' });

    expect(env.CI).toBe('true');
    expect(env.HOME).toBe('/tmp/test-home');
  });

  it('should set SPECWEAVE_STATE_DIR relative to home', () => {
    const env = getIsolatedEnv('/tmp/test-home');

    expect(env.SPECWEAVE_STATE_DIR).toBe('/tmp/test-home/.specweave/state');
  });
});
