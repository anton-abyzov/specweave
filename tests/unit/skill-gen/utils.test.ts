import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

import {
  collectMarkdownFiles,
  loadSignalStore,
  saveSignalStore,
  sanitizeString,
  estimateTokenCount,
  capEvidence,
  SignalStoreSchema,
  SignalEntrySchema,
  TOKEN_BUDGET,
  MAX_EVIDENCE,
  MAX_STRING_LENGTH,
} from '../../../src/core/skill-gen/utils.js';
import type { SignalStore } from '../../../src/core/skill-gen/types.js';

describe('utils.ts', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'sw-utils-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('constants', () => {
    it('exports TOKEN_BUDGET as 50000', () => {
      expect(TOKEN_BUDGET).toBe(50000);
    });

    it('exports MAX_EVIDENCE as 20', () => {
      expect(MAX_EVIDENCE).toBe(20);
    });

    it('exports MAX_STRING_LENGTH as 200', () => {
      expect(MAX_STRING_LENGTH).toBe(200);
    });
  });

  describe('collectMarkdownFiles', () => {
    it('finds .md files recursively', async () => {
      const subDir = join(tempDir, 'sub');
      await mkdir(subDir, { recursive: true });
      await writeFile(join(tempDir, 'a.md'), 'content');
      await writeFile(join(subDir, 'b.md'), 'content');
      await writeFile(join(tempDir, 'c.txt'), 'not markdown');

      const files = await collectMarkdownFiles(tempDir);
      expect(files).toHaveLength(2);
      expect(files.some((f) => f.endsWith('a.md'))).toBe(true);
      expect(files.some((f) => f.endsWith('b.md'))).toBe(true);
    });

    it('skips non-md files', async () => {
      await writeFile(join(tempDir, 'readme.txt'), 'text');
      await writeFile(join(tempDir, 'data.json'), '{}');

      const files = await collectMarkdownFiles(tempDir);
      expect(files).toHaveLength(0);
    });

    it('returns empty array for non-existent directory', async () => {
      const files = await collectMarkdownFiles(join(tempDir, 'nonexistent'));
      expect(files).toHaveLength(0);
    });
  });

  describe('loadSignalStore', () => {
    it('returns valid store from well-formed file', async () => {
      const filePath = join(tempDir, 'signals.json');
      const validStore: SignalStore = {
        version: '1.0',
        signals: [
          {
            id: 'sig-1',
            pattern: 'test-pattern',
            category: 'testing',
            description: 'A test pattern',
            incrementIds: ['0001'],
            firstSeen: '2026-01-01T00:00:00.000Z',
            lastSeen: '2026-01-01T00:00:00.000Z',
            confidence: 0.5,
            evidence: ['file.md'],
            suggested: false,
            declined: false,
            generated: false,
          },
        ],
      };
      await writeFile(filePath, JSON.stringify(validStore));

      const loaded = await loadSignalStore(filePath);
      expect(loaded.version).toBe('1.0');
      expect(loaded.signals).toHaveLength(1);
      expect(loaded.signals[0].id).toBe('sig-1');
    });

    it('returns empty store for missing file', async () => {
      const filePath = join(tempDir, 'nonexistent.json');
      const store = await loadSignalStore(filePath);
      expect(store.version).toBe('1.0');
      expect(store.signals).toEqual([]);
    });

    it('returns empty store and logs warning for corrupted file', async () => {
      const filePath = join(tempDir, 'bad.json');
      await writeFile(filePath, '{corrupt!!!');

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const store = await loadSignalStore(filePath);

      expect(store.version).toBe('1.0');
      expect(store.signals).toEqual([]);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('creates backup of corrupted file', async () => {
      const filePath = join(tempDir, 'bad.json');
      await writeFile(filePath, '{corrupt!!!');

      vi.spyOn(console, 'warn').mockImplementation(() => {});
      await loadSignalStore(filePath);

      const backup = await readFile(filePath + '.bak', 'utf-8');
      expect(backup).toBe('{corrupt!!!');
      vi.restoreAllMocks();
    });

    it('returns empty store for Zod-invalid data', async () => {
      const filePath = join(tempDir, 'invalid.json');
      await writeFile(filePath, JSON.stringify({ version: 123, signals: 'not-array' }));

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const store = await loadSignalStore(filePath);

      expect(store.version).toBe('1.0');
      expect(store.signals).toEqual([]);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('saveSignalStore', () => {
    it('writes valid JSON to file', async () => {
      const filePath = join(tempDir, 'output', 'signals.json');
      const store: SignalStore = { version: '1.0', signals: [] };

      await saveSignalStore(filePath, store);

      const content = JSON.parse(await readFile(filePath, 'utf-8'));
      expect(content.version).toBe('1.0');
      expect(content.signals).toEqual([]);
    });

    it('creates parent directories if they do not exist', async () => {
      const filePath = join(tempDir, 'deep', 'nested', 'signals.json');
      const store: SignalStore = { version: '1.0', signals: [] };

      await saveSignalStore(filePath, store);

      const content = await readFile(filePath, 'utf-8');
      expect(JSON.parse(content)).toEqual(store);
    });
  });

  describe('sanitizeString', () => {
    it('strips control characters', () => {
      const input = 'hello\x00world\x1F\x7F';
      expect(sanitizeString(input)).toBe('helloworld');
    });

    it('truncates to MAX_STRING_LENGTH by default', () => {
      const input = 'a'.repeat(300);
      const result = sanitizeString(input);
      expect(result.length).toBe(MAX_STRING_LENGTH);
    });

    it('truncates to custom max length', () => {
      const input = 'a'.repeat(50);
      const result = sanitizeString(input, 10);
      expect(result.length).toBe(10);
    });

    it('returns short strings unchanged if no control chars', () => {
      expect(sanitizeString('hello')).toBe('hello');
    });
  });

  describe('estimateTokenCount', () => {
    it('returns ceil(text.length / 4)', () => {
      expect(estimateTokenCount('abcd')).toBe(1);
      expect(estimateTokenCount('abcde')).toBe(2);
      expect(estimateTokenCount('')).toBe(0);
      expect(estimateTokenCount('a'.repeat(100))).toBe(25);
    });
  });

  describe('capEvidence', () => {
    it('returns array unchanged when under max', () => {
      const evidence = ['a', 'b', 'c'];
      expect(capEvidence(evidence)).toEqual(['a', 'b', 'c']);
    });

    it('evicts oldest entries (FIFO) when exceeding MAX_EVIDENCE', () => {
      const evidence = Array.from({ length: 25 }, (_, i) => `item-${i}`);
      const capped = capEvidence(evidence);
      expect(capped).toHaveLength(MAX_EVIDENCE);
      // Should keep the last 20 (newest)
      expect(capped[0]).toBe('item-5');
      expect(capped[capped.length - 1]).toBe('item-24');
    });

    it('uses custom max when provided', () => {
      const evidence = ['a', 'b', 'c', 'd', 'e'];
      const capped = capEvidence(evidence, 3);
      expect(capped).toHaveLength(3);
      expect(capped).toEqual(['c', 'd', 'e']);
    });
  });

  describe('SignalEntrySchema', () => {
    it('parses a valid signal entry', () => {
      const valid = {
        id: 'sig-1',
        pattern: 'test',
        category: 'testing',
        description: 'desc',
        incrementIds: ['0001'],
        firstSeen: '2026-01-01T00:00:00.000Z',
        lastSeen: '2026-01-01T00:00:00.000Z',
        confidence: 0.5,
        evidence: ['file.md'],
        suggested: false,
        declined: false,
        generated: false,
      };
      expect(() => SignalEntrySchema.parse(valid)).not.toThrow();
    });

    it('accepts entry with optional uniqueSourceFiles', () => {
      const valid = {
        id: 'sig-1',
        pattern: 'test',
        category: 'testing',
        description: 'desc',
        incrementIds: ['0001'],
        firstSeen: '2026-01-01T00:00:00.000Z',
        lastSeen: '2026-01-01T00:00:00.000Z',
        confidence: 0.5,
        evidence: ['file.md'],
        suggested: false,
        declined: false,
        generated: false,
        uniqueSourceFiles: ['src/foo.ts'],
      };
      expect(() => SignalEntrySchema.parse(valid)).not.toThrow();
    });

    it('rejects malformed entry', () => {
      const invalid = { id: 123, pattern: null };
      expect(() => SignalEntrySchema.parse(invalid)).toThrow();
    });
  });

  describe('SignalStoreSchema', () => {
    it('parses a valid store', () => {
      const valid = { version: '1.0', signals: [] };
      expect(() => SignalStoreSchema.parse(valid)).not.toThrow();
    });

    it('rejects store with wrong version type', () => {
      const invalid = { version: 123, signals: [] };
      expect(() => SignalStoreSchema.parse(invalid)).toThrow();
    });

    it('rejects store with non-array signals', () => {
      const invalid = { version: '1.0', signals: 'not-array' };
      expect(() => SignalStoreSchema.parse(invalid)).toThrow();
    });
  });
});
