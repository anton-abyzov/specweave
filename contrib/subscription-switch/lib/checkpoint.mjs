import { readFile, writeFile, lstat, mkdir, realpath, chmod, unlink } from 'node:fs/promises';
import { join, resolve, relative, isAbsolute, dirname, sep } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { atomicJSON, hash, id, iso, SECRET } from './util.mjs';
const exec = promisify(execFile);
export async function git(cwd, args) { return (await exec('git', args, { cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })).stdout; }
export async function repository(cwd) {
  const root = await realpath((await git(cwd, ['rev-parse', '--show-toplevel'])).trim());
  const baseSha = (await git(root, ['rev-parse', 'HEAD'])).trim();
  const commonDir = await realpath(resolve(root, (await git(root, ['rev-parse', '--git-common-dir'])).trim()));
  return { root, baseSha, commonDir };
}
export function safePath(path) {
  if (typeof path !== 'string' || !path || isAbsolute(path) || path.includes('\\') || /[\x00-\x1f\x7f]/.test(path) || path.split('/').some(s => !s || s === '.' || s === '..')) throw new Error('Unsafe relative checkpoint path');
  if (path.split('/').some(s => /^\.git$/i.test(s) || /^\.env(?:\.|$)/i.test(s) || /(?:credential|secret|password|(?:^|[-_.])(?:auth|token|private[-_]?key|id_rsa|id_ed25519)(?:[-_.]|$))/i.test(s) || /\.(?:pem|p12|pfx|key|keystore)$/i.test(s))) throw new Error('Sensitive checkpoint path denied');
  return path;
}
async function noSymlinks(root, path, allowMissingLeaf = false) {
  let current = root; const segments = path.split('/');
  for (let i = 0; i < segments.length; i++) {
    current = join(current, segments[i]);
    try { const s = await lstat(current); if (s.isSymbolicLink()) throw new Error('Symlink checkpoint path denied'); }
    catch (e) { if (e.code === 'ENOENT' && (allowMissingLeaf || i === segments.length - 1)) return; throw e; }
  }
}
export async function dirtyTracked(cwd) {
  const output = await git(cwd, ['diff', 'HEAD', '--name-only', '-z', '--no-renames']);
  return output.split('\0').filter(Boolean);
}
export async function checkpoint(root, cwd, allowlist) {
  if (!Array.isArray(allowlist) || !allowlist.length || allowlist.length > 100 || new Set(allowlist).size !== allowlist.length) throw new Error('Checkpoint requires an explicit unique relative file allowlist (1-100 paths)');
  const repo = await repository(cwd);
  const dirty = new Set(await dirtyTracked(repo.root));
  const tracked = new Set((await git(repo.root, ['ls-files', '-z'])).split('\0').filter(Boolean));
  const baseTracked = new Set((await git(repo.root, ['ls-tree', '-r', '--name-only', '-z', repo.baseSha])).split('\0').filter(Boolean));
  // Git's index tree proves explicitly allowlisted staged additions were tracked
  // at capture time. It changes no working file or index entry.
  const indexTree = (await git(repo.root, ['write-tree'])).trim();
  const files = [];
  for (const entry of allowlist) {
    const path = safePath(entry);
    if (!tracked.has(path) && !baseTracked.has(path)) throw new Error(`Untracked checkpoint file denied: ${path}`);
    await noSymlinks(repo.root, path);
    const indexMode = (await git(repo.root, ['ls-files', '--stage', '--', path])).split(' ')[0];
    const sourceMode = indexMode || (await git(repo.root, ['ls-tree', repo.baseSha, '--', path])).split(' ')[0];
    if (!['100644', '100755'].includes(sourceMode)) throw new Error('Tracked symlink or submodule checkpoint denied');
    // A tracked secret in the base must never travel through a checkpoint,
    // even when the dirty working file removed its sensitive content.
    const base = await git(repo.root, ['show', `${repo.baseSha}:${path}`]).catch(() => '');
    if (SECRET.test(base)) throw new Error(`Sensitive tracked base content denied: ${path}`);
    if (!dirty.has(path)) continue;
    let data, mode;
    const baseExists = baseTracked.has(path);
    try { data = await readFile(join(repo.root, path)); }
    catch (e) { if (e.code !== 'ENOENT') throw e; files.push({ path, kind: 'delete', sha256: null, baseExists }); continue; }
    const stat = await lstat(join(repo.root, path)); if (!stat.isFile()) throw new Error('Checkpoint requires a regular file'); mode = stat.mode & 0o777;
    if (data.length > 4 * 1024 * 1024) throw new Error('Checkpoint file exceeds 4 MiB');
    if (SECRET.test(data.toString('utf8'))) throw new Error(`Sensitive checkpoint content denied: ${path}`);
    files.push({ path, kind: 'write', data: data.toString('base64'), sha256: hash(data), mode, baseExists });
  }
  const omitted = [...dirty].filter(p => !allowlist.includes(p));
  const omittedDirtyPaths = omitted.filter(p => { try { safePath(p); return true; } catch { return false; } });
  const manifest = { version: 1, id: id(), createdAt: iso(), sourceRoot: repo.root, commonDir: repo.commonDir, baseSha: repo.baseSha,
    indexTree, branch: (await git(repo.root, ['branch', '--show-current'])).trim(), allowlist, files };
  manifest.manifestHash = hash(JSON.stringify(manifest));
  const file = join(root, 'checkpoints', `${manifest.id}.json`);
  await atomicJSON(file, manifest);
  return { id: manifest.id, file, baseSha: repo.baseSha, paths: files.map(f => f.path), omittedDirtyPaths, omittedDirtyCount: omitted.length, omittedSensitivePathCount: omitted.length - omittedDirtyPaths.length };
}
export async function restore(root, checkpointId, destination, { expectedBase } = {}) {
  if (!/^[a-f0-9-]{36}$/.test(checkpointId)) throw new Error('Invalid checkpoint ID');
  const manifest = JSON.parse(await readFile(join(root, 'checkpoints', `${checkpointId}.json`), 'utf8'));
  const { manifestHash, ...body } = manifest;
  if (manifest.id !== checkpointId || manifest.version !== 1 || hash(JSON.stringify(body)) !== manifestHash) throw new Error('Checkpoint manifest hash mismatch');
  if (!/^[0-9a-f]{40,64}$/.test(manifest.baseSha)) throw new Error('Invalid checkpoint base SHA');
  if (!/^[0-9a-f]{40,64}$/.test(manifest.indexTree)) throw new Error('Invalid checkpoint index tree SHA');
  const repo = await repository(manifest.sourceRoot);
  if (repo.commonDir !== manifest.commonDir || (expectedBase || repo.baseSha) !== manifest.baseSha) throw new Error('Checkpoint repository or base mismatch');
  await git(repo.root, ['cat-file', '-e', `${manifest.baseSha}^{commit}`]);
  await git(repo.root, ['cat-file', '-e', `${manifest.indexTree}^{tree}`]);
  const target = resolve(destination);
  if (target === repo.root || !relative(repo.root, target).startsWith(`..${sep}`) && relative(repo.root, target) !== '..') throw new Error('Restore target must be outside the source checkout');
  try { await lstat(target); throw new Error('Restore destination already exists'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  // Reject a symlinked parent destination before creating/registering a worktree.
  const parent = dirname(target); await mkdir(parent, { recursive: true, mode: 0o700 });
  if (await realpath(parent) !== parent) throw new Error('Restore destination parent must not be symlinked');
  if (!Array.isArray(manifest.allowlist) || !Array.isArray(manifest.files) || manifest.files.length > 100) throw new Error('Invalid checkpoint file manifest');
  const allowed = new Set(manifest.allowlist.map(safePath));
  if (allowed.size !== manifest.allowlist.length) throw new Error('Duplicate checkpoint allowlist path');
  const baseTracked = new Set((await git(repo.root, ['ls-tree', '-r', '--name-only', '-z', manifest.baseSha])).split('\0').filter(Boolean));
  const indexTracked = new Set((await git(repo.root, ['ls-tree', '-r', '--name-only', '-z', manifest.indexTree])).split('\0').filter(Boolean));
  const seen = new Set();
  for (const f of manifest.files) {
    safePath(f.path);
    const stagedDeletion = f.kind === 'delete' && f.baseExists === true && baseTracked.has(f.path);
    if (!allowed.has(f.path) || (!indexTracked.has(f.path) && !stagedDeletion) || seen.has(f.path) || typeof f.baseExists !== 'boolean' || f.baseExists !== baseTracked.has(f.path)) throw new Error('Checkpoint path missing from explicit tracked allowlist');
    seen.add(f.path);
    const mode = (await git(repo.root, ['ls-tree', stagedDeletion ? manifest.baseSha : manifest.indexTree, '--', f.path])).split(' ')[0];
    if (!['100644', '100755'].includes(mode)) throw new Error('Checkpoint base symlink or submodule denied');
    const base = f.baseExists ? await git(repo.root, ['show', `${manifest.baseSha}:${f.path}`]) : '';
    if (SECRET.test(base)) throw new Error('Sensitive tracked base denied');
    if (f.kind === 'write') {
      if (!Number.isInteger(f.mode) || f.mode < 0 || f.mode > 0o777) throw new Error('Invalid checkpoint file permissions');
      if (typeof f.data !== 'string' || f.data.length > 6 * 1024 * 1024 || !/^[A-Za-z0-9+/]*={0,2}$/.test(f.data)) throw new Error('Invalid checkpoint file data');
      const data = Buffer.from(f.data, 'base64');
      if (hash(data) !== f.sha256) throw new Error('Checkpoint file hash mismatch');
      if (SECRET.test(data.toString('utf8'))) throw new Error('Sensitive checkpoint data denied');
    } else if (f.kind !== 'delete' || f.sha256 !== null) throw new Error('Invalid checkpoint file kind');
  }
  await git(repo.root, ['worktree', 'add', '--detach', target, manifest.baseSha]);
  try {
    for (const f of manifest.files) {
      await noSymlinks(target, f.path, true);
      if (f.kind === 'write') { await mkdir(dirname(join(target, f.path)), { recursive: true }); await writeFile(join(target, f.path), Buffer.from(f.data, 'base64'), { mode: f.mode }); await chmod(join(target, f.path), f.mode); }
      else if (f.baseExists) await unlink(join(target, f.path));
    }
  } catch (error) {
    // Do not force-delete a partially restored checkout: preserve recoverable
    // evidence and its registration for explicit inspection.
    throw new Error(`Restore incomplete; preserved ${target}: ${error.message}`);
  }
  return { checkpointId, cwd: target, baseSha: manifest.baseSha, paths: manifest.files.map(f => f.path), status: 'restored' };
}
