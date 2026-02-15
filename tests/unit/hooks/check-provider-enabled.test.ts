import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * Tests for check-provider-enabled.sh shared config detection.
 * Validates all 3 config formats: PROFILES, LEGACY DIRECT, LEGACY PROVIDER.
 */

const LIB_PATH = join(
  process.cwd(),
  'plugins/specweave/hooks/v2/lib/check-provider-enabled.sh',
);

function runCheck(configPath: string, provider: string): number {
  const script = `
    source "${LIB_PATH}"
    check_provider_enabled "${configPath}" "${provider}"
  `;
  try {
    execSync(`bash -c '${script}'`, { stdio: 'pipe' });
    return 0; // success = enabled
  } catch {
    return 1; // failure = disabled
  }
}

describe('check-provider-enabled.sh', () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'sw-config-test-'));
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeConfig(name: string, content: object): string {
    const path = join(tmpDir, `${name}.json`);
    writeFileSync(path, JSON.stringify(content, null, 2));
    return path;
  }

  describe('PROFILES format (Method 1)', () => {
    it('returns enabled for profiles with github provider and canUpdateExternalItems', () => {
      const path = writeConfig('profiles-github', {
        sync: {
          profiles: {
            'my-project': {
              provider: 'github',
              config: { owner: 'test', repo: 'test' },
            },
          },
          settings: { canUpdateExternalItems: true },
        },
      });
      expect(runCheck(path, 'github')).toBe(0);
    });

    it('returns disabled for profiles with github but canUpdateExternalItems false', () => {
      const path = writeConfig('profiles-no-update', {
        sync: {
          profiles: {
            'my-project': {
              provider: 'github',
              config: { owner: 'test', repo: 'test' },
            },
          },
          settings: { canUpdateExternalItems: false },
        },
      });
      expect(runCheck(path, 'github')).toBe(1);
    });

    it('returns disabled for profiles with jira only when checking github', () => {
      const path = writeConfig('profiles-jira-only', {
        sync: {
          profiles: {
            'my-project': {
              provider: 'jira',
              config: { host: 'test.atlassian.net' },
            },
          },
          settings: { canUpdateExternalItems: true },
        },
      });
      expect(runCheck(path, 'github')).toBe(1);
    });

    it('returns enabled for jira provider in profiles', () => {
      const path = writeConfig('profiles-jira', {
        sync: {
          profiles: {
            'my-project': {
              provider: 'jira',
              config: { host: 'test.atlassian.net' },
            },
          },
          settings: { canUpdateExternalItems: true },
        },
      });
      expect(runCheck(path, 'jira')).toBe(0);
    });
  });

  describe('LEGACY DIRECT format (Method 2)', () => {
    it('returns enabled for sync.github.enabled: true', () => {
      const path = writeConfig('legacy-direct', {
        sync: {
          github: { enabled: true, owner: 'test', repo: 'test' },
        },
      });
      expect(runCheck(path, 'github')).toBe(0);
    });

    it('returns disabled for sync.github.enabled: false', () => {
      const path = writeConfig('legacy-direct-false', {
        sync: {
          github: { enabled: false, owner: 'test', repo: 'test' },
        },
      });
      expect(runCheck(path, 'github')).toBe(1);
    });

    it('returns enabled for sync.jira.enabled: true', () => {
      const path = writeConfig('legacy-direct-jira', {
        sync: {
          jira: { enabled: true, host: 'test.atlassian.net' },
        },
      });
      expect(runCheck(path, 'jira')).toBe(0);
    });
  });

  describe('LEGACY PROVIDER format (Method 3)', () => {
    it('returns enabled for sync.provider: github with sync.enabled: true', () => {
      const path = writeConfig('legacy-provider', {
        sync: {
          enabled: true,
          provider: 'github',
          owner: 'test',
          repo: 'test',
        },
      });
      expect(runCheck(path, 'github')).toBe(0);
    });

    it('returns disabled when sync.enabled is false', () => {
      const path = writeConfig('legacy-provider-disabled', {
        sync: {
          enabled: false,
          provider: 'github',
        },
      });
      expect(runCheck(path, 'github')).toBe(1);
    });
  });

  describe('Edge cases', () => {
    it('returns disabled for missing config file', () => {
      expect(runCheck('/nonexistent/path.json', 'github')).toBe(1);
    });

    it('returns disabled for empty config', () => {
      const path = writeConfig('empty', {});
      expect(runCheck(path, 'github')).toBe(1);
    });

    it('returns disabled for config with no sync section', () => {
      const path = writeConfig('no-sync', {
        project: { name: 'test' },
      });
      expect(runCheck(path, 'github')).toBe(1);
    });
  });
});
