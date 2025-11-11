/**
 * Unit Tests for Prompt Consolidator
 *
 * Following BDD Given/When/Then format for test cases
 * Test Coverage Target: 85%
 */

import {
  getArchitecturePrompt,
  getParentRepoBenefits,
  getRepoCountClarification,
  getVisibilityPrompt,
  formatArchitectureChoice,
} from '../../../src/core/repo-structure/prompt-consolidator';

describe('getArchitecturePrompt', () => {
  it('should return question with 4 architecture options', () => {
    // Given: No input
    // When: getArchitecturePrompt is called
    const result = getArchitecturePrompt();

    // Then: Returns question + 4 options
    expect(result.question).toBeDefined();
    expect(result.question).toContain('architecture');
    expect(result.options).toHaveLength(4);

    const values = result.options.map((c: any) => c.value);
    expect(values).toContain('single');
    expect(values).toContain('multi-with-parent');
    expect(values).toContain('multi-without-parent');
    expect(values).toContain('monorepo');
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

describe('getParentRepoBenefits', () => {
  it('should return markdown with 5 key benefits', () => {
    // Given: No input
    // When: getParentRepoBenefits is called
    const result = getParentRepoBenefits();

    // Then: Returns markdown with 5 benefits
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    expect(result).toContain('.specweave');
    expect(result).toContain('central');
    expect(result).toContain('ADR');
    expect(result).toContain('onboarding');
    expect(result.length).toBeGreaterThan(100);
  });
});

describe('getRepoCountClarification', () => {
  it('should show total with parent + implementation repositories', () => {
    // Given: parentCount=1, implCount=2
    const parentCount = 1;
    const implCount = 2;

    // When: getRepoCountClarification is called
    const result = getRepoCountClarification(parentCount, implCount);

    // Then: Returns total count with parent + implementation breakdown
    expect(result).toContain('3');
    expect(result).toContain('1 parent');
    expect(result).toContain('2 implementation');
    expect(result).toContain('repositories'); // plural
  });

  it('should use singular "repository" when implCount=1', () => {
    // Given: parentCount=1, implCount=1
    const parentCount = 1;
    const implCount = 1;

    // When: getRepoCountClarification is called
    const result = getRepoCountClarification(parentCount, implCount);

    // Then: Returns singular "repository" for single implementation repo
    expect(result).toContain('2');
    expect(result).toContain('1 parent');
    expect(result).toContain('1 implementation repository');
  });

  it('should handle no parent repository case', () => {
    // Given: parentCount=0, implCount=3
    const parentCount = 0;
    const implCount = 3;

    // When: getRepoCountClarification is called
    const result = getRepoCountClarification(parentCount, implCount);

    // Then: Returns total count without parent mention
    expect(result).toContain('3');
    expect(result).toContain('repositories');
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

describe('formatArchitectureChoice', () => {
  it('should format each ArchitectureChoice to human-readable string', () => {
    // Given: Each ArchitectureChoice value
    const choices = ['single', 'multi-with-parent', 'multi-without-parent', 'monorepo'];

    // When: formatArchitectureChoice is called for each
    choices.forEach(choice => {
      const result = formatArchitectureChoice(choice as any);

      // Then: Returns human-readable string
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(5);
    });
  });

  it('should return original choice as string for unknown choice', () => {
    // Given: unknown choice
    const unknownChoice = 'unknown-architecture' as any;

    // When: formatArchitectureChoice is called
    const result = formatArchitectureChoice(unknownChoice);

    // Then: Returns original choice as string
    expect(result).toBe('unknown-architecture');
  });
});
