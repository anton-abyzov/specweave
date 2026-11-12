#!/usr/bin/env node
/**
 * Points the SpecWithCode downloads in src/data/specwithcodeRelease.ts at the
 * newest published release of anton-abyzov/specwithcode.
 *
 * deploy-docs.yml runs it before every build, and the SpecWithCode release
 * script starts that workflow once a release is public, so the download page
 * follows each release without a commit. The committed values are the
 * fallback: when GitHub cannot be read, or a release lacks a file, they stay.
 *
 *   node scripts/sync-specwithcode-release.mjs            rewrite the file
 *   node scripts/sync-specwithcode-release.mjs --check    exit 1 when it would change
 *   node scripts/sync-specwithcode-release.mjs --strict   exit 1 when GitHub cannot be read
 *   node scripts/sync-specwithcode-release.mjs --live URL exit 10 when the deployed page at URL
 *                                                         links an older release, printing
 *                                                         `since=<time its files were ready>`
 *
 * --live is what specwithcode-release-watch.yml polls with: a release made
 * anywhere, and the Windows and Linux files attached to it later, start a
 * deploy without the release tooling reaching into this repository.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const REPO = 'anton-abyzov/specwithcode';
const DATA_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/data/specwithcodeRelease.ts');
const MIN_BYTES = 20_000_000;

const MAC_DMG = 'SpecWithCode-arm64.dmg';
const MAC_SUMS = 'SHA256SUMS';
const DESKTOP_SUMS = 'SHA256SUMS-windows-linux';
/** Constant in the data file, then the asset it sizes. */
const DESKTOP_ASSETS = [
  ['EXE_X64_BYTES', (v) => `SpecWithCode-${v}-x64.exe`],
  ['EXE_ARM64_BYTES', (v) => `SpecWithCode-${v}-arm64.exe`],
  ['APPIMAGE_X64_BYTES', (v) => `SpecWithCode-${v}-x86_64.AppImage`],
  ['APPIMAGE_ARM64_BYTES', (v) => `SpecWithCode-${v}-arm64.AppImage`],
  ['DEB_X64_BYTES', (v) => `SpecWithCode-${v}-amd64.deb`],
  ['DEB_ARM64_BYTES', (v) => `SpecWithCode-${v}-arm64.deb`],
];

const parseVersion = (text) => {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(text ?? '');
  return match ? match.slice(1).map(Number) : null;
};

export const compareVersions = (left, right) => {
  const a = parseVersion(left);
  const b = parseVersion(right);
  if (!a || !b) throw new Error(`Not a release version: ${a ? right : left}`);
  for (let i = 0; i < 3; i += 1) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
};

/** Sizes of a release's fully uploaded files, by name. */
const uploaded = (release) =>
  (release.assets ?? []).filter((asset) => asset.state === undefined || asset.state === 'uploaded');

const assetSizes = (release) => new Map(uploaded(release).map((asset) => [asset.name, asset.size]));

/** When the last of a release's files finished uploading, else when it was published. */
const readyAt = (release) =>
  uploaded(release)
    .map((asset) => asset.updated_at)
    .concat(release.published_at)
    .filter(Boolean)
    .sort()
    .pop() ?? null;

/**
 * The newest stable release that carries the Mac download, and the newest
 * that carries every Windows and Linux installer (they are attached later, so
 * it can be an older one). Either is null when no release qualifies.
 */
export function pickReleases(releases) {
  const stable = releases
    .filter((release) => !release.draft && !release.prerelease && parseVersion(release.tag_name))
    .map((release) => ({
      version: release.tag_name.replace(/^v/, ''),
      sizes: assetSizes(release),
      readyAt: readyAt(release),
    }))
    .sort((a, b) => compareVersions(b.version, a.version));
  let mac = null;
  let desktop = null;
  for (const {version, sizes, readyAt: ready} of stable) {
    if (mac === null && sizes.get(MAC_DMG) > MIN_BYTES && sizes.has(MAC_SUMS)) {
      mac = {version, readyAt: ready, bytes: {DMG_BYTES: sizes.get(MAC_DMG)}};
    }
    if (desktop === null && sizes.has(DESKTOP_SUMS)) {
      const bytes = Object.fromEntries(DESKTOP_ASSETS.map(([name, file]) => [name, sizes.get(file(version))]));
      if (Object.values(bytes).every((size) => size > MIN_BYTES)) desktop = {version, readyAt: ready, bytes};
    }
    if (mac && desktop) break;
  }
  return {mac, desktop};
}

const readConstant = (source, name) => {
  const match = new RegExp(`^const ${name} = (.+);$`, 'm').exec(source);
  if (!match) throw new Error(`specwithcodeRelease.ts has no constant ${name}`);
  return match[1];
};

const writeConstant = (source, name, value) => {
  readConstant(source, name);
  return source.replace(new RegExp(`^const ${name} = .+;$`, 'm'), `const ${name} = ${value};`);
};

const formatBytes = (bytes) => String(bytes).replace(/\B(?=(\d{3})+$)/g, '_');

/**
 * `source` with each picked release written in. A picked release older than
 * the one recorded is ignored, so a release withdrawn from GitHub never moves
 * the page back.
 */
export function applyReleases(source, {mac, desktop}) {
  let next = source;
  for (const [versionName, picked] of [['VERSION', mac], ['DESKTOP_VERSION', desktop]]) {
    if (!picked) continue;
    const recorded = readConstant(next, versionName).replace(/'/g, '');
    if (parseVersion(recorded) && compareVersions(picked.version, recorded) < 0) continue;
    next = writeConstant(next, versionName, `'${picked.version}'`);
    for (const [name, bytes] of Object.entries(picked.bytes)) next = writeConstant(next, name, formatBytes(bytes));
  }
  return next;
}

/** The Mac and the Windows and Linux release a built download page links. */
export function linkedReleases(html) {
  const version = (pattern) => pattern.exec(html)?.[1] ?? null;
  return {
    mac: version(/releases\/download\/v(\d+\.\d+\.\d+)\/SpecWithCode-arm64\.dmg/),
    desktop: version(/releases\/download\/v(\d+\.\d+\.\d+)\/SpecWithCode-\1-x64\.exe/),
  };
}

/**
 * The picked releases the page is behind. A page whose links cannot be read
 * counts as current: the watch must never deploy over a page it cannot parse.
 */
export function releasesAhead(picked, linked) {
  return [
    [picked.mac, linked.mac],
    [picked.desktop, linked.desktop],
  ]
    .filter(([release, shown]) => release && parseVersion(shown) && compareVersions(release.version, shown) > 0)
    .map(([release]) => release);
}

async function checkLive(url, releases) {
  const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`, {
    headers: {'cache-control': 'no-cache', 'user-agent': 'specweave-docs-site'},
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`${url} answered HTTP ${response.status}`);
  const linked = linkedReleases(await response.text());
  const ahead = releasesAhead(pickReleases(releases), linked);
  const shown = `Mac ${linked.mac ?? 'unknown'}, Windows and Linux ${linked.desktop ?? 'unknown'}`;
  if (ahead.length === 0) {
    console.log(`SpecWithCode downloads: ${url} is current (${shown}).`);
    return 0;
  }
  const newest = ahead.map((release) => release.version).sort(compareVersions).pop();
  const since = ahead.map((release) => release.readyAt).filter(Boolean).sort().pop() ?? '';
  console.log(`SpecWithCode downloads: ${url} is behind ${newest} (${shown}).`);
  console.log(`since=${since}`);
  return 10;
}

async function fetchReleases() {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  const response = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=30`, {
    headers: {
      accept: 'application/vnd.github+json',
      'user-agent': 'specweave-docs-site',
      ...(token ? {authorization: `Bearer ${token}`} : {}),
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`GitHub answered HTTP ${response.status} for the ${REPO} releases`);
  return response.json();
}

async function main() {
  const check = process.argv.includes('--check');
  const strict = process.argv.includes('--strict');
  const liveAt = process.argv.indexOf('--live');
  const liveUrl = liveAt === -1 ? null : process.argv[liveAt + 1];
  let releases;
  try {
    releases = await fetchReleases();
    if (liveUrl) process.exit(await checkLive(liveUrl, releases));
  } catch (error) {
    const mark = process.env.GITHUB_ACTIONS ? '::warning::' : '';
    const kept = liveUrl ? 'could not compare the deployed page' : 'kept the recorded release';
    console.warn(`${mark}SpecWithCode downloads: ${kept} (${error.message}).`);
    process.exit(strict ? 1 : 0);
  }
  const picked = pickReleases(releases);
  const source = fs.readFileSync(DATA_FILE, 'utf8');
  const next = applyReleases(source, picked);
  const recorded = (name) => readConstant(next, name).replace(/'/g, '');
  const summary = `Mac ${recorded('VERSION')}, Windows and Linux ${recorded('DESKTOP_VERSION')}`;
  if (next === source) {
    console.log(`SpecWithCode downloads: already current (${summary}).`);
    return;
  }
  if (check) {
    console.log(`SpecWithCode downloads: behind the latest release (would become ${summary}).`);
    process.exit(1);
  }
  fs.writeFileSync(DATA_FILE, next);
  console.log(`SpecWithCode downloads: now ${summary}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
