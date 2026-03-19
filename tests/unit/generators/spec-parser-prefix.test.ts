/**
 * Tests for prefixed story header parsing in spec-parser.ts (T-008 / T-009)
 *
 * Validates that spec-parser correctly extracts both prefixed (US-SPE-001)
 * and non-prefixed (US-001) story IDs from spec.md.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { parseSpecMd } from '../../../src/generators/spec/spec-parser.js';

describe('spec-parser prefixed story headers (T-008 / T-009)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-parser-prefix-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function writeSpec(content: string): string {
    const specPath = path.join(tempDir, 'spec.md');
    fs.writeFileSync(specPath, content, 'utf-8');
    return specPath;
  }

  // AC-US3-01: Parse US-SPE-001 format
  it('should parse prefixed story header US-SPE-001', () => {
    const specPath = writeSpec(`---
increment: 0001-test
title: "Test"
---

# Feature: Test

## User Stories

### US-SPE-001: Auto-Populate Project Field (P0)
**Project**: specweave

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Some criterion
`);

    const result = parseSpecMd(specPath);
    expect(result.userStories).toHaveLength(1);
    expect(result.userStories[0].id).toBe('US-SPE-001');
    expect(result.userStories[0].title).toBe('Auto-Populate Project Field (P0)');
  });

  // AC-US3-05: Parse old US-001 format (backward compat)
  it('should parse non-prefixed story header US-001', () => {
    const specPath = writeSpec(`---
increment: 0002-test
title: "Test"
---

# Feature: Test

## User Stories

### US-001: Old Format Story (P1)
**Project**: test

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Some criterion
`);

    const result = parseSpecMd(specPath);
    expect(result.userStories).toHaveLength(1);
    expect(result.userStories[0].id).toBe('US-001');
  });

  // Both formats in same file
  it('should parse mixed prefixed and non-prefixed story headers', () => {
    const specPath = writeSpec(`---
increment: 0003-test
title: "Test"
---

# Feature: Test

## User Stories

### US-SPE-001: Prefixed Story (P0)
**Project**: specweave

**Acceptance Criteria**:
- [ ] **AC-US1-01**: First criterion

---

### US-002: Legacy Story (P1)
**Project**: test

**Acceptance Criteria**:
- [ ] **AC-US2-01**: Second criterion
`);

    const result = parseSpecMd(specPath);
    expect(result.userStories).toHaveLength(2);
    expect(result.userStories[0].id).toBe('US-SPE-001');
    expect(result.userStories[1].id).toBe('US-002');
  });

  // Multi-prefix stories
  it('should parse multiple different prefixed stories', () => {
    const specPath = writeSpec(`---
increment: 0004-test
title: "Test"
---

# Feature: Test

## User Stories

### US-SPE-001: Specweave Story (P0)
**Project**: specweave

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Criterion

---

### US-VSK-002: VSkill Story (P1)
**Project**: vskill

**Acceptance Criteria**:
- [ ] **AC-US2-01**: Criterion
`);

    const result = parseSpecMd(specPath);
    expect(result.userStories).toHaveLength(2);
    expect(result.userStories[0].id).toBe('US-SPE-001');
    expect(result.userStories[1].id).toBe('US-VSK-002');
  });

  // External prefixed ID
  it('should parse prefixed external story header', () => {
    const specPath = writeSpec(`---
increment: 0005-test
title: "Test"
---

# Feature: Test

## User Stories

### US-SPE-001E: Imported Story (P1)
**Project**: specweave

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Criterion
`);

    const result = parseSpecMd(specPath);
    expect(result.userStories).toHaveLength(1);
    expect(result.userStories[0].id).toBe('US-SPE-001E');
  });
});
