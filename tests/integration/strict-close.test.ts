import { expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const cli = path.resolve(__dirname, '../../bin/specweave.js');

it('requires real owning product checks and a fresh ship review only under strict closure', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-strict-'));
  try {
    const id = '0001-strict-fixture';
    const owner = 'repositories/org/product';
    const config = path.join(root, '.specweave/config.json');
    const inc = path.join(root, '.specweave/increments', id);
    fs.mkdirSync(path.join(root, owner), { recursive: true });
    fs.mkdirSync(path.dirname(config), { recursive: true });
    const run = (...args: string[]) => {
      const result = spawnSync(process.execPath, [cli, ...args], {
        cwd: root, encoding: 'utf8', timeout: 20_000,
        env: { ...process.env, SPECWEAVE_WORKSPACE: root },
      });
      if (result.error) throw result.error;
      return { code: result.status, text: result.stdout + result.stderr };
    };
    const test = 'node -e "process.exit(0)"';
    const configure = (strictClose: boolean, ownerCommands?: Record<string, string[]>) =>
      fs.writeFileSync(config, JSON.stringify({ testing: { strictClose, commands: [test], ownerCommands } }));
    const spec = `# Fixture

## Acceptance Criteria
- [x] AC-01: Product check.

## Tasks
### T-01 Verify and close
- Files: ${owner}/src/file.ts | Test: ${test}
`;
    configure(true);
    expect(run('create-increment', 'Fixture', '--id', id, '--no-commit')).toMatchObject({ code: 0 });
    fs.writeFileSync(path.join(inc, 'spec.md'), spec.replace('### T-01 Verify and close', '### T-01'));
    expect(run('verify', id)).toMatchObject({ code: 1 });
    fs.writeFileSync(path.join(inc, 'spec.md'), spec);
    expect(run('verify', id)).toMatchObject({ code: 1, text: expect.stringContaining('No testing.ownerCommands') });
    expect(run('complete', id, '--reason', 'skip')).toMatchObject({ code: 1 });
    fs.writeFileSync(config, JSON.stringify({ testing: { strictClose: true, commands: ['node -e "process.exit(98)"'] } }));
    expect(run('verify', id, '--cmd', test)).toMatchObject({ code: 1, text: expect.stringContaining('exit 98') });
    const cmd = 'node -e "process.exit(require(\'fs\').existsSync(\'ready\') ? 0 : 99)"';
    configure(true, { [owner]: [cmd] });
    expect(run('verify', id)).toMatchObject({ code: 1, text: expect.stringContaining('exit 99') });
    fs.writeFileSync(path.join(root, owner, 'ready'), '');
    expect(run('verify', id)).toMatchObject({ code: 0 });
    const receipt = JSON.parse(fs.readFileSync(path.join(inc, 'reports/verify.json'), 'utf8'));
    expect(receipt.commands).toContainEqual({ cmd, cwd: owner, exit: 0, source: 'config testing.ownerCommands' });
    expect(run('complete', id, '--skip-validation')).toMatchObject({ code: 1, text: expect.stringContaining('T-01') });
    expect(run('task', 'done', 'T-01', id, '--run', test)).toMatchObject({ code: 0 });
    expect(run('complete', id)).toMatchObject({ code: 1, text: expect.stringContaining('no reports/review.md') });
    const review = path.join(inc, 'reports/review.md');
    fs.writeFileSync(review, 'Verdict: ship\n');
    fs.utimesSync(review, 1, 1);
    expect(run('complete', id)).toMatchObject({ code: 1, text: expect.stringContaining('predates verification') });
    fs.writeFileSync(review, 'Verdict: fix first\n');
    expect(run('complete', id)).toMatchObject({ code: 1, text: expect.stringContaining('fix first') });
    fs.writeFileSync(review, 'Verdict: ship\n');
    configure(true, { [owner]: [test] });
    expect(run('complete', id)).toMatchObject({ code: 1, text: expect.stringContaining('has changed') });
    configure(true, { [owner]: [cmd] });
    const goodConfig = fs.readFileSync(config, 'utf8');
    fs.writeFileSync(config, goodConfig.slice(0, -1) + ',}');
    expect(run('complete', id, '--skip-validation')).toMatchObject({ code: 1 });
    fs.writeFileSync(config, JSON.stringify({ ...JSON.parse(goodConfig), review: { crossModel: true } }));
    const crossReview = path.join(inc, 'reports/review-other.md');
    fs.writeFileSync(crossReview, 'Verdict: fix first\n');
    fs.utimesSync(crossReview, 1, 1);
    expect(run('complete', id)).toMatchObject({ code: 1, text: expect.stringContaining('Review policy (review.crossModel)') });
    // review.crossModel requires a recorded review by another family, at the code being closed.
    fs.writeFileSync(crossReview, 'Verdict: ship\n');
    expect(run('complete', id)).toMatchObject({ code: 1, text: expect.stringContaining('review.crossModel') });
    const product = path.join(root, owner);
    const git = (...args: string[]) => spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', '-c', 'commit.gpgsign=false', ...args], { cwd: product, encoding: 'utf8' });
    fs.mkdirSync(path.join(product, 'src'), { recursive: true });
    fs.writeFileSync(path.join(product, 'src/file.ts'), 'export {};\n');
    git('init', '-q', '-b', 'main');
    git('add', '-A');
    git('commit', '-qm', 'product');
    const head = git('rev-parse', 'HEAD').stdout.trim();
    fs.writeFileSync(crossReview, `<!-- specweave review: reviewer=gpt-6.1-sol model=gpt-6.1-sol family=openai repo=${owner} head=${head} at=${new Date().toISOString()} -->\n# Review\nVerdict: ship\n`);
    expect(run('complete', id)).toMatchObject({ code: 0 });
    expect(JSON.parse(fs.readFileSync(path.join(inc, 'metadata.json'), 'utf8')).status).toBe('completed');

    configure(false);
    const legacy = '0002-legacy-fixture';
    expect(run('create-increment', 'Legacy', '--id', legacy, '--no-commit')).toMatchObject({ code: 0 });
    fs.writeFileSync(path.join(root, '.specweave/increments', legacy, 'spec.md'), spec);
    expect(run('verify', legacy)).toMatchObject({ code: 0 });
    expect(run('complete', legacy)).toMatchObject({ code: 0 });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 90_000);
