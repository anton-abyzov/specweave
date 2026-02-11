/**
 * Tests for output normalization utilities
 *
 * Verifies that:
 * 1. ANSI escape codes are stripped correctly
 * 2. Line endings are normalized
 * 3. Spinner/progress artifacts are removed
 * 4. JSON extraction works from mixed output
 * 5. Multiple JSON objects can be extracted
 */
import { describe, it, expect } from 'vitest';
import {
  stripAnsi,
  normalizeLineEndings,
  stripSpinnerOutput,
  normalizeOutput,
  extractJson,
  extractAllJson,
} from '../../test-utils/normalize-output.js';

describe('stripAnsi', () => {
  it('should strip color codes', () => {
    const colored = '\x1B[31mError:\x1B[0m something failed';
    expect(stripAnsi(colored)).toBe('Error: something failed');
  });

  it('should strip bold/underline codes', () => {
    const styled = '\x1B[1mBold\x1B[0m and \x1B[4munderlined\x1B[0m';
    expect(stripAnsi(styled)).toBe('Bold and underlined');
  });

  it('should strip cursor movement codes', () => {
    const cursor = '\x1B[2K\x1B[1GDone!';
    expect(stripAnsi(cursor)).toBe('Done!');
  });

  it('should handle strings without ANSI codes', () => {
    const plain = 'plain text';
    expect(stripAnsi(plain)).toBe('plain text');
  });

  it('should handle empty strings', () => {
    expect(stripAnsi('')).toBe('');
  });

  it('should strip nested color codes', () => {
    const nested = '\x1B[32m✓\x1B[0m \x1B[90m(2ms)\x1B[0m';
    expect(stripAnsi(nested)).toBe('✓ (2ms)');
  });
});

describe('normalizeLineEndings', () => {
  it('should convert \\r\\n to \\n', () => {
    expect(normalizeLineEndings('line1\r\nline2\r\n')).toBe('line1\nline2\n');
  });

  it('should convert standalone \\r to \\n', () => {
    expect(normalizeLineEndings('line1\rline2')).toBe('line1\nline2');
  });

  it('should leave \\n unchanged', () => {
    expect(normalizeLineEndings('line1\nline2\n')).toBe('line1\nline2\n');
  });
});

describe('stripSpinnerOutput', () => {
  it('should remove spinner character lines', () => {
    const output = 'Starting...\n⠋\n⠙\n⠹\nDone!';
    expect(stripSpinnerOutput(output)).toBe('Starting...\nDone!');
  });

  it('should keep regular content', () => {
    const output = 'Line 1\nLine 2\nLine 3';
    expect(stripSpinnerOutput(output)).toBe('Line 1\nLine 2\nLine 3');
  });

  it('should remove lines that are empty after ANSI stripping', () => {
    const output = 'Real content\n\x1B[31m\x1B[0m\nMore content';
    expect(stripSpinnerOutput(output)).toBe('Real content\nMore content');
  });
});

describe('normalizeOutput', () => {
  it('should strip ANSI + normalize endings + trim', () => {
    const messy = '  \x1B[32m✓\x1B[0m Test passed\r\n  ';
    expect(normalizeOutput(messy)).toBe('✓ Test passed');
  });

  it('should handle complex real-world CLI output', () => {
    const cliOutput = '\x1B[2K\x1B[1G⠋ Loading...\r\n\x1B[2K\x1B[1G\x1B[32m✓\x1B[0m Done!\r\n';
    const result = normalizeOutput(cliOutput);
    expect(result).toContain('Done!');
    expect(result).not.toContain('\x1B');
  });
});

describe('extractJson', () => {
  it('should extract JSON from pure JSON string', () => {
    const json = '{"key": "value", "num": 42}';
    expect(extractJson(json)).toEqual({ key: 'value', num: 42 });
  });

  it('should extract JSON preceded by log lines', () => {
    const mixed = 'Loading config...\nProcessing...\n{"decision": "approve", "reason": "ok"}';
    const result = extractJson<{ decision: string }>(mixed);
    expect(result).toEqual({ decision: 'approve', reason: 'ok' });
  });

  it('should extract JSON followed by trailing output', () => {
    const mixed = '{"status": "ok"}\nDone!';
    expect(extractJson(mixed)).toEqual({ status: 'ok' });
  });

  it('should extract multi-line JSON', () => {
    const multiline = 'Header\n{\n  "key": "value",\n  "nested": {\n    "a": 1\n  }\n}\nFooter';
    expect(extractJson(multiline)).toEqual({ key: 'value', nested: { a: 1 } });
  });

  it('should return null for invalid JSON', () => {
    expect(extractJson('not json at all')).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(extractJson('')).toBeNull();
  });

  it('should extract JSON arrays', () => {
    const arrayJson = 'Output:\n[1, 2, 3]';
    expect(extractJson(arrayJson)).toEqual([1, 2, 3]);
  });

  it('should strip ANSI codes before parsing', () => {
    const colored = '\x1B[32m{"ok": true}\x1B[0m';
    expect(extractJson(colored)).toEqual({ ok: true });
  });

  it('should handle hook output format', () => {
    const hookOutput =
      'SPECWEAVE_HOOK_DEBUG: Starting...\n' +
      'SPECWEAVE_HOOK_DEBUG: Config loaded\n' +
      '{"decision": "block", "reason": "TDD mode active", "hookSpecificOutput": {"additionalContext": "test"}}';
    const result = extractJson<{ decision: string; reason: string }>(hookOutput);
    expect(result?.decision).toBe('block');
    expect(result?.reason).toBe('TDD mode active');
  });
});

describe('extractAllJson', () => {
  it('should extract multiple JSON objects', () => {
    const multi = '{"a": 1}\nSeparator\n{"b": 2}';
    const results = extractAllJson(multi);
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ a: 1 });
    expect(results[1]).toEqual({ b: 2 });
  });

  it('should return empty array when no JSON found', () => {
    expect(extractAllJson('no json here')).toEqual([]);
  });

  it('should handle single JSON', () => {
    const single = '{"only": "one"}';
    const results = extractAllJson(single);
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ only: 'one' });
  });
});
