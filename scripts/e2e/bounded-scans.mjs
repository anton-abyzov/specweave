import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = process.env.SW_TEST_REPO || fileURLToPath(new URL('../../', import.meta.url));
const bin = path.join(repo, 'bin/specweave.js');
const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), '0882-cli-')));
const mkdir = p => fs.mkdirSync(p, { recursive: true });
const write = (p, text = '{}') => { mkdir(path.dirname(p)); fs.writeFileSync(p, text); };
const cli = (cwd, args, expected = 0) => {
  const started = Date.now();
  const run = spawnSync(process.execPath, [bin, ...args], {
    cwd, encoding: 'utf8', timeout: 20000,
    env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', PWDEBUG: '0', PLAYWRIGHT_HTML_OPEN: 'never' },
  });
  assert.ifError(run.error);
  const output = run.stdout + run.stderr;
  assert.equal(run.status, expected, `${args.join(' ')}: ${output}`);
  console.log(`PASS ${args.join(' ')}: exit ${run.status}, ${Date.now() - started} ms`);
  return output;
};
const git = (cwd, args) => {
  const r = spawnSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', ...args], { cwd, encoding: 'utf8', timeout: 10000 });
  assert.equal(r.status, 0, r.stderr);
};
try {
  const bare = path.join(tmp, 'bare');
  mkdir(path.join(bare, '.specweave'));
  write(path.join(tmp, 'external/repo/app.ts'), 'export {};');
  fs.symlinkSync(path.join(tmp, 'external'), path.join(bare, 'repositories'), 'dir');
  fs.symlinkSync(path.join(tmp, 'external'), path.join(bare, 'escape'), 'dir');
  mkdir(path.join(bare, ...Array(30).fill('deep')));
  for (const args of [
    ['living-docs'], ['gc'], ['dashboard', '--no-browser'],
    ['lsp', 'setup', '--dry-run'], ['lsp', 'search', 'foo'],
    ['lsp', 'refs', 'missing.ts', 'foo'], ['lsp', 'def', 'missing.ts', 'foo'],
    ['lsp', 'hover', 'missing.ts', 'foo'], ['lsp', 'symbols', 'missing.ts'],
    ['lsp', 'warmup'], ['lsp', 'status'],
  ]) {
    const output = cli(bare, args, 1);
    assert.match(output, /No SpecWeave project found/);
    assert.ok(output.includes(bare));
    assert.match(output, /specweave init/);
  }
  const quiet = cli(bare, ['lsp', 'warmup', '--quiet'], 1);
  assert.equal(quiet, '');
  assert.match(JSON.parse(cli(bare, ['gc', '--json'], 1)).error, /No SpecWeave project found/);
  assert.match(cli(bare, ['save', '--dry-run', '--no-push'], 1), /Not inside a git repository/);
  const greenfield = await import(pathToFileURL(path.join(repo, 'dist/src/cli/helpers/init/greenfield-detection.js')));
  assert.equal(greenfield.isGreenfieldDetailed(bare).isGreenfield, true);
  const discovery = await import(pathToFileURL(path.join(repo, 'dist/src/core/living-docs/discovery.js')));
  let total = 0;
  const result = await discovery.runDiscovery(bare, [], (_current, count) => { total = count; });
  assert.equal(total, result.codebaseStats.totalDirs);
  assert.equal(total, 16);
  console.log('PASS symlink escape and discovery depth: counted = scanned = 16');

  const project = path.join(tmp, 'project');
  write(path.join(project, '.specweave/config.json'));
  write(path.join(project, 'app.ts'), 'export {};');
  mkdir(path.join(project, 'src'));
  assert.match(cli(path.join(project, 'src'), ['lsp', 'setup', '--dry-run', '--min-files', '1']), /TypeScript/);
  assert.ok(JSON.parse(cli(path.join(project, 'src'), ['gc', '--json'])).stateDir.startsWith(project));
  git(project, ['init', '-q']);
  git(project, ['add', '.']);
  git(project, ['commit', '-qm', 'fixture']);
  for (const name of ['a', 'b']) {
    const child = path.join(project, 'repositories/org', name);
    mkdir(path.join(child, '.specweave/state'));
    git(child, ['init', '-q']);
    git(child, ['commit', '--allow-empty', '-qm', 'fixture']);
  }
  const output = cli(path.join(project, 'repositories/org/a/.specweave'), ['save', '--dry-run', '--no-push']);
  assert.match(output, /Mode: Workspace \(1 repository\)/);
  assert.doesNotMatch(output, /Auto-detected/);
  assert.match(cli(project, ['save', '--dry-run', '--no-push']), /Auto-detected 2 nested repositories/);
  console.log('BLACKBOX: PASS');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
