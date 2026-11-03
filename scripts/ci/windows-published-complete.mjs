import assert from 'node:assert/strict';
import { execFileSync, execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

assert.equal(process.platform, 'win32', 'Use a Windows runner');
const version = process.argv[2];
assert.match(version ?? '', /^\d+\.\d+\.\d+$/);
const inc = '0001-close-smoke';
const relativeIncrement = `.specweave/increments/${inc}`;
const env = {
  ...process.env,
  CI: 'true',
  NO_COLOR: '1',
  SW_HINT: 'wrong-folder',
  GIT_AUTHOR_NAME: 'SpecWeave smoke',
  GIT_AUTHOR_EMAIL: 'smoke@example.invalid',
  GIT_COMMITTER_NAME: 'SpecWeave smoke',
  GIT_COMMITTER_EMAIL: 'smoke@example.invalid',
};

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, env, encoding: 'utf8' }).trim();
}

function run(shell, cwd, command) {
  return execSync(command, { shell, cwd, env, encoding: 'utf8', timeout: 30_000 }).trim();
}

function smoke(shell, scenario) {
  const fixture = mkdtempSync(join(tmpdir(), 'sw-published-complete-'));
  try {
    const sensitive = scenario === 'linked shell-sensitive';
    const root = join(fixture, sensitive ? "workspace $SW_HINT ` %SW_HINT% !SW_HINT!" : 'workspace & space');
    mkdirSync(join(root, '.specweave'), { recursive: true });
    writeFileSync(join(root, '.specweave', 'config.json'), '{"version":"2.0","project":{"name":"close-smoke"}}');
    git(root, 'init', '-q');
    git(root, 'config', 'core.hooksPath', join(root, 'no-hooks'));

    assert.equal(run(shell, root, 'specweave.cmd --version'), version);
    run(shell, root, 'specweave.cmd create-increment "Close smoke" --no-commit');
    writeFileSync(join(root, relativeIncrement, 'spec.md'), '# Close smoke\n');
    run(shell, root, `specweave.cmd verify ${inc} --cmd "echo ok"`);
    git(root, 'add', '--', '.specweave');
    git(root, 'commit', '-qm', 'Seed the increment');

    const cwd = scenario === 'nested' ? join(root, 'nested') : join(fixture, 'linked');
    if (scenario === 'nested') {
      mkdirSync(cwd);
      git(cwd, 'init', '-q');
    } else {
      git(root, 'worktree', 'add', '-q', '--detach', cwd);
    }

    const originalHead = scenario === 'nested' ? null : git(cwd, 'rev-parse', 'HEAD');
    writeFileSync(join(root, 'unrelated.txt'), 'keep staged');
    git(root, 'add', '--', 'unrelated.txt');

    const output = run(shell, cwd, `specweave.cmd complete ${inc}`);
    console.log(`${shell} / ${scenario}\n${output}`);
    assert.match(output, /Increment .* completed!/);
    assert.equal(JSON.parse(readFileSync(join(root, relativeIncrement, 'metadata.json'), 'utf8')).status, 'completed');
    const lines = output.split(/\r?\n/);
    const hint = lines.indexOf('Run one line at a time. Continue only if the first succeeds.');
    assert.ok(hint >= 0, 'Expected the Windows Git instructions');
    const destination = lines[hint - 1]?.startsWith('Open a shell in the project folder: ');
    assert.equal(Boolean(destination), sensitive);
    if (destination) assert.equal(lines[hint - 1], `Open a shell in the project folder: ${root}`);
    const commands = lines.slice(hint + 1, hint + 3);
    assert.equal(commands.length, 2);
    for (const command of commands) {
      assert.match(command, /^git /);
      run(shell, destination ? root : cwd, command);
    }
    const committed = git(root, 'show', '--format=', '--name-only', 'HEAD').split(/\r?\n/);
    assert.ok(committed.includes(`${relativeIncrement}/metadata.json`));
    assert.ok(committed.every((file) => file.startsWith(`${relativeIncrement}/`)));
    assert.equal(git(root, 'diff', '--cached', '--name-only'), 'unrelated.txt');
    if (originalHead) assert.equal(git(cwd, 'rev-parse', 'HEAD'), originalHead);
    else assert.equal(git(cwd, 'status', '--porcelain'), '');
    console.log(`PASS ${shell} / ${scenario}: ${committed.join(', ')}; unrelated.txt still staged`);
  } finally {
    rmSync(fixture, { recursive: true, force: true, maxRetries: 3 });
  }
}

let failures = 0;
for (const shell of ['cmd.exe', 'powershell.exe', 'pwsh.exe']) {
  for (const scenario of ['nested', 'linked ordinary', 'linked shell-sensitive']) {
    try {
      smoke(shell, scenario);
    } catch (error) {
      failures++;
      console.error(`FAIL ${shell} / ${scenario}`, error);
    }
  }
}
console.log(`Published SpecWeave ${version}: ${9 - failures}/9 passed`);
process.exitCode = failures ? 1 : 0;
