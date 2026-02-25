import { describe, it, expect } from 'vitest';

/**
 * Unit Tests: Handoff Context Generator
 *
 * Tests the generation of context information for session handoff,
 * enabling users to continue their work in a new session after
 * plugin installation.
 *
 * TDD Phase: RED - Tests written BEFORE implementation
 */

import {
  generateHandoffContext,
  formatHandoffText,
  type HandoffContextOptions,
  type HandoffContext,
} from '../../../src/core/session/handoff-context.js';

describe('Handoff Context Generator', () => {
  describe('generateHandoffContext()', () => {
    describe('Basic Context Generation', () => {
      it('should include summary of session accomplishments', () => {
        // Given: Session state with installed plugins
        const options: HandoffContextOptions = {
          plugins: ['sw', 'frontend'],
          projectPath: '/path/to/project',
          originalIntent: 'Create a React dashboard',
        };

        // When: generateHandoffContext() is called
        const context = generateHandoffContext(options);

        // Then: context should include summary
        expect(context).toHaveProperty('summary');
        expect(context.summary).toBeDefined();
        expect(context.summary.length).toBeGreaterThan(0);
      });

      it('should include the original intent', () => {
        // Given: Session state with original intent
        const options: HandoffContextOptions = {
          plugins: ['sw'],
          projectPath: '/path/to/project',
          originalIntent: 'Build a payment integration with Stripe',
        };

        // When: generateHandoffContext() is called
        const context = generateHandoffContext(options);

        // Then: context should preserve original intent
        expect(context.originalIntent).toBe(
          'Build a payment integration with Stripe'
        );
      });

      it('should list all installed plugins', () => {
        // Given: Multiple plugins installed
        const options: HandoffContextOptions = {
          plugins: ['sw', 'frontend', 'payments'],
          projectPath: '/path/to/project',
        };

        // When: generateHandoffContext() is called
        const context = generateHandoffContext(options);

        // Then: all plugins should be listed
        expect(context.plugins).toEqual(['sw', 'frontend', 'payments']);
      });
    });

    describe('Project Path Handling', () => {
      it('should include normalized project path', () => {
        // Given: Session state with project path
        const options: HandoffContextOptions = {
          plugins: ['sw'],
          projectPath: '/Users/dev/Projects/my-app',
        };

        // When: generateHandoffContext() is called
        const context = generateHandoffContext(options);

        // Then: context should include the path
        expect(context.projectPath).toBe('/Users/dev/Projects/my-app');
      });

      it('should normalize home directory in path', () => {
        // Given: Path with home directory
        const options: HandoffContextOptions = {
          plugins: ['sw'],
          projectPath: '/Users/developer/Projects/app',
          userHome: '/Users/developer',
        };

        // When: generateHandoffContext() is called
        const context = generateHandoffContext(options);

        // Then: should use ~ for home directory
        expect(context.normalizedPath).toBe('~/Projects/app');
      });

      it('should handle missing project path', () => {
        // Given: No project path
        const options: HandoffContextOptions = {
          plugins: ['sw'],
        };

        // When: generateHandoffContext() is called
        const context = generateHandoffContext(options);

        // Then: should handle gracefully
        expect(context.projectPath).toBeUndefined();
        expect(context.normalizedPath).toBeUndefined();
      });
    });

    describe('Skills Listing', () => {
      it('should list available skills for installed plugins', () => {
        // Given: Plugins with known skills
        const options: HandoffContextOptions = {
          plugins: ['sw', 'frontend'],
          projectPath: '/path/to/project',
        };

        // When: generateHandoffContext() is called
        const context = generateHandoffContext(options);

        // Then: should list skills
        expect(context.availableSkills).toBeDefined();
        expect(context.availableSkills.length).toBeGreaterThan(0);
      });

      it('should map sw plugin to core workflow skills', () => {
        // Given: Core plugin installed
        const options: HandoffContextOptions = {
          plugins: ['sw'],
          projectPath: '/path/to/project',
        };

        // When: generateHandoffContext() is called
        const context = generateHandoffContext(options);

        // Then: should include core skills
        const skillNames = context.availableSkills.map((s) => s.name);
        expect(skillNames).toContain('/sw:increment');
        expect(skillNames).toContain('/sw:do');
        expect(skillNames).toContain('/sw:done');
      });

      it('should map frontend to frontend skills', () => {
        // Given: Frontend plugin installed
        const options: HandoffContextOptions = {
          plugins: ['frontend'],
          projectPath: '/path/to/project',
        };

        // When: generateHandoffContext() is called
        const context = generateHandoffContext(options);

        // Then: should include frontend expertise
        expect(
          context.availableSkills.some(
            (s) => s.category === 'frontend' || s.name.includes('frontend')
          )
        ).toBe(true);
      });

      it('should include skill descriptions', () => {
        // Given: Plugin with skills
        const options: HandoffContextOptions = {
          plugins: ['sw'],
          projectPath: '/path/to/project',
        };

        // When: generateHandoffContext() is called
        const context = generateHandoffContext(options);

        // Then: skills should have descriptions
        context.availableSkills.forEach((skill) => {
          expect(skill.description).toBeDefined();
          expect(skill.description.length).toBeGreaterThan(0);
        });
      });
    });

    describe('Continuation Prompt', () => {
      it('should generate suggested continuation prompt', () => {
        // Given: Complete session state
        const options: HandoffContextOptions = {
          plugins: ['sw', 'frontend'],
          projectPath: '/path/to/project',
          originalIntent: 'Create React dashboard',
        };

        // When: generateHandoffContext() is called
        const context = generateHandoffContext(options);

        // Then: should have continuation prompt
        expect(context.continuationPrompt).toBeDefined();
        expect(context.continuationPrompt.length).toBeGreaterThan(0);
      });

      it('should include original intent in continuation prompt', () => {
        // Given: Session with intent
        const options: HandoffContextOptions = {
          plugins: ['sw'],
          projectPath: '/path/to/project',
          originalIntent: 'Build authentication system',
        };

        // When: generateHandoffContext() is called
        const context = generateHandoffContext(options);

        // Then: continuation prompt should reference intent
        expect(context.continuationPrompt).toContain('authentication');
      });
    });
  });

  describe('formatHandoffText()', () => {
    describe('Text Formatting', () => {
      it('should format context as copy-paste ready text', () => {
        // Given: Complete session state
        const options: HandoffContextOptions = {
          plugins: ['sw', 'frontend'],
          projectPath: '/path/to/project',
          originalIntent: 'Create React dashboard',
        };

        // When: formatHandoffText() is called
        const text = formatHandoffText(options);

        // Then: should be formatted text
        expect(typeof text).toBe('string');
        expect(text.length).toBeGreaterThan(0);
      });

      it('should include project path in formatted text', () => {
        // Given: Options with path
        const options: HandoffContextOptions = {
          plugins: ['sw'],
          projectPath: '/Users/dev/my-project',
        };

        // When: formatHandoffText() is called
        const text = formatHandoffText(options);

        // Then: path should appear in text
        expect(text).toContain('/Users/dev/my-project');
      });

      it('should include all plugins in formatted text', () => {
        // Given: Multiple plugins
        const options: HandoffContextOptions = {
          plugins: ['sw', 'frontend', 'backend'],
          projectPath: '/path/to/project',
        };

        // When: formatHandoffText() is called
        const text = formatHandoffText(options);

        // Then: all plugins should appear
        expect(text).toContain('sw');
        expect(text).toContain('frontend');
        expect(text).toContain('backend');
      });

      it('should include continuation instructions', () => {
        // Given: Options
        const options: HandoffContextOptions = {
          plugins: ['sw'],
          projectPath: '/path/to/project',
          originalIntent: 'Build feature',
        };

        // When: formatHandoffText() is called
        const text = formatHandoffText(options);

        // Then: should have instructions
        expect(text).toMatch(/continue|resume|proceed/i);
      });

      it('should have clear section headers', () => {
        // Given: Complete options
        const options: HandoffContextOptions = {
          plugins: ['sw', 'frontend'],
          projectPath: '/path/to/project',
          originalIntent: 'Create dashboard',
        };

        // When: formatHandoffText() is called
        const text = formatHandoffText(options);

        // Then: should have clear sections
        expect(text).toMatch(/project|path/i);
        expect(text).toMatch(/plugin/i);
        expect(text).toMatch(/intent|task|goal/i);
      });
    });

    describe('Copy-Paste Readiness', () => {
      it('should format text without markdown that breaks in terminals', () => {
        // Given: Options
        const options: HandoffContextOptions = {
          plugins: ['sw'],
          projectPath: '/path/to/project',
        };

        // When: formatHandoffText() is called
        const text = formatHandoffText(options);

        // Then: should not have problematic markdown
        // No triple backticks that might break copy-paste
        expect(text).not.toMatch(/```/);
      });

      it('should include ready-to-use command if applicable', () => {
        // Given: Options with path
        const options: HandoffContextOptions = {
          plugins: ['sw'],
          projectPath: '/path/to/project',
        };

        // When: formatHandoffText() is called
        const text = formatHandoffText(options);

        // Then: should include cd command or similar
        expect(text).toMatch(/cd |navigate|open/i);
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty plugins array', () => {
        // Given: No plugins
        const options: HandoffContextOptions = {
          plugins: [],
          projectPath: '/path/to/project',
        };

        // When: formatHandoffText() is called
        const text = formatHandoffText(options);

        // Then: should produce valid output
        expect(text).toBeDefined();
        expect(typeof text).toBe('string');
      });

      it('should handle minimal options', () => {
        // Given: Minimal options
        const options: HandoffContextOptions = {
          plugins: ['sw'],
        };

        // When: formatHandoffText() is called
        const text = formatHandoffText(options);

        // Then: should produce valid output
        expect(text).toBeDefined();
        expect(text).toContain('sw');
      });

      it('should handle special characters in original intent', () => {
        // Given: Intent with special chars
        const options: HandoffContextOptions = {
          plugins: ['sw'],
          projectPath: '/path/to/project',
          originalIntent: "Build feature with <special> & \"quotes\"",
        };

        // When: formatHandoffText() is called
        const text = formatHandoffText(options);

        // Then: should preserve special characters
        expect(text).toContain('<special>');
        expect(text).toContain('"quotes"');
      });
    });
  });
});
