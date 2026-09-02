/**
 * Regressions from the 2.0 release proofs — what `specweave init` does to a
 * plain single-repo project, and what it tells the user about it.
 *
 * 1. It scaffolded umbrella structure (`repositories/`) nobody asked for — and
 *    `repositories/` is itself the marker that says "this is an umbrella".
 * 2. It reported "Structure: Workspace (0 repositories)" for a single repo.
 * 3. It fetched a third-party skill from github.com unannounced and recorded it
 *    in a project lockfile.
 * 4. It said "Location: .claude/skills/ (project-local)" while rewriting the
 *    user's GLOBAL ~/.claude and ~/.specweave.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { shouldScaffoldWorkspaceDir } from '../../../../../src/cli/helpers/init/workspace-setup.js';
import { formatSummaryBanner } from '../../../../../src/cli/helpers/init/summary-banner.js';
import {
  ensureSkillCreator,
  skillCreatorOptedIn,
  SKILL_CREATOR_OPT_IN_ENV,
} from '../../../../../src/cli/helpers/init/skill-creator-installer.js';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-init-side-'));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('workspace scaffolding', () => {
  it('does NOT scaffold repositories/ in a plain single-repo project', () => {
    fs.mkdirSync(path.join(dir, 'src'));
    fs.writeFileSync(path.join(dir, 'package.json'), '{"name":"proj"}');
    fs.mkdirSync(path.join(dir, '.git'));
    fs.writeFileSync(path.join(dir, 'CLAUDE.md'), '# managed');

    expect(shouldScaffoldWorkspaceDir(dir)).toBe(false);
  });

  it('scaffolds for a greenfield dir that holds only SpecWeave files', () => {
    fs.mkdirSync(path.join(dir, '.specweave'));
    fs.writeFileSync(path.join(dir, 'CLAUDE.md'), '# managed');
    fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# managed');

    expect(shouldScaffoldWorkspaceDir(dir)).toBe(true);
  });

  it('keeps scaffolding for a directory that is already a workspace', () => {
    fs.mkdirSync(path.join(dir, 'repositories'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'package.json'), '{}');

    expect(shouldScaffoldWorkspaceDir(dir)).toBe(true);
  });
});

const bannerOptions = () => ({
  projectName: 'proj',
  adapter: 'claude',
  language: 'en',
  defaults: { testing: 'standard', lspEnabled: true, gitHooksInstalled: true },
});

describe('summary banner', () => {
  it('calls a project with no repositories a single repo, not a workspace', () => {
    const banner = formatSummaryBanner(bannerOptions());
    expect(banner).toContain('Single repo');
    expect(banner).not.toContain('Workspace (0');
  });

  it('still says Workspace when repositories exist', () => {
    const banner = formatSummaryBanner({
      ...bannerOptions(),
      umbrellaDiscovery: { totalRepoCount: 2, repos: [] } as never,
    });
    expect(banner).toContain('Workspace (2 repositories)');
  });
});

describe('skill-creator is opt-in (no silent network fetch during init)', () => {
  const original = process.env[SKILL_CREATOR_OPT_IN_ENV];

  afterEach(() => {
    if (original === undefined) delete process.env[SKILL_CREATOR_OPT_IN_ENV];
    else process.env[SKILL_CREATOR_OPT_IN_ENV] = original;
  });

  it('is off by default', () => {
    expect(skillCreatorOptedIn({})).toBe(false);
    expect(skillCreatorOptedIn({ [SKILL_CREATOR_OPT_IN_ENV]: '0' })).toBe(false);
    expect(skillCreatorOptedIn({ [SKILL_CREATOR_OPT_IN_ENV]: '' })).toBe(false);
  });

  it('is on when explicitly requested', () => {
    expect(skillCreatorOptedIn({ [SKILL_CREATOR_OPT_IN_ENV]: '1' })).toBe(true);
    expect(skillCreatorOptedIn({ [SKILL_CREATOR_OPT_IN_ENV]: 'true' })).toBe(true);
  });

  it('writes nothing to the project and touches no network when not opted in', async () => {
    delete process.env[SKILL_CREATOR_OPT_IN_ENV];
    const before = fs.readdirSync(dir);

    const result = await ensureSkillCreator(dir);

    expect(result.installed).toBe(false);
    expect(result.reason).toBe('opt-in-required');
    expect(fs.readdirSync(dir)).toEqual(before);
    expect(fs.existsSync(path.join(dir, 'vskill.lock'))).toBe(false);
    expect(fs.existsSync(path.join(dir, '.claude', 'skills', 'skill-creator'))).toBe(false);
  });
});
