#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import path from 'node:path';

function parseVersion(value) {
  if (typeof value !== 'string') throw new Error('Release version must be a string');
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.exec(value);
  if (!match) throw new Error(`Invalid release version: ${value}`);
  return { parts: match.slice(1, 4).map(BigInt), prerelease: Boolean(match[4]) };
}

/** Re-runs of the current stable version are allowed; older stable releases must
 * never move npm's latest tag backwards when concurrent release branches land.
 */
export function assertPublishVersion(version, latest) {
  const candidate = parseVersion(version);
  const current = parseVersion(latest);
  if (current.prerelease) throw new Error('npm latest unexpectedly points to a prerelease');
  if (candidate.prerelease) return { version, latest, tag: 'next' };
  for (let i = 0; i < 3; i++) {
    if (candidate.parts[i] > current.parts[i]) return { version, latest, tag: 'latest' };
    if (candidate.parts[i] < current.parts[i]) {
      throw new Error(`Refusing stable release ${version}: npm latest is already ${latest}. Rebase and choose a newer version.`);
    }
  }
  return { version, latest, tag: 'latest' };
}

export async function checkPublishVersion(version, { fetchImpl = fetch } = {}) {
  parseVersion(version);
  const response = await fetchImpl(`https://registry.npmjs.org/specweave/latest?_release_guard=${Date.now()}`, {
    cache: 'no-store', signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Cannot verify npm latest: HTTP ${response.status}`);
  const manifest = await response.json();
  if (manifest.name !== 'specweave') throw new Error('Unexpected registry package identity');
  return assertPublishVersion(version, manifest.version);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await checkPublishVersion(process.argv[2]);
    console.log(`[release-version] ${result.version} -> ${result.tag}; npm latest ${result.latest}`);
  } catch (error) {
    console.error(`[release-version] ${error.message}`);
    process.exitCode = 1;
  }
}
