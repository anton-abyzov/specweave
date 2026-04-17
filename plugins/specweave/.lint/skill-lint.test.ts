/**
 * Tests for skill-lint.ts (0669 Wave 3 / AC-US10-03).
 *
 * The linter enforces:
 *   - SKILL.md declaring `allowed-tools` MUST also include a `## Tool-Use Rationale`
 *     section (or `tool-use-rationale:` frontmatter key).
 *   - Retired 4.7 phrases (ULTRATHINK, thinking.budget_tokens, etc.) are flagged.
 */

import { describe, it, expect } from 'vitest';
import { lintSkillFile } from './skill-lint.js';

describe('skill-lint tool-use-rationale enforcement', () => {
  it('returns a lint error when SKILL.md has allowed-tools but no tool-use-rationale', async () => {
    const content = `---
name: sw/test
allowed-tools: Read, Grep
---

# Test Skill

Body content without a rationale block.
`;
    const result = await lintSkillFile('test/SKILL.md', content);
    expect(result.errors.some((e) => /tool-use-rationale/i.test(e))).toBe(true);
  });

  it('returns no errors when both allowed-tools and tool-use-rationale are present', async () => {
    const content = `---
name: sw/test
allowed-tools: Read, Grep
---

# Test Skill

## Tool-Use Rationale

- **Read**: Load spec.md context when AC IDs are referenced.
- **Grep**: Locate existing ACs to avoid duplication.
`;
    const result = await lintSkillFile('test/SKILL.md', content);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts the frontmatter-style tool-use-rationale key', async () => {
    const content = `---
name: sw/test
allowed-tools: Read, Grep
tool-use-rationale: |
  Read loads context, Grep locates ACs.
---

# Body
`;
    const result = await lintSkillFile('test/SKILL.md', content);
    expect(result.errors).toHaveLength(0);
  });

  it('flags retired phrases regardless of rationale presence', async () => {
    const content = `---
name: sw/test
---

ULTRATHINK BY DEFAULT — think carefully and step-by-step.
`;
    const result = await lintSkillFile('test/SKILL.md', content);
    expect(result.errors.some((e) => /ULTRATHINK/i.test(e))).toBe(true);
  });

  it('flags thinking.budget_tokens retired phrase', async () => {
    const content = `---
name: sw/test
---

Sets thinking.budget_tokens = 4096 during review.
`;
    const result = await lintSkillFile('test/SKILL.md', content);
    expect(result.errors.some((e) => /thinking\.budget_tokens/.test(e))).toBe(true);
  });

  it('returns no errors when a SKILL.md has no allowed-tools and no retired phrases', async () => {
    const content = `---
name: sw/test
---

# Plain skill without tool declarations.
`;
    const result = await lintSkillFile('test/SKILL.md', content);
    expect(result.errors).toHaveLength(0);
  });
});
