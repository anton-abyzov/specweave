import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { detectStackCommands } from '../../../../../src/cli/helpers/init/stack-detector.js';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-stack-'));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

const write = (name: string, content = ''): void => {
  fs.mkdirSync(path.join(dir, path.dirname(name)), { recursive: true });
  fs.writeFileSync(path.join(dir, name), content);
};

describe('detectStackCommands', () => {
  it('reads package.json scripts (npm by default)', () => {
    write('package.json', JSON.stringify({ scripts: { build: 'tsc', test: 'vitest run', lint: 'eslint .' } }));
    expect(detectStackCommands(dir)).toEqual({ stack: 'node', build: 'npm run build', test: 'npm test', lint: 'npm run lint' });
  });

  it('leaves missing scripts undefined and honours the lockfile runner', () => {
    write('package.json', JSON.stringify({ scripts: { test: 'vitest run' } }));
    write('pnpm-lock.yaml');
    expect(detectStackCommands(dir)).toEqual({ stack: 'node', build: undefined, test: 'pnpm test', lint: undefined });
  });

  it('Cargo.toml → cargo', () => {
    write('Cargo.toml', '[package]');
    expect(detectStackCommands(dir)).toEqual({ stack: 'rust', build: 'cargo build', test: 'cargo test', lint: 'cargo clippy' });
  });

  it('pyproject.toml / pytest.ini → pytest (+ ruff when configured)', () => {
    write('pytest.ini');
    expect(detectStackCommands(dir)).toEqual({ stack: 'python', test: 'pytest' });
    write('pyproject.toml', '[tool.ruff]\nline-length = 100\n');
    expect(detectStackCommands(dir).lint).toBe('ruff check .');
  });

  it('go.mod → go', () => {
    write('go.mod', 'module example.com/x');
    expect(detectStackCommands(dir)).toEqual({ stack: 'go', build: 'go build ./...', test: 'go test ./...', lint: 'go vet ./...' });
  });

  it('Package.swift → swift', () => {
    write('Package.swift');
    expect(detectStackCommands(dir)).toEqual({ stack: 'swift', build: 'swift build', test: 'swift test' });
  });

  it('xcworkspace / xcodeproj → xcodebuild with the scheme name', () => {
    fs.mkdirSync(path.join(dir, 'Anticry.xcodeproj'));
    expect(detectStackCommands(dir).test).toBe('xcodebuild test -project Anticry.xcodeproj -scheme Anticry');
    fs.mkdirSync(path.join(dir, 'Anticry.xcworkspace'));
    expect(detectStackCommands(dir).test).toBe('xcodebuild test -workspace Anticry.xcworkspace -scheme Anticry');
  });

  it('.sln / .csproj → dotnet', () => {
    write('EasyChamp.sln');
    expect(detectStackCommands(dir)).toEqual({ stack: 'dotnet', build: 'dotnet build', test: 'dotnet test', lint: 'dotnet format --verify-no-changes' });
  });

  it('Makefile targets fill the gaps, and stand alone when nothing else matches', () => {
    write('Makefile', 'build:\n\tgo build\n\ntest:\n\tgo test\n\nlint:\n\tgolangci-lint run\n');
    expect(detectStackCommands(dir)).toEqual({ stack: 'make', build: 'make build', test: 'make test', lint: 'make lint' });
    write('Package.swift');
    expect(detectStackCommands(dir)).toEqual({ stack: 'swift', build: 'swift build', test: 'swift test', lint: 'make lint' });
  });

  it('unknown stack → everything undefined', () => {
    expect(detectStackCommands(dir)).toEqual({ stack: 'unknown', build: undefined, test: undefined, lint: undefined });
  });

  it('never throws on a broken package.json', () => {
    write('package.json', '{ not json');
    expect(detectStackCommands(dir).stack).toBe('node');
  });
});
