/**
 * Unit tests for extractUserStories description extraction
 *
 * Tests that user story descriptions are correctly extracted from spec.md
 * across all supported formats: bold structured, plain 3-line, single-line
 * narrative, and free-form text.
 */

import { describe, it, expect } from 'vitest';
import { extractUserStories } from '../../../../src/core/living-docs/sync-helpers/parsers.js';

describe('extractUserStories — description extraction', () => {
  // Format 1: Bold structured (**As a** / **I want** / **So that**)
  it('should extract bold As a/I want/So that description', () => {
    const content = `
### US-001: Login Form
**As a** user
**I want** to see a login form
**So that** I can authenticate

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Form renders correctly
`;
    const stories = extractUserStories(content);
    expect(stories).toHaveLength(1);
    expect(stories[0].description).toContain('**As a** user');
    expect(stories[0].description).toContain('**I want** to see a login form');
    expect(stories[0].description).toContain('**So that** I can authenticate');
  });

  // Format 2: Plain 3-line (no bold)
  it('should extract plain As a/I want/So that description', () => {
    const content = `
### US-001: Login Form
As a user
I want to see a login form
So that I can authenticate

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Form renders correctly
`;
    const stories = extractUserStories(content);
    expect(stories).toHaveLength(1);
    expect(stories[0].description).toContain('As a user');
    expect(stories[0].description).toContain('I want to see a login form');
    expect(stories[0].description).toContain('So that I can authenticate');
  });

  // Format 3: Single-line narrative
  it('should extract single-line narrative description', () => {
    const content = `
### US-001: SKILL.md Verification
As the system, repos found by topic/keyword search must have their SKILL.md verified before being submitted, so that only genuine skills enter the pipeline.

**Acceptance Criteria**:
- [ ] **AC-US1-01**: SKILL.md verified
`;
    const stories = extractUserStories(content);
    expect(stories).toHaveLength(1);
    expect(stories[0].description).toContain('As the system, repos found by topic/keyword search');
  });

  // Format 4: Free-form text (no "As a" pattern)
  it('should extract free-form description text', () => {
    const content = `
### US-001: Batch Processing
This story covers implementing batch processing for incoming skill submissions.

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Batch works
`;
    const stories = extractUserStories(content);
    expect(stories).toHaveLength(1);
    expect(stories[0].description).toContain('This story covers implementing batch processing');
  });

  // Metadata exclusion
  it('should exclude Project/Board metadata from description', () => {
    const content = `
### US-001: Login Form
**Project**: frontend-app
**As a** user
**I want** to see a login form
**So that** I can authenticate

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Form renders
`;
    const stories = extractUserStories(content);
    expect(stories).toHaveLength(1);
    expect(stories[0].description).not.toContain('**Project**');
    expect(stories[0].description).toContain('**As a** user');
  });

  // Backward compat: no description
  it('should return empty description when no text before ACs', () => {
    const content = `
### US-001: Quick
**Acceptance Criteria**:
- [ ] **AC-US1-01**: Works
`;
    const stories = extractUserStories(content);
    expect(stories).toHaveLength(1);
    expect(stories[0].description).toBe('');
  });

  // Multiple user stories with different formats
  it('should extract descriptions for multiple user stories', () => {
    const content = `
### US-001: Story One
As a developer, I want feature A so that tests pass.

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Works

### US-002: Story Two
This is a free-form description for story two.

**Acceptance Criteria**:
- [ ] **AC-US2-01**: Also works
`;
    const stories = extractUserStories(content);
    expect(stories).toHaveLength(2);
    expect(stories[0].description).toContain('As a developer');
    expect(stories[1].description).toContain('free-form description');
  });

  // ACs still extracted correctly alongside description
  it('should extract ACs correctly when description is present', () => {
    const content = `
### US-001: Login
As the system, authentication must work end-to-end.

**Acceptance Criteria**:
- [x] **AC-US1-01**: Login works
- [ ] **AC-US1-02**: Error shown on failure
`;
    const stories = extractUserStories(content);
    expect(stories).toHaveLength(1);
    expect(stories[0].description).toContain('authentication must work');
    expect(stories[0].acceptanceCriteria).toEqual(['AC-US1-01', 'AC-US1-02']);
    expect(stories[0].acceptanceCriteriaFull).toHaveLength(2);
    expect(stories[0].acceptanceCriteriaFull![0].completed).toBe(true);
    expect(stories[0].acceptanceCriteriaFull![1].completed).toBe(false);
  });
});
