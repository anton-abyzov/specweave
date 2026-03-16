/**
 * Tests for platform.ts findProjectRoot deduplication
 *
 * Verifies that platform.ts re-exports findProjectRoot from the canonical
 * utils/find-project-root.ts instead of maintaining its own copy.
 */

import { describe, it, expect } from 'vitest';
import { findProjectRoot as platformFindProjectRoot } from '../../../../src/hooks/platform.js';
import { findProjectRoot as canonicalFindProjectRoot } from '../../../../src/utils/find-project-root.js';

describe('platform.ts findProjectRoot deduplication', () => {
  it('AC-US4-01: platform.findProjectRoot is the same reference as canonical', () => {
    expect(platformFindProjectRoot).toBe(canonicalFindProjectRoot);
  });

  it('AC-US4-02: platform.findProjectRoot has the same behavior as canonical', () => {
    // Call with a path that definitely has no .specweave
    const result1 = platformFindProjectRoot('/tmp/nonexistent-path-12345');
    const result2 = canonicalFindProjectRoot('/tmp/nonexistent-path-12345');
    expect(result1).toBe(result2);
  });
});
