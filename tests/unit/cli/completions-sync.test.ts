import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
// @ts-expect-error - plain ESM helper, no type declarations
import { parseCliCommands, visibleCommandNames } from '../../../scripts/completions/parse-cli.mjs';
// @ts-expect-error - plain ESM helper, no type declarations
import { generateAll } from '../../../scripts/completions/generate.mjs';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const BIN_PATH = path.join(REPO_ROOT, 'bin', 'specweave.js');
const COMPLETIONS_DIR = path.join(REPO_ROOT, 'scripts', 'completions');

const binSource = readFileSync(BIN_PATH, 'utf8');
const commands = parseCliCommands(binSource) as Array<{
  name: string;
  hidden: boolean;
  subcommands: Array<{ name: string }>;
}>;

describe('CLI command registrations', () => {
  it('registers a non-trivial number of top-level commands', () => {
    expect(commands.length).toBeGreaterThan(30);
  });

  it('every dynamically imported handler module exists in src/', () => {
    const missing: string[] = [];
    const importRe = /await import\('\.\.\/dist\/(src\/[^']+)\.js'\)/g;
    let match: RegExpExecArray | null;
    while ((match = importRe.exec(binSource)) !== null) {
      const sourcePath = path.join(REPO_ROOT, `${match[1]}.ts`);
      if (!existsSync(sourcePath) && !existsSync(sourcePath.replace(/\.ts$/, '.tsx'))) {
        missing.push(match[1]);
      }
    }
    expect(missing).toEqual([]);
  });

  it('does not register the removed refresh-marketplace verb', () => {
    expect(visibleCommandNames(commands)).not.toContain('refresh-marketplace');
    expect(binSource).not.toContain('refresh-marketplace');
  });
});

describe('shell completions stay in sync with bin/specweave.js', () => {
  const generated = generateAll(binSource) as Record<string, string>;

  for (const fileName of ['specweave.bash', 'specweave.zsh', 'specweave.fish']) {
    it(`${fileName} matches the generator output`, () => {
      const onDisk = readFileSync(path.join(COMPLETIONS_DIR, fileName), 'utf8');
      expect(onDisk).toBe(generated[fileName]);
    });
  }

  it('the completion word lists contain exactly the registered visible commands', () => {
    const expected = visibleCommandNames(commands) as string[];

    const bash = readFileSync(path.join(COMPLETIONS_DIR, 'specweave.bash'), 'utf8');
    const bashWords = /local main_commands="([^"]+)"/.exec(bash)?.[1].split(' ') ?? [];
    expect(bashWords).toEqual(expected);

    const fish = readFileSync(path.join(COMPLETIONS_DIR, 'specweave.fish'), 'utf8');
    const fishWords = /^set -l commands (.+)$/m.exec(fish)?.[1].split(' ') ?? [];
    expect(fishWords).toEqual(expected);

    const zsh = readFileSync(path.join(COMPLETIONS_DIR, 'specweave.zsh'), 'utf8');
    const zshWords = [...zsh.matchAll(/^ {4}'([a-z0-9-]+):/gm)].map((m) => m[1]);
    expect(zshWords).toEqual(expected);
  });

  it('advertises no verb the CLI does not register', () => {
    const registered = new Set(visibleCommandNames(commands) as string[]);
    for (const stale of ['sync-scheduled', 'sync-progress', 'validate-jira', 'set-sync-target', 'refresh-marketplace']) {
      expect(registered.has(stale)).toBe(false);
      for (const fileName of ['specweave.bash', 'specweave.zsh', 'specweave.fish']) {
        const content = readFileSync(path.join(COMPLETIONS_DIR, fileName), 'utf8');
        expect(content).not.toContain(stale);
      }
    }
  });
});
