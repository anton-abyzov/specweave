#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { authenticatedOnlyLinks, authenticatedReleaseEvidence, skippedLinkPattern } from './candidate-link-policy.mjs';

const candidate = new URL(process.argv[2] || 'http://127.0.0.1:3000');
if (!['http:', 'https:'].includes(candidate.protocol) || candidate.pathname !== '/' || candidate.search || candidate.hash) {
  throw new Error('Supply the candidate site origin, such as http://127.0.0.1:3000');
}

// Keep production canonical metadata intact. Check first-party absolute links
// against the candidate artifact, including pages that are not deployed yet.
// The origin boundary prevents rewriting unrelated lookalike hostnames.
const args = [
  '--yes', 'linkinator@8.1.0', candidate.href,
  '--recurse', '--verbosity', 'error',
  '--skip', skippedLinkPattern,
  '--url-rewrite-search', '^https?://(?:www\\.)?spec-weave\\.com(?=[/?#]|$)',
  '--url-rewrite-replace', candidate.origin,
];
console.log(`Authenticated-only classification: ${authenticatedOnlyLinks.length} exact URL requires repository access and is excluded from anonymous availability checks.`);
for (const url of authenticatedOnlyLinks) console.log(`  ${url}`);
console.log(`Separate authenticated readback: release ${authenticatedReleaseEvidence.releaseId}, verified ${authenticatedReleaseEvidence.verifiedAt}, receipt SHA256 ${authenticatedReleaseEvidence.receiptSha256}.`);
const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', args, { stdio: 'inherit' });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
