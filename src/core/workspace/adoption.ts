/** Adopt existing checkouts by registering them; never initialize, copy or move their contents. */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { canonicalPath, readWorkspaceConfig, type RegisteredRepository } from './context.js';

export interface AdoptionOptions {
  prefix?: string;
  role?: string;
  dryRun?: boolean;
  expectedFingerprint?: string;
}
export interface AdoptionPreview {
  workspaceRoot: string;
  sourcePath: string;
  action: 'register' | 'already-registered';
  repository: RegisteredRepository;
  childPlanningRoot: string | null;
  fingerprint: string;
}

const digest = (value: string) => createHash('sha256').update(value).digest('hex');

/** Strip credentials and transport details, retaining host and full owner/repository namespace. */
export function normalizeRemote(value: string): string | undefined {
  let url: URL;
  try {
    const scp = value.match(/^(?:[^@/]+@)?([^:/]+):([^/].*)$/);
    url = new URL(scp && !value.includes('://') ? `ssh://${scp[1]}/${scp[2]}` : value);
  } catch { return undefined; }
  if (!['https:', 'http:', 'ssh:', 'git:'].includes(url.protocol) || !url.hostname) return undefined;
  let remotePath = url.pathname.replace(/^\/+|\/+$/g, '').replace(/\.git$/i, '');
  if (!remotePath || remotePath.includes('..') || /[\s\\]/.test(remotePath)) return undefined;
  if (url.hostname.toLowerCase() === 'github.com') remotePath = remotePath.toLowerCase();
  return `${url.host.toLowerCase()}/${remotePath}`;
}

function inspectCheckout(source: string): { root: string; identity?: string } {
  let root: string;
  try { root = canonicalPath(source); } catch { throw new Error(`Repository does not exist: ${source}`); }
  if (!fs.statSync(root).isDirectory() || !fs.existsSync(path.join(root, '.git'))) {
    throw new Error(`Not a Git checkout root: ${root}`);
  }
  const git = (args: string[]) => execFileSync('git', args, {
    cwd: root, encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0' },
  }).trim();
  try {
    if (canonicalPath(git(['rev-parse', '--show-toplevel'])) !== root) throw new Error('Not checkout root');
  } catch { throw new Error(`Not a valid Git checkout root: ${root}`); }
  let identity: string | undefined;
  try { identity = normalizeRemote(git(['remote', 'get-url', 'origin'])); } catch { /* Local-only checkout. */ }
  return { root, identity };
}

function storedIdentity(repo: RegisteredRepository): string | undefined {
  if (repo.identity) return repo.identity;
  const github = (repo.sync as { github?: { owner?: string; repo?: string } } | undefined)?.github;
  return github?.owner && github.repo ? normalizeRemote(`https://github.com/${github.owner}/${github.repo}`)
    : typeof repo.githubUrl === 'string' ? normalizeRemote(repo.githubUrl) : undefined;
}

function configAt(root: string): { config: Record<string, any>; raw: string; repos: RegisteredRepository[] } {
  const raw = fs.readFileSync(path.join(root, '.specweave', 'config.json'), 'utf8');
  const config = readWorkspaceConfig(root);
  return { config, raw, repos: config.workspace?.repos ?? config.umbrella?.childRepos ?? [] };
}

export function previewAdoption(workspaceRoot: string, source: string, options: AdoptionOptions = {}): AdoptionPreview {
  const root = canonicalPath(workspaceRoot);
  const { raw, repos } = configAt(root);
  const checkout = inspectCheckout(source);
  const matches = repos.filter(repo => {
    try { return canonicalPath(path.resolve(root, repo.path)) === checkout.root; } catch { return false; }
  });
  if (matches.length > 1) throw new Error(`Multiple workspace entries refer to ${checkout.root}; resolve duplicate entries first`);
  const existing = matches[0];
  if (existing && storedIdentity(existing) && storedIdentity(existing) !== checkout.identity) {
    throw new Error(`Repository origin changed for '${existing.id}'; update its workspace identity explicitly`);
  }
  const remoteParts = checkout.identity?.split('/') ?? [];
  const name = remoteParts[remoteParts.length - 1] ?? path.basename(checkout.root);
  const owner = remoteParts.length > 2 ? remoteParts.slice(1, -1).join('-') : '';
  const slug = `${owner ? `${owner}-` : ''}${name}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'repo';
  const suffix = digest(`${checkout.identity ?? ''}\n${checkout.root}`).slice(0, 12);
  let id = slug.length <= 64 ? slug : `${slug.slice(0, 51)}-${suffix}`;
  if (repos.some(repo => repo.id === id)) id = `${slug.slice(0, 51)}-${suffix}`;
  if (!existing && repos.some(repo => repo.id === id)) throw new Error(`Repository id collision: ${id}`);
  const prefix = options.prefix ?? (name.replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase() || 'REP');
  if (!prefix || prefix.length > 10) throw new Error('Repository prefix must contain 1 to 10 characters');
  if (options.role && !['frontend', 'backend', 'mobile', 'infra', 'shared', 'other'].includes(options.role)) {
    throw new Error('Invalid repository role');
  }
  const entry: RegisteredRepository = existing ?? {
    id, path: path.relative(root, checkout.root).split(path.sep).join('/') || '.', name, prefix,
    ...(options.role ? { role: options.role } : {}),
    ...(checkout.identity ? { identity: checkout.identity } : {}),
    ...(remoteParts[0] === 'github.com' && remoteParts.length === 3
      ? { sync: { github: { owner: remoteParts[1], repo: remoteParts[2] } } } : {}),
  };
  return {
    workspaceRoot: root, sourcePath: checkout.root, action: existing ? 'already-registered' : 'register', repository: entry,
    childPlanningRoot: checkout.root !== root && fs.existsSync(path.join(checkout.root, '.specweave', 'config.json')) ? checkout.root : null,
    fingerprint: digest(`${raw}\n${checkout.root}\n${checkout.identity ?? ''}\n${JSON.stringify(entry)}`),
  };
}

/** Exclusive writers plus atomic replacement prevent partially written configs and lost registrations. */
export async function adoptRepository(workspaceRoot: string, source: string, options: AdoptionOptions = {}): Promise<AdoptionPreview> {
  if (options.dryRun) return previewAdoption(workspaceRoot, source, options);
  const root = canonicalPath(workspaceRoot);
  readWorkspaceConfig(root); // fail before creating a lock in an invalid workspace
  const file = path.join(root, '.specweave', 'config.json');
  const lock = `${file}.adoption.lock`;
  const token = randomUUID();
  const deadline = Date.now() + 10000;
  let fd: number | undefined;
  for (;;) {
    try { fd = fs.openSync(lock, 'wx', 0o600); break; } catch (error: any) {
      if (error.code !== 'EEXIST') throw error;
      if (Date.now() >= deadline) throw new Error(`Workspace registration is locked: ${lock}. Check its owner process before removing a leftover lock.`);
      await new Promise(resolve => setTimeout(resolve, 20));
    }
  }
  const temporary = `${file}.${token}.tmp`;
  try {
    fs.writeFileSync(fd!, JSON.stringify({ pid: process.pid, token }));
    fs.closeSync(fd!);
    fd = undefined;
    const preview = previewAdoption(root, source, options);
    if (options.expectedFingerprint && preview.fingerprint !== options.expectedFingerprint) {
      throw new Error('Workspace or repository changed since preview. Preview again before applying.');
    }
    if (preview.action === 'already-registered') return preview;
    const { raw, config, repos } = configAt(root);
    const next = { ...config, workspace: {
      ...(config.workspace ?? { name: config.umbrella?.projectName ?? config.project?.name ?? path.basename(root) }),
      repos: [...repos, preview.repository],
    } };
    const output = fs.openSync(temporary, 'wx', fs.statSync(file).mode & 0o777);
    try { fs.writeFileSync(output, JSON.stringify(next, null, 2) + '\n'); fs.fsyncSync(output); } finally { fs.closeSync(output); }
    // Detect non-cooperating writers and origin/path changes before replacing the config.
    if (fs.readFileSync(file, 'utf8') !== raw || previewAdoption(root, source, options).fingerprint !== preview.fingerprint) {
      throw new Error('Workspace or repository changed during registration. Retry after reviewing a fresh preview.');
    }
    fs.renameSync(temporary, file);
    return preview;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
    fs.rmSync(temporary, { force: true });
    fs.rmSync(lock, { force: true });
  }
}
