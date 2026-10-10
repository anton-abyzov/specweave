import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFile, readFile, symlink, lstat, chmod, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fixture, patchManifest } from './helpers.mjs';
import { checkpoint, restore, git, safePath } from '../lib/checkpoint.mjs';
import { hash, SECRET, redact } from '../lib/util.mjs';
test('dirty tracked file restores into real isolated worktree with base/hash checks', async t => {
  const f = await fixture(t); await writeFile(join(f.repo, 'main.txt'), 'dirty change\n'); await writeFile(join(f.repo, 'untracked.txt'), 'keep outside checkpoint');
  const saved = await checkpoint(f.root, f.repo, ['main.txt']);
  assert.deepEqual(saved.paths, ['main.txt']); const target = join(f.base, 'restored');
  const result = await restore(f.root, saved.id, target);
  assert.equal(result.status, 'restored'); assert.equal(await readFile(join(target, 'main.txt'), 'utf8'), 'dirty change\n');
  await assert.rejects(readFile(join(target, 'untracked.txt')), { code: 'ENOENT' });
  assert.equal((await git(target, ['rev-parse', 'HEAD'])).trim(), saved.baseSha); assert.match(await git(target, ['status', '--short']), / M main.txt/);
  assert.equal(await readFile(join(f.repo, 'main.txt'), 'utf8'), 'dirty change\n');
});
test('checkpoint rejects untracked, absolute/traversal, env, keys, symlinks and quoted JSON secrets', async t => {
  const f = await fixture(t);
  for (const p of ['/etc/passwd', '../escape', 'a/../b', '.env', '.env.local', 'secrets.json', 'private-key.pem', 'credentials/data', 'foo\\bar']) assert.throws(() => safePath(p), /denied|Unsafe/);
  await writeFile(join(f.repo, 'untracked.txt'), 'plain'); await assert.rejects(checkpoint(f.root, f.repo, ['untracked.txt']), /Untracked/);
  await symlink('main.txt', join(f.repo, 'linked')); await git(f.repo, ['add', 'linked']); await assert.rejects(checkpoint(f.root, f.repo, ['linked']), /Symlink/);
  const text = '{"refresh_token":"SyntheticCredential123456","api_key":"SyntheticCredential234567"}';
  assert.equal(SECRET.test(text), true); const safe = redact(text); assert.ok(!safe.includes('SyntheticCredential')); assert.ok(safe.includes('[REDACTED]'));
  await writeFile(join(f.repo, 'main.txt'), text); await assert.rejects(checkpoint(f.root, f.repo, ['main.txt']), /Sensitive/);
});
test('tracked base secret remains denied even after dirty working file removes it', async t => {
  const f = await fixture(t); await writeFile(join(f.repo, 'config.json'), '{"api_key":"SyntheticBaseSecret12345"}');
  await git(f.repo, ['add', 'config.json']); await git(f.repo, ['commit', '-qm', 'sensitive base fixture']); await writeFile(join(f.repo, 'config.json'), '{}');
  await assert.rejects(checkpoint(f.root, f.repo, ['config.json']), /tracked base/);
});
test('restoration preserves executable permissions and supports explicitly staged additions', async t => {
  const f = await fixture(t); await writeFile(join(f.repo, 'main.txt'), 'changed executable\n'); await chmod(join(f.repo, 'main.txt'), 0o755);
  await writeFile(join(f.repo, 'new-script.sh'), '#!/bin/sh\nexit 0\n', { mode: 0o755 }); await git(f.repo, ['add', 'new-script.sh']);
  const saved = await checkpoint(f.root, f.repo, ['main.txt', 'new-script.sh']), target = join(f.base, 'with-addition');
  await restore(f.root, saved.id, target);
  assert.equal((await lstat(join(target, 'main.txt'))).mode & 0o777, 0o755);
  assert.equal((await lstat(join(target, 'new-script.sh'))).mode & 0o777, 0o755);
  assert.equal(await readFile(join(target, 'new-script.sh'), 'utf8'), '#!/bin/sh\nexit 0\n');
});
test('staged deletion restores without requiring an entry in the capture-time index', async t => {
  const f = await fixture(t); await git(f.repo, ['rm', 'main.txt']);
  const saved = await checkpoint(f.root, f.repo, ['main.txt']), target = join(f.base, 'deleted-file');
  await restore(f.root, saved.id, target); await assert.rejects(lstat(join(target, 'main.txt')), { code: 'ENOENT' });
  assert.match(await git(target, ['status', '--short']), / D main.txt/);
});
test('excluded sensitive dirty paths do not block allowlisted capture or leak into metadata', async t => {
  const f = await fixture(t); await writeFile(join(f.repo, 'auth-view.txt'), 'baseline'); await git(f.repo, ['add', 'auth-view.txt']); await git(f.repo, ['commit', '-qm', 'tracked unrelated view']);
  await writeFile(join(f.repo, 'auth-view.txt'), '{"refresh_token":"SyntheticExcludedCredential12345"}'); await writeFile(join(f.repo, 'main.txt'), 'captured safely\n');
  const saved = await checkpoint(f.root, f.repo, ['main.txt']);
  assert.deepEqual(saved.paths, ['main.txt']); assert.equal(saved.omittedDirtyCount, 1); assert.equal(saved.omittedSensitivePathCount, 1); assert.deepEqual(saved.omittedDirtyPaths, []);
  const manifest = await readFile(saved.file, 'utf8'); assert.ok(!manifest.includes('auth-view')); assert.ok(!manifest.includes('SyntheticExcluded'));
  const before = await readdir(join(f.root, 'checkpoints'));
  await assert.rejects(checkpoint(f.root, f.repo, ['auth-view.txt']), /Sensitive/);
  assert.deepEqual(await readdir(join(f.root, 'checkpoints')), before);
});
test('escaped native JSON credentials remain denied in tracked checkpoint content', async t => {
  const f = await fixture(t), nested = JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: JSON.stringify({ refresh_token: 'SyntheticNestedCredential12345' }) } });
  assert.equal(SECRET.test(nested), true); await writeFile(join(f.repo, 'main.txt'), nested);
  await assert.rejects(checkpoint(f.root, f.repo, ['main.txt']), /Sensitive/);
});
test('restore rejects manifest hash, file hash, base mismatch and malicious allowlist before worktree creation', async t => {
  const f = await fixture(t); await writeFile(join(f.repo, 'main.txt'), 'dirty\n');
  let saved = await checkpoint(f.root, f.repo, ['main.txt']);
  await patchManifest(f.root, saved.id, m => { m.files[0].data = Buffer.from('changed').toString('base64'); });
  await assert.rejects(restore(f.root, saved.id, join(f.base, 'bad1')), /manifest hash/);
  saved = await checkpoint(f.root, f.repo, ['main.txt']);
  await patchManifest(f.root, saved.id, m => { m.files[0].sha256 = '0'.repeat(64); const { manifestHash, ...body } = m; m.manifestHash = hash(JSON.stringify(body)); });
  await assert.rejects(restore(f.root, saved.id, join(f.base, 'bad2')), /file hash/);
  saved = await checkpoint(f.root, f.repo, ['main.txt']);
  await assert.rejects(restore(f.root, saved.id, join(f.base, 'bad3'), { expectedBase: '0'.repeat(40) }), /base mismatch/);
  await patchManifest(f.root, saved.id, m => { m.files[0].path = '../escape'; m.allowlist = ['../escape']; const { manifestHash, ...body } = m; m.manifestHash = hash(JSON.stringify(body)); });
  await assert.rejects(restore(f.root, saved.id, join(f.base, 'bad4')), /Unsafe/);
  for (const name of ['bad1', 'bad2', 'bad3', 'bad4']) await assert.rejects(lstat(join(f.base, name)), { code: 'ENOENT' });
});
