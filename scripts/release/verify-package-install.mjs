#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

export function packedManifest(tarball) {
  const tar = gunzipSync(tarball, { maxOutputLength: 128 * 1024 * 1024 });
  for (let offset = 0; offset + 512 <= tar.length;) {
    const name = tar.subarray(offset, offset + 100).toString().replace(/\0.*$/s, '');
    if (!name) break;
    const size = Number.parseInt(tar.subarray(offset + 124, offset + 136).toString().replace(/\0.*$/s, '').trim(), 8);
    if (!Number.isSafeInteger(size) || size < 0 || offset + 512 + size > tar.length) throw new Error('Invalid package tar header');
    if (name === 'package/package.json') return JSON.parse(tar.subarray(offset + 512, offset + 512 + size).toString());
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  throw new Error('Packed package.json is missing');
}

export function validateManifest(manifest, expected) {
  if (manifest.name !== expected.name || manifest.version !== expected.version) throw new Error('Packed package identity differs from the release');
  if (typeof manifest.bin?.specweave !== 'string' || manifest.bin.specweave.replace(/^\.\//, '') !== 'bin/specweave.js') {
    throw new Error('Packed manifest must expose specweave → bin/specweave.js');
  }
}

function npm(args, options) {
  const npmScript = [
    process.env.npm_execpath,
    path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'),
    path.resolve(path.dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js'),
  ].find((file) => file && existsSync(file));
  if (npmScript) return execFileSync(process.execPath, [npmScript, ...args], options);
  // .cmd files cannot be spawned by execFileSync without a shell on Windows.
  if (process.platform === 'win32') throw new Error('Cannot locate npm CLI JavaScript; run through npm run release:preflight');
  return execFileSync('npm', args, options);
}

export function verifyInstalledTarball(tarballPath, expected) {
  const manifest = packedManifest(readFileSync(tarballPath));
  validateManifest(manifest, expected);
  const installRoot = mkdtempSync(path.join(tmpdir(), 'specweave-install-check-'));
  try {
    writeFileSync(path.join(installRoot, 'package.json'), '{"private":true}');
    npm(['install', '--ignore-scripts', '--no-audit', '--no-fund', '--no-package-lock', tarballPath], {
      cwd: installRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 180_000,
      env: { ...process.env, npm_config_ignore_scripts: 'true' },
    });
    const installed = JSON.parse(readFileSync(path.join(installRoot, 'node_modules', expected.name, 'package.json'), 'utf8'));
    validateManifest(installed, expected);
    const command = path.join(installRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'specweave.cmd' : 'specweave');
    if (!existsSync(command)) throw new Error('Clean installation did not create the specweave command');
    const installedEntry = path.join(installRoot, 'node_modules', expected.name, installed.bin.specweave);
    const output = (process.platform === 'win32'
      ? execFileSync(process.execPath, [installedEntry, '--version'], { cwd: installRoot, encoding: 'utf8', timeout: 30_000 })
      : execFileSync(command, ['--version'], { cwd: installRoot, encoding: 'utf8', timeout: 30_000 })).trim();
    if (output !== expected.version) throw new Error(`Installed command reported ${JSON.stringify(output)}, expected ${expected.version}`);
    console.log(`[install-check] packed bin preserved; clean installed specweave --version = ${output}`);
    return { name: manifest.name, version: manifest.version, bin: manifest.bin, commandOutput: output };
  } finally { rmSync(installRoot, { recursive: true, force: true }); }
}

export function verifyLocalPackage(repoRoot) {
  const expected = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  const packRoot = mkdtempSync(path.join(tmpdir(), 'specweave-pack-check-'));
  try {
    npm(['pack', '--ignore-scripts', '--pack-destination', packRoot], {
      cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe'], timeout: 120_000,
      env: { ...process.env, npm_config_ignore_scripts: 'true' },
    });
    const files = readdirSync(packRoot).filter((file) => file.endsWith('.tgz'));
    if (files.length !== 1) throw new Error('npm pack did not produce exactly one tarball');
    return verifyInstalledTarball(path.join(packRoot, files[0]), expected);
  } finally { rmSync(packRoot, { recursive: true, force: true }); }
}

async function waitForRegistryResponse(url, label, consume, { fetchImpl = fetch, attempts = 40, delayMs = 15000, timeoutMs = 15000, wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    let reason;
    try {
      // CDN negative caches can outlive propagation even with no-store request mode.
      const lookup = new URL(url);
      lookup.searchParams.set('_specweave_verify', `${Date.now()}-${attempt}`);
      const response = await fetchImpl(lookup.href, { cache: 'no-store', signal: AbortSignal.timeout(timeoutMs) });
      // Headers alone do not complete a fetch: socket/timeout failures can happen
      // while reading the body. Keep consumption inside this retry boundary.
      if (response.ok) return await consume(response);
      if (response.status !== 404 && response.status !== 429 && response.status < 500) throw new Error(`Registry rejected ${label}: HTTP ${response.status}`);
      reason = `HTTP ${response.status}`;
      await response.body?.cancel();
    } catch (error) {
      if (!(error instanceof TypeError) && !['AbortError', 'TimeoutError'].includes(error.name)) throw error;
      reason = error.name;
    }
    if (attempt + 1 < attempts) {
      console.log(`[install-check] ${label} processing (${reason}); waiting for public registry`);
      await wait(delayMs);
    }
  }
  throw new Error(`${label} is not publicly available after bounded registry wait`);
}

export async function waitForPublishedManifest(version, options) {
  const manifest = await waitForRegistryResponse(`https://registry.npmjs.org/specweave/${encodeURIComponent(version)}`, version, (response) => response.json(), options);
  validateManifest(manifest, { name: 'specweave', version });
  if (!manifest.dist?.tarball || !manifest.dist?.integrity) throw new Error('Published manifest lacks tarball integrity');
  return manifest;
}

export async function waitForPublishedTarball(manifest, options) {
  // Metadata and CDN tarball propagation are independent. A 200 manifest is not enough.
  const body = await waitForRegistryResponse(manifest.dist.tarball, `${manifest.version} tarball`, (response) => response.arrayBuffer(), { timeoutMs: 60000, ...options });
  const bytes = Buffer.from(body);
  const [algorithm, digest] = manifest.dist.integrity.split('-');
  if (!['sha512', 'sha256'].includes(algorithm) || createHash(algorithm).update(bytes).digest('base64') !== digest) throw new Error('Published tarball integrity mismatch');
  return bytes;
}

export async function verifyPublishedPackage(version) {
  const manifest = await waitForPublishedManifest(version);
  const bytes = await waitForPublishedTarball(manifest);
  const dir = mkdtempSync(path.join(tmpdir(), 'specweave-registry-check-'));
  try {
    const tarball = path.join(dir, 'package.tgz');
    writeFileSync(tarball, bytes);
    return verifyInstalledTarball(tarball, manifest);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv[2] === '--published') await verifyPublishedPackage(process.argv[3]);
    else verifyLocalPackage(path.resolve(process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '../..')));
  } catch (error) { console.error(`[install-check] ${error.message}`); process.exitCode = 1; }
}
