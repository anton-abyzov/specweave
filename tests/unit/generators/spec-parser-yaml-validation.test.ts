/**
 * Unit tests for YAML frontmatter validation in spec-parser
 *
 * Tests the robust YAML parsing introduced to prevent malformed frontmatter errors.
 * Part of multi-layered YAML validation strategy (CLAUDE.md Rule #16).
 *
 * Related:
 * - src/generators/spec/spec-parser.ts (uses js-yaml library)
 * - scripts/pre-commit-yaml-validation.sh (pre-commit hook)
 * - tests/integration/commands/plan-command.integration.test.ts:626 (malformed YAML edge case)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { parseSpecMd } from '../../../src/generators/spec/spec-parser.js';

describe('Spec Parser - YAML Frontmatter Validation', () => {
  let testDir: string;
  let specPath: string;

  beforeEach(() => {
    // Create temporary test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-parser-yaml-test-'));
    specPath = path.join(testDir, 'spec.md');
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Valid YAML Frontmatter', () => {
    it('should parse minimal valid frontmatter (increment only)', () => {
      const content = `---
increment: 0001-test-feature
---

# Test Feature

## User Stories
### US-001: Test Story
**Acceptance Criteria**:
- [ ] **AC-US1-01**: Test AC
`;
      fs.writeFileSync(specPath, content);

      const result = parseSpecMd(specPath);

      expect(result.incrementId).toBe('0001-test-feature');
      expect(result.title).toBe('0001-test-feature'); // Default to increment ID
    });

    it('should parse full frontmatter (increment + title + feature_id)', () => {
      const content = `---
increment: 0042-bug-fix
title: Critical Bug Fix
feature_id: FS-013
---

# Bug Fix

## User Stories
### US-001: Fix Bug
**Acceptance Criteria**:
- [ ] **AC-US1-01**: Bug fixed
`;
      fs.writeFileSync(specPath, content);

      const result = parseSpecMd(specPath);

      expect(result.incrementId).toBe('0042-bug-fix');
      expect(result.title).toBe('Critical Bug Fix');
    });

    it('should handle increment ID with multiple hyphens', () => {
      const content = `---
increment: 0099-multi-word-feature-name
---

# Multi Word Feature

## User Stories
### US-001: Test
**Acceptance Criteria**:
- [ ] **AC-US1-01**: Test
`;
      fs.writeFileSync(specPath, content);

      const result = parseSpecMd(specPath);

      expect(result.incrementId).toBe('0099-multi-word-feature-name');
    });
  });

  describe('Malformed YAML Frontmatter', () => {
    it('should throw descriptive error for unclosed bracket', () => {
      const content = `---
increment: 0015-malformed-yaml
this is broken yaml: [unclosed
---

# Some content
## User Stories
### US-001: Test
**Acceptance Criteria**:
- [ ] **AC-US1-01**: Test
`;
      fs.writeFileSync(specPath, content);

      expect(() => parseSpecMd(specPath)).toThrow(/Malformed YAML frontmatter/);
      expect(() => parseSpecMd(specPath)).toThrow(/unclosed/i);
    });

    it('should throw descriptive error for unclosed quote', () => {
      const content = `---
increment: 0001-test
title: "unclosed string
---

# Content
## User Stories
### US-001: Test
**Acceptance Criteria**:
- [ ] **AC-US1-01**: Test
`;
      fs.writeFileSync(specPath, content);

      expect(() => parseSpecMd(specPath)).toThrow(/Malformed YAML frontmatter/);
    });

    it('should throw descriptive error for invalid YAML object', () => {
      const content = `---
increment: 0001-test
config: {key: value, broken
---

# Content
## User Stories
### US-001: Test
**Acceptance Criteria**:
- [ ] **AC-US1-01**: Test
`;
      fs.writeFileSync(specPath, content);

      expect(() => parseSpecMd(specPath)).toThrow(/Malformed YAML frontmatter/);
    });
  });

  describe('Missing YAML Frontmatter', () => {
    it('should throw error when no frontmatter exists', () => {
      const content = `# Test Feature

## User Stories
### US-001: Test
**Acceptance Criteria**:
- [ ] **AC-US1-01**: Test
`;
      fs.writeFileSync(specPath, content);

      expect(() => parseSpecMd(specPath)).toThrow(/No YAML frontmatter found/);
      expect(() => parseSpecMd(specPath)).toThrow(/must start with/);
    });

    it('should throw error when frontmatter markers missing', () => {
      const content = `increment: 0001-test
title: Test

# Content
## User Stories
### US-001: Test
**Acceptance Criteria**:
- [ ] **AC-US1-01**: Test
`;
      fs.writeFileSync(specPath, content);

      expect(() => parseSpecMd(specPath)).toThrow(/No YAML frontmatter found/);
    });
  });

  describe('Missing Required Fields', () => {
    it('should throw error when increment field missing', () => {
      const content = `---
title: Feature Title
feature_id: FS-001
---

# Content
## User Stories
### US-001: Test
**Acceptance Criteria**:
- [ ] **AC-US1-01**: Test
`;
      fs.writeFileSync(specPath, content);

      expect(() => parseSpecMd(specPath)).toThrow(/Missing required field: increment/);
    });

    it('should throw error when frontmatter is not an object', () => {
      const content = `---
Just a plain string
---

# Content
## User Stories
### US-001: Test
**Acceptance Criteria**:
- [ ] **AC-US1-01**: Test
`;
      fs.writeFileSync(specPath, content);

      expect(() => parseSpecMd(specPath)).toThrow(/must be an object/);
    });
  });

  describe('Invalid Increment ID Format', () => {
    it('should throw error for missing leading zeros (1-test)', () => {
      const content = `---
increment: 1-test
---

# Content
## User Stories
### US-001: Test
**Acceptance Criteria**:
- [ ] **AC-US1-01**: Test
`;
      fs.writeFileSync(specPath, content);

      expect(() => parseSpecMd(specPath)).toThrow(/Invalid increment ID format/);
      expect(() => parseSpecMd(specPath)).toThrow(/missing leading zeros/i);
    });

    it('should throw error for underscore instead of hyphen (0001_test)', () => {
      const content = `---
increment: 0001_test
---

# Content
## User Stories
### US-001: Test
**Acceptance Criteria**:
- [ ] **AC-US1-01**: Test
`;
      fs.writeFileSync(specPath, content);

      expect(() => parseSpecMd(specPath)).toThrow(/Invalid increment ID format/);
    });

    it('should throw error for uppercase letters (0001-Test)', () => {
      const content = `---
increment: 0001-Test-Feature
---

# Content
## User Stories
### US-001: Test
**Acceptance Criteria**:
- [ ] **AC-US1-01**: Test
`;
      fs.writeFileSync(specPath, content);

      expect(() => parseSpecMd(specPath)).toThrow(/Invalid increment ID format/);
      expect(() => parseSpecMd(specPath)).toThrow(/uppercase/i);
    });

    it('should throw error for missing name part (0001)', () => {
      const content = `---
increment: 0001
---

# Content
## User Stories
### US-001: Test
**Acceptance Criteria**:
- [ ] **AC-US1-01**: Test
`;
      fs.writeFileSync(specPath, content);

      expect(() => parseSpecMd(specPath)).toThrow(/Invalid increment ID format/);
    });

    it('should throw error for 3-digit number (001-test)', () => {
      const content = `---
increment: 001-test
---

# Content
## User Stories
### US-001: Test
**Acceptance Criteria**:
- [ ] **AC-US1-01**: Test
`;
      fs.writeFileSync(specPath, content);

      expect(() => parseSpecMd(specPath)).toThrow(/Invalid increment ID format/);
    });

    it('should throw error for 5-digit number (00001-test)', () => {
      const content = `---
increment: 00001-test
---

# Content
## User Stories
### US-001: Test
**Acceptance Criteria**:
- [ ] **AC-US1-01**: Test
`;
      fs.writeFileSync(specPath, content);

      expect(() => parseSpecMd(specPath)).toThrow(/Invalid increment ID format/);
    });
  });

  describe('Error Message Quality', () => {
    it('should provide helpful suggestions for malformed YAML', () => {
      const content = `---
increment: 0001-test
data: [unclosed
---

# Content
## User Stories
### US-001: Test
**Acceptance Criteria**:
- [ ] **AC-US1-01**: Test
`;
      fs.writeFileSync(specPath, content);

      try {
        parseSpecMd(specPath);
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('Common mistakes');
        expect(error.message).toContain('Unclosed brackets');
        expect(error.message).toContain('Valid example');
        expect(error.message).toContain('CLAUDE.md Rule #16');
      }
    });

    it('should provide line numbers for YAML errors', () => {
      const content = `---
increment: 0001-test
this is broken yaml: [unclosed
---

# Content
## User Stories
### US-001: Test
**Acceptance Criteria**:
- [ ] **AC-US1-01**: Test
`;
      fs.writeFileSync(specPath, content);

      try {
        parseSpecMd(specPath);
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toMatch(/lines \d+-\d+/i);
      }
    });

    it('should provide valid examples for increment ID format errors', () => {
      const content = `---
increment: 1-test
---

# Content
## User Stories
### US-001: Test
**Acceptance Criteria**:
- [ ] **AC-US1-01**: Test
`;
      fs.writeFileSync(specPath, content);

      try {
        parseSpecMd(specPath);
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('Valid examples');
        expect(error.message).toContain('0001-feature-name');
        expect(error.message).toContain('Invalid examples');
        expect(error.message).toContain('CLAUDE.md Rule #16');
      }
    });
  });
});
