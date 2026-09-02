/**
 * Stack detector - derives the project's build/test/lint commands from the
 * files present in the project root. Used to fill the `{{BUILD_CMD}}`,
 * `{{TEST_CMD}}` and `{{LINT_CMD}}` placeholders of the instruction-file
 * templates. Pure filesystem inspection, no shell.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface StackCommands {
  /** Detected stack label (e.g. "node", "rust"), or "unknown". */
  stack: string;
  build?: string;
  test?: string;
  lint?: string;
}

const NODE_RUNNERS: Array<{ lock: string; run: string }> = [
  { lock: 'pnpm-lock.yaml', run: 'pnpm' },
  { lock: 'yarn.lock', run: 'yarn' },
  { lock: 'bun.lockb', run: 'bun run' },
  { lock: 'bun.lock', run: 'bun run' },
];

function exists(dir: string, name: string): boolean {
  try {
    return fs.existsSync(path.join(dir, name));
  } catch {
    return false;
  }
}

function listDir(dir: string): string[] {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

function readText(dir: string, name: string): string | null {
  try {
    return fs.readFileSync(path.join(dir, name), 'utf-8');
  } catch {
    return null;
  }
}

function detectNode(dir: string): StackCommands | null {
  const raw = readText(dir, 'package.json');
  if (raw === null) return null;
  let scripts: Record<string, unknown> = {};
  try {
    const pkg = JSON.parse(raw);
    if (pkg && typeof pkg.scripts === 'object' && pkg.scripts) scripts = pkg.scripts;
  } catch {
    return { stack: 'node' };
  }
  const runner = NODE_RUNNERS.find(r => exists(dir, r.lock))?.run ?? 'npm run';
  const has = (name: string): boolean => typeof scripts[name] === 'string' && (scripts[name] as string).trim().length > 0;
  const cmd = (name: string): string | undefined => {
    if (!has(name)) return undefined;
    // `npm test` / `pnpm test` / `yarn test` are the idiomatic short forms;
    // bun keeps `bun run test` because bare `bun test` is bun's own runner.
    if (name === 'test' && runner !== 'bun run') return `${runner.replace(/ run$/, '')} test`;
    return `${runner} ${name}`;
  };
  return {
    stack: 'node',
    build: cmd('build'),
    test: cmd('test'),
    lint: cmd('lint'),
  };
}

function detectRust(dir: string): StackCommands | null {
  if (!exists(dir, 'Cargo.toml')) return null;
  return { stack: 'rust', build: 'cargo build', test: 'cargo test', lint: 'cargo clippy' };
}

function detectPython(dir: string): StackCommands | null {
  const pyproject = readText(dir, 'pyproject.toml');
  const hasPytestIni = exists(dir, 'pytest.ini');
  if (pyproject === null && !hasPytestIni) return null;
  const result: StackCommands = { stack: 'python', test: 'pytest' };
  if (pyproject && /\[tool\.ruff/.test(pyproject)) result.lint = 'ruff check .';
  else if (pyproject && /\[tool\.flake8/.test(pyproject)) result.lint = 'flake8';
  return result;
}

function detectGo(dir: string): StackCommands | null {
  if (!exists(dir, 'go.mod')) return null;
  return { stack: 'go', build: 'go build ./...', test: 'go test ./...', lint: 'go vet ./...' };
}

function detectSwiftPackage(dir: string): StackCommands | null {
  if (!exists(dir, 'Package.swift')) return null;
  return { stack: 'swift', build: 'swift build', test: 'swift test' };
}

function detectXcode(dir: string): StackCommands | null {
  const entries = listDir(dir);
  const workspace = entries.find(e => e.endsWith('.xcworkspace'));
  const project = entries.find(e => e.endsWith('.xcodeproj'));
  const container = workspace ?? project;
  if (!container) return null;
  const scheme = container.replace(/\.(xcworkspace|xcodeproj)$/, '');
  const flag = workspace ? `-workspace ${workspace}` : `-project ${project}`;
  return {
    stack: 'xcode',
    build: `xcodebuild build ${flag} -scheme ${scheme}`,
    test: `xcodebuild test ${flag} -scheme ${scheme}`,
  };
}

function detectDotnet(dir: string): StackCommands | null {
  const entries = listDir(dir);
  if (!entries.some(e => e.endsWith('.sln') || e.endsWith('.csproj') || e.endsWith('.fsproj'))) return null;
  return { stack: 'dotnet', build: 'dotnet build', test: 'dotnet test', lint: 'dotnet format --verify-no-changes' };
}

/** Makefile targets fill any command still missing. */
function detectMake(dir: string): Partial<StackCommands> {
  const makefile = readText(dir, 'Makefile') ?? readText(dir, 'makefile');
  if (makefile === null) return {};
  const targets = new Set<string>();
  for (const line of makefile.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_.-]+)\s*:(?!=)/);
    if (m) targets.add(m[1]);
  }
  const out: Partial<StackCommands> = {};
  if (targets.has('build')) out.build = 'make build';
  if (targets.has('test')) out.test = 'make test';
  if (targets.has('lint')) out.lint = 'make lint';
  return out;
}

const DETECTORS: Array<(dir: string) => StackCommands | null> = [
  detectNode,
  detectRust,
  detectPython,
  detectGo,
  detectSwiftPackage,
  detectXcode,
  detectDotnet,
];

/**
 * Detect the project's build/test/lint commands. The first matching stack
 * wins; Makefile targets fill any command the stack left undefined.
 * Commands that cannot be detected stay undefined (the merger renders a TODO).
 */
export function detectStackCommands(projectDir: string): StackCommands {
  let result: StackCommands = { stack: 'unknown' };
  for (const detect of DETECTORS) {
    const found = detect(projectDir);
    if (found) {
      result = found;
      break;
    }
  }
  const make = detectMake(projectDir);
  if (result.stack === 'unknown' && (make.build || make.test || make.lint)) result.stack = 'make';
  result.build ??= make.build;
  result.test ??= make.test;
  result.lint ??= make.lint;
  return result;
}
