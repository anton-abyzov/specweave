/**
 * Integration tests for skill-context.sh DCI loader
 *
 * Tests the shared context script that skills call via DCI blocks:
 *   ## Project Context
 *   !`.specweave/scripts/skill-context.sh <skill> 2>/dev/null; true`
 *
 * @module tests/integration/hooks/skill-context-loader
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const SCRIPT_PATH = path.join(process.cwd(), 'plugins/specweave/scripts/skill-context.sh');

/**
 * Run skill-context.sh in a given working directory.
 */
function runScript(cwd: string, skill = 'test'): { stdout: string; status: number } {
  const result = spawnSync('sh', [SCRIPT_PATH, skill], {
    cwd,
    encoding: 'utf-8',
    env: { ...process.env, HOME: os.homedir() },
  });
  return {
    stdout: (result.stdout || '').trim(),
    status: result.status ?? 1,
  };
}

/**
 * Create a minimal .specweave/config.json for testing.
 */
function createConfig(dir: string, config: Record<string, unknown>): void {
  const configDir = path.join(dir, '.specweave');
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(path.join(configDir, 'config.json'), JSON.stringify(config, null, 2));
}

/**
 * Create an increment with metadata.json and optional tasks.md.
 */
function createIncrement(
  dir: string,
  id: string,
  status: string,
  tasks?: { total: number; done: number }
): void {
  const incDir = path.join(dir, '.specweave', 'increments', id);
  fs.mkdirSync(incDir, { recursive: true });
  fs.writeFileSync(
    path.join(incDir, 'metadata.json'),
    JSON.stringify({ id, status }, null, 2)
  );

  if (tasks) {
    const lines: string[] = ['# Tasks'];
    for (let i = 0; i < tasks.done; i++) {
      lines.push(`- [x] Task ${i + 1}`);
    }
    for (let i = tasks.done; i < tasks.total; i++) {
      lines.push(`- [ ] Task ${i + 1}`);
    }
    fs.writeFileSync(path.join(incDir, 'tasks.md'), lines.join('\n') + '\n');
  }
}

describe('skill-context.sh', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-ctx-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('exit code safety', () => {
    it('exits 0 when run outside SpecWeave project', () => {
      const { status, stdout } = runScript(tmpDir);
      expect(status).toBe(0);
      expect(stdout).toBe('');
    });

    it('exits 0 when .specweave/ exists but config.json is missing', () => {
      fs.mkdirSync(path.join(tmpDir, '.specweave'), { recursive: true });
      const { status } = runScript(tmpDir);
      expect(status).toBe(0);
    });

    it('exits 0 with malformed config.json', () => {
      fs.mkdirSync(path.join(tmpDir, '.specweave'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, '.specweave', 'config.json'), '{ invalid json }}}');
      const { status } = runScript(tmpDir);
      expect(status).toBe(0);
    });
  });

  describe('[config] section', () => {
    it('outputs config section when config.json exists', () => {
      createConfig(tmpDir, {
        testing: { defaultTestMode: 'TDD', tddEnforcement: 'strict' },
        planning: { deepInterview: { enabled: true } },
        auto: { maxRetries: 15 },
      });

      const { stdout } = runScript(tmpDir);
      expect(stdout).toContain('[config]');
      expect(stdout).toContain('testing.mode=TDD');
      expect(stdout).toContain('testing.enforcement=strict');
      expect(stdout).toContain('planning.deepInterview=true');
      expect(stdout).toContain('auto.maxIterations=15');
    });

    it('omits missing config fields gracefully', () => {
      createConfig(tmpDir, {
        testing: { defaultTestMode: 'test-after' },
      });

      const { stdout } = runScript(tmpDir);
      expect(stdout).toContain('testing.mode=test-after');
      expect(stdout).not.toContain('planning.deepInterview');
      expect(stdout).not.toContain('auto.maxIterations');
    });

    it('outputs boolean false as "false" (not empty)', () => {
      createConfig(tmpDir, {
        planning: { deepInterview: { enabled: false } },
      });

      const { stdout } = runScript(tmpDir);
      expect(stdout).toContain('planning.deepInterview=false');
    });

    it('outputs numeric zero as "0" (not empty)', () => {
      createConfig(tmpDir, {
        auto: { maxRetries: 0 },
      });

      const { stdout } = runScript(tmpDir);
      expect(stdout).toContain('auto.maxIterations=0');
    });
  });

  describe('[project] section', () => {
    it('detects node project from package.json', () => {
      createConfig(tmpDir, {});
      fs.writeFileSync(path.join(tmpDir, 'package.json'), '{"dependencies":{}}');

      const { stdout } = runScript(tmpDir);
      expect(stdout).toContain('[project]');
      expect(stdout).toContain('tech=node');
    });

    it('detects typescript from tsconfig.json', () => {
      createConfig(tmpDir, {});
      fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
      fs.writeFileSync(path.join(tmpDir, 'tsconfig.json'), '{}');

      const { stdout } = runScript(tmpDir);
      expect(stdout).toContain('node,typescript');
    });

    it('detects React from package.json dependencies', () => {
      createConfig(tmpDir, {});
      fs.writeFileSync(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ dependencies: { react: '^18.0.0' } })
      );

      const { stdout } = runScript(tmpDir);
      expect(stdout).toContain('react');
    });

    it('reads multi-repo flag from config', () => {
      createConfig(tmpDir, { multiProject: { enabled: true } });
      fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');

      const { stdout } = runScript(tmpDir);
      expect(stdout).toContain('multi-repo=true');
    });

    it('reads org from sync.github.owner', () => {
      createConfig(tmpDir, { sync: { github: { owner: 'my-org' } } });
      fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');

      const { stdout } = runScript(tmpDir);
      expect(stdout).toContain('org=my-org');
    });

    it('detects Python from requirements.txt', () => {
      createConfig(tmpDir, {});
      fs.writeFileSync(path.join(tmpDir, 'requirements.txt'), 'flask==2.0\n');

      const { stdout } = runScript(tmpDir);
      expect(stdout).toContain('python');
    });

    it('detects Python from pyproject.toml', () => {
      createConfig(tmpDir, {});
      fs.writeFileSync(path.join(tmpDir, 'pyproject.toml'), '[project]\nname="app"\n');

      const { stdout } = runScript(tmpDir);
      expect(stdout).toContain('python');
    });

    it('detects Go from go.mod', () => {
      createConfig(tmpDir, {});
      fs.writeFileSync(path.join(tmpDir, 'go.mod'), 'module example.com/app\n');

      const { stdout } = runScript(tmpDir);
      expect(stdout).toContain('go');
    });

    it('detects Rust from Cargo.toml', () => {
      createConfig(tmpDir, {});
      fs.writeFileSync(path.join(tmpDir, 'Cargo.toml'), '[package]\nname="app"\n');

      const { stdout } = runScript(tmpDir);
      expect(stdout).toContain('rust');
    });

    it('detects Java from pom.xml', () => {
      createConfig(tmpDir, {});
      fs.writeFileSync(path.join(tmpDir, 'pom.xml'), '<project></project>');

      const { stdout } = runScript(tmpDir);
      expect(stdout).toContain('java');
    });

    it('detects Java from build.gradle', () => {
      createConfig(tmpDir, {});
      fs.writeFileSync(path.join(tmpDir, 'build.gradle'), 'plugins { }');

      const { stdout } = runScript(tmpDir);
      expect(stdout).toContain('java');
    });

    it('outputs multi-repo=false by default', () => {
      createConfig(tmpDir, {});
      fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');

      const { stdout } = runScript(tmpDir);
      expect(stdout).toContain('multi-repo=false');
    });

    it('skips project section when no markers detected', () => {
      createConfig(tmpDir, {});
      // No package.json, no tsconfig, no config with org

      const { stdout } = runScript(tmpDir);
      expect(stdout).not.toContain('[project]');
    });
  });

  describe('[increment] section', () => {
    it('outputs active increment details', () => {
      createConfig(tmpDir, {});
      createIncrement(tmpDir, '0205-skill-fabric', 'in-progress', { total: 10, done: 3 });

      const { stdout } = runScript(tmpDir);
      expect(stdout).toContain('[increment]');
      expect(stdout).toContain('active=0205-skill-fabric');
      expect(stdout).toContain('status=in-progress');
      expect(stdout).toContain('completion=30%');
    });

    it('skips increment section when no active increment', () => {
      createConfig(tmpDir, {});
      createIncrement(tmpDir, '0001-done', 'completed');

      const { stdout } = runScript(tmpDir);
      expect(stdout).not.toContain('[increment]');
    });

    it('skips increment section when no increments directory', () => {
      createConfig(tmpDir, {});

      const { stdout } = runScript(tmpDir);
      expect(stdout).not.toContain('[increment]');
    });

    it('handles increment without tasks.md', () => {
      createConfig(tmpDir, {});
      createIncrement(tmpDir, '0205-test', 'in-progress');

      const { stdout } = runScript(tmpDir);
      expect(stdout).toContain('active=0205-test');
      expect(stdout).not.toContain('completion=');
    });

    it('picks first in-progress increment when multiple exist', () => {
      createConfig(tmpDir, {});
      createIncrement(tmpDir, '0001-first', 'in-progress');
      createIncrement(tmpDir, '0002-second', 'in-progress');

      const { stdout } = runScript(tmpDir);
      // Should find one of them (filesystem order may vary)
      expect(stdout).toContain('[increment]');
      expect(stdout).toContain('status=in-progress');
    });

    it('shows completion=0% when all tasks pending', () => {
      createConfig(tmpDir, {});
      createIncrement(tmpDir, '0205-zero', 'in-progress', { total: 5, done: 0 });

      const { stdout } = runScript(tmpDir);
      expect(stdout).toContain('completion=0%');
    });

    it('shows completion=100% when all tasks done', () => {
      createConfig(tmpDir, {});
      createIncrement(tmpDir, '0205-full', 'in-progress', { total: 8, done: 8 });

      const { stdout } = runScript(tmpDir);
      expect(stdout).toContain('completion=100%');
    });

    it('ignores previousStatus field containing in-progress', () => {
      createConfig(tmpDir, {});
      const incDir = path.join(tmpDir, '.specweave', 'increments', '0001-trap');
      fs.mkdirSync(incDir, { recursive: true });
      fs.writeFileSync(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({
          id: '0001-trap',
          status: 'completed',
          previousStatus: 'in-progress',
        }, null, 2)
      );

      const { stdout } = runScript(tmpDir);
      expect(stdout).not.toContain('[increment]');
    });
  });

  describe('hardening: single-line JSON', () => {
    it('detects in-progress from compact (single-line) metadata.json', () => {
      createConfig(tmpDir, {});
      const incDir = path.join(tmpDir, '.specweave', 'increments', '0010-compact');
      fs.mkdirSync(incDir, { recursive: true });
      // Minified JSON — no newlines, no indentation
      fs.writeFileSync(
        path.join(incDir, 'metadata.json'),
        '{"id":"0010-compact","status":"in-progress"}'
      );

      const { stdout } = runScript(tmpDir);
      expect(stdout).toContain('[increment]');
      expect(stdout).toContain('active=0010-compact');
    });
  });

  describe('hardening: empty config', () => {
    it('does not emit [config] header for empty config {}', () => {
      createConfig(tmpDir, {});

      const { stdout } = runScript(tmpDir);
      expect(stdout).not.toContain('[config]');
    });
  });

  describe('hardening: C# detection', () => {
    it('detects C# from .csproj file', () => {
      createConfig(tmpDir, {});
      fs.writeFileSync(path.join(tmpDir, 'MyApp.csproj'), '<Project></Project>');

      const { stdout } = runScript(tmpDir);
      expect(stdout).toContain('csharp');
    });

    it('detects C# from .sln file', () => {
      createConfig(tmpDir, {});
      fs.writeFileSync(path.join(tmpDir, 'MyApp.sln'), 'Microsoft Visual Studio Solution File');

      const { stdout } = runScript(tmpDir);
      expect(stdout).toContain('csharp');
    });
  });

  describe('hardening: multi-tech simultaneous detection', () => {
    it('detects 5+ techs when all markers present', () => {
      createConfig(tmpDir, {});
      fs.writeFileSync(path.join(tmpDir, 'package.json'), '{"dependencies":{"react":"18"}}');
      fs.writeFileSync(path.join(tmpDir, 'tsconfig.json'), '{}');
      fs.writeFileSync(path.join(tmpDir, 'go.mod'), 'module app\n');
      fs.writeFileSync(path.join(tmpDir, 'Cargo.toml'), '[package]\n');
      fs.writeFileSync(path.join(tmpDir, 'pom.xml'), '<project/>');

      const { stdout } = runScript(tmpDir);
      const techLine = stdout.split('\n').find(l => l.startsWith('tech=')) || '';
      expect(techLine).toContain('node');
      expect(techLine).toContain('typescript');
      expect(techLine).toContain('go');
      expect(techLine).toContain('rust');
      expect(techLine).toContain('java');
      expect(techLine).toContain('react');
    });
  });

  describe('hardening: grep fallback (no jq)', () => {
    function runScriptNoJq(cwd: string, skill = 'test'): { stdout: string; status: number } {
      // Override PATH to hide jq — only keep essential system dirs
      const minimalPath = '/usr/bin:/bin:/usr/sbin:/sbin';
      const result = spawnSync('sh', [SCRIPT_PATH, skill], {
        cwd,
        encoding: 'utf-8',
        env: { ...process.env, PATH: minimalPath, HOME: os.homedir() },
      });
      return {
        stdout: (result.stdout || '').trim(),
        status: result.status ?? 1,
      };
    }

    it('extracts config values without jq via grep fallback', () => {
      createConfig(tmpDir, {
        testing: { defaultTestMode: 'TDD', tddEnforcement: 'strict' },
        auto: { maxRetries: 10 },
        sync: { github: { owner: 'my-org' } },
      });
      fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');

      const { stdout, status } = runScriptNoJq(tmpDir);
      expect(status).toBe(0);
      expect(stdout).toContain('testing.mode=TDD');
      expect(stdout).toContain('testing.enforcement=strict');
      expect(stdout).toContain('auto.maxIterations=10');
      expect(stdout).toContain('org=my-org');
    });

    it('exits 0 without jq and with empty config', () => {
      createConfig(tmpDir, {});

      const { status } = runScriptNoJq(tmpDir);
      expect(status).toBe(0);
    });

    it('prefers sync.github.owner over other owner keys', () => {
      createConfig(tmpDir, {
        sync: {
          jira: { owner: 'jira-owner' },
          github: { owner: 'github-owner' },
        },
      });
      fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');

      const { stdout } = runScriptNoJq(tmpDir);
      expect(stdout).toContain('org=github-owner');
    });
  });

  describe('output size', () => {
    it('total output stays under 500 chars', () => {
      createConfig(tmpDir, {
        testing: { defaultTestMode: 'TDD', tddEnforcement: 'strict' },
        planning: { deepInterview: { enabled: true } },
        auto: { maxRetries: 20 },
        multiProject: { enabled: false },
        sync: { github: { owner: 'my-organization-name' } },
      });
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
        dependencies: { react: '18', next: '14', vue: '3' },
      }));
      fs.writeFileSync(path.join(tmpDir, 'tsconfig.json'), '{}');
      createIncrement(tmpDir, '0205-very-long-increment-name-here', 'in-progress', { total: 100, done: 42 });

      const { stdout } = runScript(tmpDir);
      expect(stdout.length).toBeLessThan(500);
    });
  });

  describe('full cycle with real project', () => {
    it('produces valid output for the actual SpecWeave project', () => {
      const { stdout, status } = runScript(process.cwd(), 'do');
      expect(status).toBe(0);
      expect(stdout).toContain('[config]');
      expect(stdout).toContain('testing.mode=TDD');
      expect(stdout).toContain('[project]');
      expect(stdout).toContain('node');
      expect(stdout).toContain('typescript');
    });
  });
});
