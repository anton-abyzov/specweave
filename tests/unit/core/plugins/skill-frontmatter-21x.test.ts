/**
 * Unit tests for Claude Code 2.1.x Skill Frontmatter Features
 *
 * Tests for:
 * - context: fork (isolated sub-agent execution)
 * - model: opus/sonnet/haiku (model selection)
 * - hooks: skill-scoped hooks in frontmatter
 *
 * @see https://code.claude.com/docs/en/skills
 * @see https://docs.anthropic.com/en/release-notes/claude-code (v2.1.0+)
 */

import { describe, it, expect } from 'vitest';
import * as yaml from 'yaml';

/**
 * Parses SKILL.md frontmatter and extracts YAML metadata
 */
function parseSkillFrontmatter(content: string): Record<string, unknown> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    return {};
  }
  try {
    return yaml.parse(match[1]) as Record<string, unknown>;
  } catch {
    return {};
  }
}

describe('Skill Frontmatter 2.1.x Features', () => {
  describe('context: fork', () => {
    it('should parse context: fork from frontmatter', () => {
      const content = `---
name: pm
description: Product Manager expertise
context: fork
---

# Product Manager Skill
`;

      const frontmatter = parseSkillFrontmatter(content);

      expect(frontmatter.name).toBe('pm');
      expect(frontmatter.context).toBe('fork');
    });

    it('should allow context field to be absent (defaults to main)', () => {
      const content = `---
name: simple-skill
description: A simple skill without context fork
---

# Simple Skill
`;

      const frontmatter = parseSkillFrontmatter(content);

      expect(frontmatter.name).toBe('simple-skill');
      expect(frontmatter.context).toBeUndefined();
    });

    it('should parse context: fork alongside other frontmatter fields', () => {
      const content = `---
name: architect
description: System Architect expertise
allowed-tools: Read, Write, Edit
context: fork
model: opus
---

# Architect Skill
`;

      const frontmatter = parseSkillFrontmatter(content);

      expect(frontmatter.name).toBe('architect');
      expect(frontmatter.context).toBe('fork');
      expect(frontmatter.model).toBe('opus');
      expect(frontmatter['allowed-tools']).toBe('Read, Write, Edit');
    });
  });

  describe('model field', () => {
    it('should parse model: opus', () => {
      const content = `---
name: critical-skill
description: Critical decision making
model: opus
---

# Critical Skill
`;

      const frontmatter = parseSkillFrontmatter(content);

      expect(frontmatter.model).toBe('opus');
    });

    it('should parse model: opus', () => {
      const content = `---
name: general-skill
model: opus
---

# General Skill
`;

      const frontmatter = parseSkillFrontmatter(content);

      expect(frontmatter.model).toBe('opus');
    });

    it('should parse model: haiku', () => {
      const content = `---
name: fast-skill
model: haiku
---

# Fast Skill
`;

      const frontmatter = parseSkillFrontmatter(content);

      expect(frontmatter.model).toBe('haiku');
    });

    it('should allow model field to be absent (inherits from parent)', () => {
      const content = `---
name: default-model-skill
description: Uses default model
---

# Default Model Skill
`;

      const frontmatter = parseSkillFrontmatter(content);

      expect(frontmatter.model).toBeUndefined();
    });
  });

  describe('hooks in frontmatter', () => {
    it('should parse PostToolUse hooks with matcher', () => {
      const content = `---
name: sw:do
description: Execute increment tasks
hooks:
  PostToolUse:
    - matcher: Edit
      hooks:
        - type: command
          command: bash plugins/specweave/hooks/v2/guards/task-ac-sync-guard.sh
---

# Do Command
`;

      const frontmatter = parseSkillFrontmatter(content);
      const hooks = frontmatter.hooks as Record<string, unknown[]>;

      expect(hooks).toBeDefined();
      expect(hooks.PostToolUse).toBeDefined();
      expect(hooks.PostToolUse).toHaveLength(1);
      expect((hooks.PostToolUse[0] as Record<string, unknown>).matcher).toBe('Edit');
    });

    it('should parse Stop hooks', () => {
      const content = `---
name: sw:done
description: Close increment
hooks:
  Stop:
    - hooks:
        - type: command
          command: bash plugins/specweave/hooks/v2/guards/completion-guard.sh
---

# Done Command
`;

      const frontmatter = parseSkillFrontmatter(content);
      const hooks = frontmatter.hooks as Record<string, unknown[]>;

      expect(hooks).toBeDefined();
      expect(hooks.Stop).toBeDefined();
      expect(hooks.Stop).toHaveLength(1);
    });

    it('should parse multiple matchers for same event', () => {
      const content = `---
name: sw:do
description: Execute tasks
hooks:
  PostToolUse:
    - matcher: Edit
      hooks:
        - type: command
          command: bash hook1.sh
    - matcher: Write
      hooks:
        - type: command
          command: bash hook2.sh
---

# Do Command
`;

      const frontmatter = parseSkillFrontmatter(content);
      const hooks = frontmatter.hooks as Record<string, unknown[]>;

      expect(hooks.PostToolUse).toHaveLength(2);
      expect((hooks.PostToolUse[0] as Record<string, unknown>).matcher).toBe('Edit');
      expect((hooks.PostToolUse[1] as Record<string, unknown>).matcher).toBe('Write');
    });

    it('should parse prompt-type hooks', () => {
      const content = `---
name: code-reviewer
description: Reviews code
hooks:
  PostToolUse:
    - matcher: Edit
      hooks:
        - type: prompt
          prompt: Check if the edit follows coding standards
---

# Code Reviewer
`;

      const frontmatter = parseSkillFrontmatter(content);
      const hooks = frontmatter.hooks as Record<string, unknown[]>;
      const postToolUse = hooks.PostToolUse[0] as Record<string, unknown>;
      const innerHooks = postToolUse.hooks as Record<string, unknown>[];

      expect(innerHooks[0].type).toBe('prompt');
      expect(innerHooks[0].prompt).toBe('Check if the edit follows coding standards');
    });
  });

  describe('combined 2.1.x features', () => {
    it('should parse all 2.1.x features together', () => {
      const content = `---
name: increment-planner
description: Creates comprehensive implementation plans
visibility: internal
invocableBy:
  - sw:increment
context: fork
model: opus
hooks:
  PostToolUse:
    - matcher: Write
      hooks:
        - type: command
          command: bash validate-spec.sh
---

# Increment Planner
`;

      const frontmatter = parseSkillFrontmatter(content);

      // Core fields
      expect(frontmatter.name).toBe('increment-planner');
      expect(frontmatter.visibility).toBe('internal');

      // 2.1.x fields
      expect(frontmatter.context).toBe('fork');
      expect(frontmatter.model).toBe('opus');
      expect(frontmatter.hooks).toBeDefined();

      // invocableBy (array)
      expect(frontmatter.invocableBy).toEqual(['sw:increment']);
    });

    it('should handle SpecWeave pm skill format', () => {
      const content = `---
name: pm
description: Product Manager expertise for creating product requirements, user stories, specifications, and roadmaps.
allowed-tools: Read, Write, Grep, Glob
context: fork
model: opus
---

# Product Manager Skill
`;

      const frontmatter = parseSkillFrontmatter(content);

      expect(frontmatter.name).toBe('pm');
      expect(frontmatter['allowed-tools']).toBe('Read, Write, Grep, Glob');
      expect(frontmatter.context).toBe('fork');
      expect(frontmatter.model).toBe('opus');
    });

    it('should handle SpecWeave sw:do command format with hooks', () => {
      const content = `---
name: sw:do
description: Execute increment implementation following spec and plan - hooks run after EVERY task
hooks:
  PostToolUse:
    - matcher: Edit
      hooks:
        - type: command
          command: bash plugins/specweave/hooks/v2/guards/task-ac-sync-guard.sh
    - matcher: Write
      hooks:
        - type: command
          command: bash plugins/specweave/hooks/v2/guards/task-ac-sync-guard.sh
---

# Do Increment
`;

      const frontmatter = parseSkillFrontmatter(content);
      const hooks = frontmatter.hooks as Record<string, unknown[]>;

      expect(frontmatter.name).toBe('sw:do');
      expect(hooks.PostToolUse).toHaveLength(2);

      // Check first matcher
      const editHook = hooks.PostToolUse[0] as Record<string, unknown>;
      expect(editHook.matcher).toBe('Edit');

      // Check second matcher
      const writeHook = hooks.PostToolUse[1] as Record<string, unknown>;
      expect(writeHook.matcher).toBe('Write');
    });
  });

  describe('backward compatibility', () => {
    it('should parse skills without 2.1.x fields (pre-2.1.0 format)', () => {
      const content = `---
name: legacy-skill
description: A skill from before 2.1.0
allowed-tools: Read
---

# Legacy Skill
`;

      const frontmatter = parseSkillFrontmatter(content);

      expect(frontmatter.name).toBe('legacy-skill');
      expect(frontmatter['allowed-tools']).toBe('Read');
      expect(frontmatter.context).toBeUndefined();
      expect(frontmatter.model).toBeUndefined();
      expect(frontmatter.hooks).toBeUndefined();
    });

    it('should handle skills with only name (minimal frontmatter)', () => {
      const content = `---
name: minimal-skill
---

# Minimal Skill
`;

      const frontmatter = parseSkillFrontmatter(content);

      expect(frontmatter.name).toBe('minimal-skill');
    });

    it('should handle malformed frontmatter gracefully', () => {
      const content = `---
name: bad-skill
description: This has bad YAML
  indentation: wrong
---

# Bad Skill
`;

      // Should not throw, return empty object
      const frontmatter = parseSkillFrontmatter(content);

      // YAML parser might handle this or return partial result
      // The important thing is no crash
      expect(typeof frontmatter).toBe('object');
    });

    it('should handle missing frontmatter', () => {
      const content = `# No Frontmatter Skill

This skill has no YAML frontmatter at all.
`;

      const frontmatter = parseSkillFrontmatter(content);

      expect(frontmatter).toEqual({});
    });
  });
});
