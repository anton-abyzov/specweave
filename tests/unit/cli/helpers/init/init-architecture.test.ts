/**
 * Integration tests for new init architecture (0200)
 * T-012 [RED]
 *
 * Verifies each phase function is standalone and composable.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFileSync, mkdirSync } from 'fs';
import * as fsPromises from 'fs/promises';
import path from 'path';
import os from 'os';

// Mock execFileNoThrowSync for credential tests
const { mockExecFileNoThrowSync } = vi.hoisted(() => ({
  mockExecFileNoThrowSync: vi.fn(),
}));
vi.mock('../../../../../src/utils/execFileNoThrow.js', () => ({
  execFileNoThrowSync: mockExecFileNoThrowSync,
}));

import { detectProvider, detectCredentials } from '../../../../../src/cli/helpers/init/provider-detection.js';
import { isGreenfield } from '../../../../../src/cli/helpers/init/greenfield-detection.js';
import { applySmartDefaults } from '../../../../../src/cli/helpers/init/smart-defaults.js';
import { formatSummaryBanner } from '../../../../../src/cli/helpers/init/summary-banner.js';

function tmpPath(name: string): string {
  const suffix = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  return path.join(os.tmpdir(), `sw-init-arch-${name}-${suffix}`);
}

describe('init-architecture (integration)', () => {
  // ─── Standalone function tests ────────────────────────────────

  describe('phase functions are standalone and independent', () => {
    it('detectProvider works without any other phase', () => {
      const dir = tmpPath('standalone-provider');
      mkdirSync(path.join(dir, '.git'), { recursive: true });
      writeFileSync(
        path.join(dir, '.git', 'config'),
        '[remote "origin"]\n\turl = https://github.com/test/repo.git\n'
      );

      const result = detectProvider(dir);
      expect(result).toEqual({ provider: 'github', owner: 'test', repo: 'repo' });

      fsPromises.rm(dir, { recursive: true, force: true }).catch(() => {});
    });

    it('detectCredentials works without any other phase', () => {
      const dir = tmpPath('standalone-creds');
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, '.env'), 'GITHUB_TOKEN=standalone-test\n');
      mockExecFileNoThrowSync.mockReturnValue({ stdout: '', exitCode: 1 });

      const result = detectCredentials(dir, 'github');
      expect(result).toBe('standalone-test');

      fsPromises.rm(dir, { recursive: true, force: true }).catch(() => {});
    });

    it('isGreenfield works without any other phase', () => {
      const dir = tmpPath('standalone-greenfield');
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, 'README.md'), '# Empty');

      expect(isGreenfield(dir)).toBe(true);

      fsPromises.rm(dir, { recursive: true, force: true }).catch(() => {});
    });

    it('applySmartDefaults works without any other phase', () => {
      const config: Record<string, any> = {};
      const result = applySmartDefaults(config, {
        adapter: 'claude',
        language: 'en',
        isGitRepo: true,
      });

      expect(result.testing.defaultTestMode).toBe('TDD');
      expect(result.qualityGates.preset).toBe('standard');
      expect(result.lsp.enabled).toBe(true);
    });

    it('formatSummaryBanner works without any other phase', () => {
      const output = formatSummaryBanner({
        projectName: 'test-project',
        provider: { name: 'GitHub', owner: 'org', repo: 'repo' },
        tracker: { name: 'GitHub Issues' },
        repoCount: 1,
        isGreenfield: true,
        hasPendingClones: false,
        adapter: 'claude',
        language: 'en',
        defaults: {
          testing: 'TDD',
          qualityGates: 'standard',
          lspEnabled: true,
          gitHooksInstalled: true,
          translationEnabled: false,
        },
      });

      expect(output).toContain('test-project');
      expect(output).toContain('TDD');
    });
  });

  // ─── Composition tests ────────────────────────────────────────

  describe('phase functions compose correctly', () => {
    let dir: string;
    const savedEnv: Record<string, string | undefined> = {};

    beforeEach(() => {
      dir = tmpPath('compose');
      mkdirSync(path.join(dir, '.git'), { recursive: true });
      mockExecFileNoThrowSync.mockReset();

      for (const key of ['GITHUB_TOKEN', 'GH_TOKEN']) {
        savedEnv[key] = process.env[key];
        delete process.env[key];
      }
    });

    afterEach(async () => {
      for (const [key, value] of Object.entries(savedEnv)) {
        if (value !== undefined) process.env[key] = value;
        else delete process.env[key];
      }
      await fsPromises.rm(dir, { recursive: true, force: true }).catch(() => {});
    });

    it('full pipeline: GitHub single repo with gh auth (greenfield)', () => {
      // Setup: GitHub remote + gh auth + empty repo
      writeFileSync(
        path.join(dir, '.git', 'config'),
        '[remote "origin"]\n\turl = https://github.com/acme/my-app.git\n'
      );
      writeFileSync(path.join(dir, 'README.md'), '# My App');
      mockExecFileNoThrowSync.mockReturnValue({ stdout: 'ghp_token123\n', exitCode: 0 });

      // Phase 1: Detect provider
      const provider = detectProvider(dir);
      expect(provider).toEqual({ provider: 'github', owner: 'acme', repo: 'my-app' });

      // Phase 2: Detect credentials
      const token = detectCredentials(dir, provider!.provider);
      expect(token).toBe('ghp_token123');

      // Phase 3: Detect brownfield/greenfield
      const greenfield = isGreenfield(dir);
      expect(greenfield).toBe(true);

      // Phase 4: Apply smart defaults
      const config: Record<string, any> = {};
      applySmartDefaults(config, { adapter: 'claude', language: 'en', isGitRepo: true });
      expect(config.testing.defaultTestMode).toBe('TDD');

      // Phase 5: Generate summary banner
      const banner = formatSummaryBanner({
        projectName: 'my-app',
        provider: { name: 'GitHub', owner: provider!.owner, repo: provider!.repo },
        tracker: { name: 'GitHub Issues' },
        repoCount: 1,
        isGreenfield: greenfield,
        hasPendingClones: false,
        adapter: 'claude',
        language: 'en',
        defaults: {
          testing: config.testing.defaultTestMode,
          qualityGates: config.qualityGates.preset,
          lspEnabled: !!config.lsp?.enabled,
          gitHooksInstalled: true,
          translationEnabled: false,
        },
      });

      // Verify the full banner
      const stripped = banner.replace(/\x1B\[[0-9;]*m/g, '');
      expect(stripped).toContain('my-app');
      expect(stripped).toContain('GitHub');
      expect(stripped).toContain('acme/my-app');
      expect(stripped).toContain('TDD');
      expect(stripped).toContain('LSP');
      expect(stripped).not.toContain('/sw:living-docs'); // Greenfield = no living docs suggestion
    });

    it('full pipeline: GitHub single repo with code (brownfield)', () => {
      // Setup: GitHub remote + code
      writeFileSync(
        path.join(dir, '.git', 'config'),
        '[remote "origin"]\n\turl = https://github.com/corp/backend.git\n'
      );
      mkdirSync(path.join(dir, 'src'), { recursive: true });
      writeFileSync(path.join(dir, 'src', 'index.ts'), 'export const app = {};');
      writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
        dependencies: { express: '^4.0.0' },
      }));
      mockExecFileNoThrowSync.mockReturnValue({ stdout: '', exitCode: 1 });
      writeFileSync(path.join(dir, '.env'), 'GITHUB_TOKEN=env-token\n');

      const provider = detectProvider(dir);
      expect(provider?.provider).toBe('github');

      const token = detectCredentials(dir, 'github');
      expect(token).toBe('env-token');

      const greenfield = isGreenfield(dir);
      expect(greenfield).toBe(false); // Has source code

      const config: Record<string, any> = {};
      applySmartDefaults(config, { adapter: 'claude', language: 'es', isGitRepo: true });
      expect(config.translation.enabled).toBe(true);

      const banner = formatSummaryBanner({
        projectName: 'backend',
        provider: { name: 'GitHub', owner: 'corp', repo: 'backend' },
        tracker: { name: 'GitHub Issues' },
        repoCount: 1,
        isGreenfield: greenfield,
        hasPendingClones: false,
        adapter: 'claude',
        language: 'es',
        defaults: {
          testing: config.testing.defaultTestMode,
          qualityGates: config.qualityGates.preset,
          lspEnabled: true,
          gitHooksInstalled: true,
          translationEnabled: config.translation.enabled,
        },
      });

      const stripped = banner.replace(/\x1B\[[0-9;]*m/g, '');
      expect(stripped).toContain('/sw:living-docs'); // Brownfield = living docs suggestion
      expect(stripped).toContain('Auto-translation (es)');
    });

    it('full pipeline: ADO repo with no credentials', () => {
      writeFileSync(
        path.join(dir, '.git', 'config'),
        '[remote "origin"]\n\turl = https://dev.azure.com/myorg/project/_git/repo\n'
      );

      const provider = detectProvider(dir);
      expect(provider).toEqual({ provider: 'ado', organization: 'myorg' });

      const token = detectCredentials(dir, 'ado');
      expect(token).toBeNull(); // No ADO credentials
    });
  });

  // ─── Function size constraint ─────────────────────────────────

  describe('no function exceeds 200 lines', () => {
    it('provider-detection.ts functions are within limit', async () => {
      const content = await fsPromises.readFile(
        path.join(process.cwd(), 'src/cli/helpers/init/provider-detection.ts'),
        'utf-8'
      );
      // Each exported function should be under 200 lines
      const lines = content.split('\n').length;
      expect(lines).toBeLessThan(200);
    });

    it('greenfield-detection.ts functions are within limit', async () => {
      const content = await fsPromises.readFile(
        path.join(process.cwd(), 'src/cli/helpers/init/greenfield-detection.ts'),
        'utf-8'
      );
      const lines = content.split('\n').length;
      expect(lines).toBeLessThan(200);
    });

    it('smart-defaults.ts functions are within limit', async () => {
      const content = await fsPromises.readFile(
        path.join(process.cwd(), 'src/cli/helpers/init/smart-defaults.ts'),
        'utf-8'
      );
      const lines = content.split('\n').length;
      expect(lines).toBeLessThan(200);
    });

    it('summary-banner.ts functions are within limit', async () => {
      const content = await fsPromises.readFile(
        path.join(process.cwd(), 'src/cli/helpers/init/summary-banner.ts'),
        'utf-8'
      );
      const lines = content.split('\n').length;
      expect(lines).toBeLessThan(200);
    });

    it('prompt-flow.ts functions are within limit', async () => {
      const content = await fsPromises.readFile(
        path.join(process.cwd(), 'src/cli/helpers/init/prompt-flow.ts'),
        'utf-8'
      );
      const lines = content.split('\n').length;
      expect(lines).toBeLessThan(200);
    });
  });
});
