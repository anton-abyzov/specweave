#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Publish preflight — "would this tarball actually work?"
//
// Why this exists
// ---------------
// The repo's committed `.npmrc` sets `ignore-scripts=true` to stop DEPENDENCY
// install scripts (the 2026 payload vector). npm's `ignore-scripts` is not
// scoped to dependencies: it also suppresses THIS package's own lifecycle
// hooks, so a bare `npm publish` silently skips `prepublishOnly` — no
// `npm run rebuild`, no `npm run validate:versions`, no preflight. Proven with
// `npm publish --dry-run`: neither script appears in the output. Removing the
// repo's .npmrc would not fix it either — the user's global ~/.npmrc sets the
// same flag.
//
// `dist/` is gitignored, so on a fresh clone the failure mode is not "stale
// build" but "no build at all", and npm publishes a package whose `bin` target
// does not exist without a single warning.
//
// This script is the assertion npm refuses to make. It inspects the tarball npm
// would actually upload — not the working tree — and fails if an entrypoint is
// missing or if dist/ is older than the src/ it is built from.
//
// Where it runs
//   - `prepublishOnly`            (fires whenever hooks are enabled at all)
//   - `npm run release`           (the documented hand-publish path; it passes
//                                  --ignore-scripts=false so hooks DO run)
//   - `.github/workflows/release.yml` as an explicit step, because the CI
//     publish inherits the same ignore-scripts and cannot rely on the hook
//   - `.github/workflows/publish-guard.yml` proves it still refuses an
//     unbuilt tree, so the guard can never go vacuous
//
// Run it directly with `npm run release:preflight`.
// ---------------------------------------------------------------------------
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const pkg = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

const failures = [];
const fail = (msg) => failures.push(msg);

// --- 1. What would npm actually put in the tarball? ------------------------
// `npm pack --dry-run` writes nothing; it reports the exact entry list npm
// would upload, honouring `files`, .npmignore and npm's built-in rules.
let entries;
try {
  const raw = execFileSync('npm', ['pack', '--dry-run', '--json'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, npm_config_ignore_scripts: 'true' }, // no nested hooks
  });
  // Some npm versions print a notice before the JSON payload; take the array.
  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  if (start === -1 || end === -1) throw new Error(`no JSON array in npm pack output:\n${raw}`);
  entries = new Set(JSON.parse(raw.slice(start, end + 1))[0].files.map((f) => f.path));
} catch (err) {
  console.error('[preflight] `npm pack --dry-run --json` failed:');
  console.error(err.stderr?.toString() ?? err.message);
  process.exit(1);
}

const has = (p) => entries.has(p.replace(/^\.\//, ''));
const hasUnder = (prefix) => [...entries].some((f) => f.startsWith(prefix));

// --- 2. Every entrypoint the package declares must be IN that tarball ------
const entrypoints = [
  ...(pkg.main ? [pkg.main] : []),
  ...Object.values(pkg.bin ?? {}),
].map((p) => p.replace(/^\.\//, ''));

for (const ep of entrypoints) {
  if (!has(ep)) {
    fail(
      `${ep} is declared in package.json (main/bin) but is NOT in the tarball — ` +
        'publish with `npm run release`, never bare `npm publish`.',
    );
  }
}

// --- 3. The npm lifecycle scripts the INSTALLER runs must ship too ---------
// preinstall/preuninstall point at these; a tarball without them fails on the
// user's machine, not ours.
for (const key of ['preinstall', 'preuninstall']) {
  const script = pkg.scripts?.[key];
  if (!script) continue;
  for (const file of script.match(/scripts\/[\w./-]+/g) ?? []) {
    if (!has(file)) fail(`${file} is run by the \`${key}\` lifecycle but is NOT in the tarball.`);
  }
}

// --- 4. The compiled CLI ---------------------------------------------------
// bin/specweave.js is a thin launcher: every subcommand is a lazy
// `import('../dist/src/cli/commands/<x>.js')`. tsc output missing from the
// tarball turns each of those into a runtime crash, not a publish error.
const binEntry = path.join(repoRoot, entrypoints[0] ?? 'bin/specweave.js');
if (existsSync(binEntry)) {
  const lazyImports = new Set(
    [...readFileSync(binEntry, 'utf8').matchAll(/['"]\.\.\/(dist\/[\w./-]+\.js)['"]/g)].map((m) => m[1]),
  );
  const missing = [...lazyImports].filter((f) => !has(f)).sort();
  if (missing.length > 0) {
    fail(
      `${missing.length} module(s) ${path.basename(binEntry)} imports at runtime are missing from the ` +
        `tarball (e.g. ${missing.slice(0, 3).join(', ')}) — \`npm run build\` did not run.`,
    );
  }
} else {
  fail(`${binEntry} does not exist on disk.`);
}

// --- 5. The dashboard bundle ships from dist/dashboard ---------------------
// `build:dashboard` is a separate vite build; `tsc` alone leaves it out and
// `specweave dashboard` then 404s at runtime instead of failing at publish.
if (!hasUnder('dist/dashboard/')) {
  fail('dist/dashboard/** is missing from the tarball — `npm run build:dashboard` did not run.');
}

// --- 6. The plugin manifests Claude Code reads -----------------------------
// A tarball without these installs a CLI with no plugin: `claude plugin
// install` and `specweave refresh-plugins` both go quiet.
for (const manifest of ['.claude-plugin/marketplace.json', 'plugins/specweave/.claude-plugin/plugin.json']) {
  if (!has(manifest)) fail(`${manifest} is missing from the tarball — the plugin would not install.`);
}

// --- 7. Freshness: dist must not predate src -------------------------------
// Catches the other half of the hole: a dist/ left over from an older checkout.
function newestMtime(dir, filter = () => true) {
  let newest = 0;
  const walk = (d) => {
    let items;
    try {
      items = readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const item of items) {
      const full = path.join(d, item.name);
      if (item.isDirectory()) {
        if (item.name === 'node_modules') continue;
        walk(full);
      } else if (filter(full)) {
        const m = statSync(full).mtimeMs;
        if (m > newest) newest = m;
      }
    }
  };
  walk(dir);
  return newest;
}

const newestDist = newestMtime(path.join(repoRoot, 'dist'));
// Test files and templates are not compiled into dist, so touching one must not
// read as stale.
const newestSrc = newestMtime(
  path.join(repoRoot, 'src'),
  (f) => /\.[cm]?tsx?$/.test(f) && !/\.(test|spec)\.[cm]?tsx?$/.test(f),
);

if (newestDist === 0) {
  fail('dist/ is empty or absent — run `npm run build`.');
} else if (newestSrc > newestDist) {
  fail(
    'dist/ is older than src/ — the build output is stale. ' +
      `newest src ${new Date(newestSrc).toISOString()} > newest dist ${new Date(newestDist).toISOString()}.`,
  );
}

// --- Report ----------------------------------------------------------------
if (failures.length > 0) {
  console.error('[preflight] refusing to publish:\n');
  for (const f of failures) console.error(`  - ${f}`);
  console.error(
    '\nThe repo .npmrc sets ignore-scripts=true, which also suppresses this\n' +
      "package's own prepublishOnly hook. Use `npm run release` (it passes\n" +
      '--ignore-scripts=false) so the build actually runs before publishing.\n',
  );
  process.exit(1);
}

console.log(
  `[preflight] ok — tarball carries ${entries.size} entries including ${entrypoints.join(', ')}, ` +
    'the dist/ modules bin imports, dist/dashboard/** and both plugin manifests',
);
