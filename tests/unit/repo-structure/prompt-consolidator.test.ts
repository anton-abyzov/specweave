import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit Tests for Prompt Consolidator
 *
 * Following BDD Given/When/Then format for test cases
 * Test Coverage Target: 85%
 */

import {
  getArchitecturePrompt,
  getVisibilityPrompt,
} from '../../../src/core/repo-structure/prompt-consolidator.js';

describe('getArchitecturePrompt', () => {
  it('should return question with 1 architecture option (github-parent only)', () => {
    // Given: No input
    // When: getArchitecturePrompt is called
    const result = getArchitecturePrompt();

    // Then: Returns question + 1 option (github-parent)
    expect(result.question).toBeDefined();
    expect(result.question).toContain('architecture');
    expect(result.options).toHaveLength(1);

    const values = result.options.map((c: any) => c.value);
    expect(values).toContain('github-parent');
  });

  it('should have complete option structure for each choice', () => {
    // Given: No input
    // When: getArchitecturePrompt is called
    const result = getArchitecturePrompt();

    // Then: Each option has value, label, description, example
    result.options.forEach((choice: any) => {
      expect(choice).toHaveProperty('value');
      expect(choice).toHaveProperty('label');
      expect(choice.label).toBeDefined();
      expect(choice.value).toBeDefined();
    });
  });
});

describe('getVisibilityPrompt', () => {
  it('should include repo name in question with private/public options', () => {
    // Given: repoName="my-project"
    const repoName = 'my-project';

    // When: getVisibilityPrompt is called
    const result = getVisibilityPrompt(repoName);

    // Then: Returns question with repo name + private/public options
    expect(result.question).toContain('my-project');
    expect(result.question).toContain('visibility');
    expect(result.options).toHaveLength(2);

    const values = result.options.map((c: any) => c.value);
    expect(values).toContain('private');
    expect(values).toContain('public');
  });

  it('should default to private visibility', () => {
    // Given: any repoName
    const repoName = 'test-repo';

    // When: getVisibilityPrompt is called
    const result = getVisibilityPrompt(repoName);

    // Then: Default is 'private'
    expect(result.default).toBe('private');
  });
});

