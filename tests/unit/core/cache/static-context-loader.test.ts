/**
 * Tests for static-context-loader.ts (0669 Wave 2, T-012/T-013)
 *
 * Behavior under test:
 * - loadStaticContext returns Anthropic SDK cache_control blocks with
 *   `cache_control: { type: "ephemeral" }` for each included file group.
 * - All files are aggregated into a SINGLE breakpoint (ADR-0250: saves
 *   breakpoint budget for dynamic content).
 * - Missing files are silently skipped (NFR-1.2 tolerance) so callers
 *   can list optional paths without blowing up on absent fixtures.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { loadStaticContext } from '../../../../src/core/cache/static-context-loader.js';

let sandboxDir: string;

beforeAll(() => {
  sandboxDir = mkdtempSync(join(tmpdir(), 'static-context-loader-'));
  mkdirSync(join(sandboxDir, '.specweave'), { recursive: true });
  writeFileSync(join(sandboxDir, 'CLAUDE.md'), '# Global rules\nAlpha');
  writeFileSync(join(sandboxDir, '.specweave', 'config.json'), '{"version":"2.0"}');
});

afterAll(() => {
  rmSync(sandboxDir, { recursive: true, force: true });
});

describe('static-context-loader', () => {
  it('returns a single ephemeral cache_control block when files are present', async () => {
    const blocks = await loadStaticContext(
      ['CLAUDE.md', '.specweave/config.json'],
      sandboxDir,
    );

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      type: 'text',
      cache_control: { type: 'ephemeral' },
    });
    expect(blocks[0].text).toContain('CLAUDE.md');
    expect(blocks[0].text).toContain('Alpha');
    expect(blocks[0].text).toContain('.specweave/config.json');
  });

  it('aggregates all files into a single breakpoint (saves budget)', async () => {
    const blocks = await loadStaticContext(
      ['CLAUDE.md', '.specweave/config.json'],
      sandboxDir,
    );

    const breakpointCount = blocks.filter((b) => b.cache_control).length;
    expect(breakpointCount).toBe(1);
  });

  it('silently skips missing files and returns only present ones', async () => {
    const blocks = await loadStaticContext(
      ['CLAUDE.md', 'does-not-exist.md', 'also-missing.json'],
      sandboxDir,
    );

    expect(blocks).toHaveLength(1);
    expect(blocks[0].text).toContain('CLAUDE.md');
    expect(blocks[0].text).not.toContain('does-not-exist.md');
  });

  it('returns empty array when no files exist', async () => {
    const blocks = await loadStaticContext(
      ['missing-one.md', 'missing-two.md'],
      sandboxDir,
    );
    expect(blocks).toEqual([]);
  });
});
