/**
 * Tests for template-loader.ts (0669 Wave 2c, T-037/T-038)
 *
 * Behavior under test:
 * - loadTemplate reads an agent template from
 *   plugins/specweave/skills/team/agents/ and auto-prepends the content
 *   of _protocol.md when the requested name is not _protocol.md itself.
 * - When loadTemplate('_protocol.md') is called, no double-prepend occurs —
 *   the file is returned verbatim.
 */

import { describe, it, expect } from 'vitest';
import { loadTemplate } from '../../../../src/core/team-lead/template-loader.js';

describe('template-loader _protocol.md auto-prepend', () => {
  it('prepends _protocol.md content before domain template content', async () => {
    const result = await loadTemplate('backend.md');
    expect(result.startsWith('# Shared Agent Protocol')).toBe(true);
    expect(result).toContain('BACKEND');
  });

  it('does not double-prepend _protocol.md when loading _protocol.md itself', async () => {
    const result = await loadTemplate('_protocol.md');
    const protocolCount = (result.match(/# Shared Agent Protocol/g) || []).length;
    expect(protocolCount).toBe(1);
  });

  it('includes both protocol signals and domain rules in a combined template', async () => {
    const result = await loadTemplate('frontend.md');
    expect(result).toContain('PLAN_READY');
    expect(result).toContain('COMPLETION');
    expect(result).toContain('FRONTEND');
  });
});
