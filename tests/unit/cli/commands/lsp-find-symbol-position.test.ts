/**
 * Tests for findSymbolPosition() two-pass search fix
 *
 * Verifies that findSymbolPosition() returns the DECLARATION of a symbol
 * (class, function, interface, etc.) rather than the first import/usage.
 * This was causing "find references" to resolve on the import line
 * instead of the actual declaration.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import { findSymbolPosition } from '../../../../src/cli/commands/lsp.js';

describe('findSymbolPosition two-pass search', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsp-symbol-pos-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should find class declaration, not import', () => {
    const filePath = path.join(tempDir, 'test.ts');
    fs.writeFileSync(
      filePath,
      [
        'import { SomeHelper } from "./helper";',
        'import { Logger } from "./logger";',
        '',
        '/**',
        ' * Main manager class',
        ' */',
        'export class LSPManager {',
        '  private logger: Logger;',
        '',
        '  constructor() {',
        '    this.logger = new Logger();',
        '  }',
        '}',
      ].join('\n')
    );

    const result = findSymbolPosition(filePath, 'LSPManager');

    expect(result).not.toBeNull();
    // Should find on line 6 (0-indexed) where "export class LSPManager" is
    expect(result!.line).toBe(6);
    expect(result!.character).toBeGreaterThanOrEqual(0);
  });

  it('should find function declaration, not call site', () => {
    const filePath = path.join(tempDir, 'test.ts');
    fs.writeFileSync(
      filePath,
      [
        'const result = doSomething();', // usage (line 0)
        '',
        'export function doSomething(): string {', // declaration (line 2)
        '  return "hello";',
        '}',
      ].join('\n')
    );

    const result = findSymbolPosition(filePath, 'doSomething');

    expect(result).not.toBeNull();
    // Should find function declaration on line 2, not usage on line 0
    expect(result!.line).toBe(2);
  });

  it('should find async function declaration', () => {
    const filePath = path.join(tempDir, 'test.ts');
    fs.writeFileSync(
      filePath,
      [
        'import { initialize } from "./init";',
        '',
        'export async function initialize(): Promise<void> {',
        '  // implementation',
        '}',
      ].join('\n')
    );

    const result = findSymbolPosition(filePath, 'initialize');

    expect(result).not.toBeNull();
    // Should find async function declaration on line 2, not import on line 0
    expect(result!.line).toBe(2);
  });

  it('should find interface declaration', () => {
    const filePath = path.join(tempDir, 'test.ts');
    fs.writeFileSync(
      filePath,
      [
        'import type { Config } from "./config";',
        '',
        'function useConfig(c: Config) { return c; }',
        '',
        'export interface Config {',
        '  name: string;',
        '}',
      ].join('\n')
    );

    const result = findSymbolPosition(filePath, 'Config');

    expect(result).not.toBeNull();
    // Should find interface declaration on line 4, not import on line 0
    expect(result!.line).toBe(4);
  });

  it('should find type declaration', () => {
    const filePath = path.join(tempDir, 'test.ts');
    fs.writeFileSync(
      filePath,
      [
        'function check(x: MyType) { return x; }',
        '',
        'export type MyType = string | number;',
      ].join('\n')
    );

    const result = findSymbolPosition(filePath, 'MyType');

    expect(result).not.toBeNull();
    // Should find type declaration on line 2, not usage on line 0
    expect(result!.line).toBe(2);
  });

  it('should find const declaration', () => {
    const filePath = path.join(tempDir, 'test.ts');
    fs.writeFileSync(
      filePath,
      [
        'console.log(DEFAULT_TIMEOUT);',
        '',
        'export const DEFAULT_TIMEOUT = 60000;',
      ].join('\n')
    );

    const result = findSymbolPosition(filePath, 'DEFAULT_TIMEOUT');

    expect(result).not.toBeNull();
    // Should find const declaration on line 2, not usage on line 0
    expect(result!.line).toBe(2);
  });

  it('should find method in class', () => {
    const filePath = path.join(tempDir, 'test.ts');
    fs.writeFileSync(
      filePath,
      [
        'class MyClass {',
        '  async handleMessage(msg: any): void {',
        '    // implementation',
        '  }',
        '}',
      ].join('\n')
    );

    const result = findSymbolPosition(filePath, 'handleMessage');

    expect(result).not.toBeNull();
    expect(result!.line).toBe(1);
  });

  it('should fall back to generic match when no declaration found', () => {
    const filePath = path.join(tempDir, 'test.ts');
    fs.writeFileSync(
      filePath,
      [
        'if (something.myVar) {',
        '  doStuff();',
        '}',
      ].join('\n')
    );

    const result = findSymbolPosition(filePath, 'myVar');

    expect(result).not.toBeNull();
    // Should fall back to first occurrence via generic word boundary
    expect(result!.line).toBe(0);
  });

  it('should return null for non-existent symbol', () => {
    const filePath = path.join(tempDir, 'test.ts');
    fs.writeFileSync(filePath, 'const x = 1;');

    const result = findSymbolPosition(filePath, 'nonExistentSymbol');

    expect(result).toBeNull();
  });

  it('should return null for non-existent file', () => {
    const result = findSymbolPosition(
      path.join(tempDir, 'nonexistent.ts'),
      'SomeSymbol'
    );

    expect(result).toBeNull();
  });

  it('should handle property assignment pattern', () => {
    const filePath = path.join(tempDir, 'test.ts');
    fs.writeFileSync(
      filePath,
      [
        'const obj = {',
        '  myProp: "value",',
        '};',
      ].join('\n')
    );

    const result = findSymbolPosition(filePath, 'myProp');

    expect(result).not.toBeNull();
    expect(result!.line).toBe(1);
  });

  it('should prefer class declaration over import when both exist in same file', () => {
    const filePath = path.join(tempDir, 'test.ts');
    fs.writeFileSync(
      filePath,
      [
        "import { LSPClient } from './other';",
        '',
        '// Re-export with modifications',
        'export class LSPClient {',
        '  // custom implementation',
        '}',
      ].join('\n')
    );

    const result = findSymbolPosition(filePath, 'LSPClient');

    expect(result).not.toBeNull();
    // Should find class declaration on line 3, not import on line 0
    expect(result!.line).toBe(3);
  });

  it('should correctly report character position', () => {
    const filePath = path.join(tempDir, 'test.ts');
    fs.writeFileSync(
      filePath,
      'export class MySpecialClass {\n}\n'
    );

    const result = findSymbolPosition(filePath, 'MySpecialClass');

    expect(result).not.toBeNull();
    expect(result!.line).toBe(0);
    // "export class MySpecialClass" - MySpecialClass starts at index 13
    expect(result!.character).toBe(13);
  });
});
