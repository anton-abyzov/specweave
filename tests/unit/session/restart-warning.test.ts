import { describe, it, expect } from 'vitest';

/**
 * Unit Tests: Restart Warning Formatter
 *
 * Tests the formatting of session restart warning messages
 * displayed when plugins are installed during a session.
 *
 * TDD Phase: RED - Tests written BEFORE implementation
 */

import {
  formatRestartWarning,
  type RestartWarningOptions,
  type RestartWarningOutput,
} from '../../../src/core/session/restart-warning.js';

describe('Restart Warning Formatter', () => {
  describe('formatRestartWarning()', () => {
    describe('Banner Display', () => {
      it('should contain "SESSION RESTART REQUIRED" banner', () => {
        // Given: Plugins were installed
        const options: RestartWarningOptions = {
          plugins: ['sw', 'frontend'],
          projectPath: '/path/to/project',
        };

        // When: formatRestartWarning() is called
        const result = formatRestartWarning(options);

        // Then: output should contain the banner
        expect(result.text).toContain('SESSION RESTART REQUIRED');
      });

      it('should include warning emoji or symbol', () => {
        // Given: Plugins were installed
        const options: RestartWarningOptions = {
          plugins: ['sw'],
          projectPath: '/path/to/project',
        };

        // When: formatRestartWarning() is called
        const result = formatRestartWarning(options);

        // Then: output should contain warning indicator
        expect(result.text).toMatch(/[⚠️⛔🔴]/);
      });

      it('should use visual separators for emphasis', () => {
        // Given: Plugins were installed
        const options: RestartWarningOptions = {
          plugins: ['sw'],
          projectPath: '/path/to/project',
        };

        // When: formatRestartWarning() is called
        const result = formatRestartWarning(options);

        // Then: output should have visual separators (borders/lines)
        expect(result.text).toMatch(/[═─━▓░]/);
      });
    });

    describe('Plugin List Display', () => {
      it('should list each installed plugin', () => {
        // Given: Multiple plugins installed
        const options: RestartWarningOptions = {
          plugins: ['sw', 'frontend', 'backend'],
          projectPath: '/path/to/project',
        };

        // When: formatRestartWarning() is called
        const result = formatRestartWarning(options);

        // Then: each plugin should be listed
        expect(result.text).toContain('sw');
        expect(result.text).toContain('frontend');
        expect(result.text).toContain('backend');
      });

      it('should include plugin descriptions when available', () => {
        // Given: Plugins with known descriptions
        const options: RestartWarningOptions = {
          plugins: ['sw', 'frontend'],
          projectPath: '/path/to/project',
          includeDescriptions: true,
        };

        // When: formatRestartWarning() is called
        const result = formatRestartWarning(options);

        // Then: descriptions should be included
        // sw = SpecWeave core, frontend = Frontend development
        expect(result.text).toMatch(/sw.*core|SpecWeave/i);
        expect(result.text).toMatch(/frontend/i);
      });

      it('should handle single plugin gracefully', () => {
        // Given: Single plugin installed
        const options: RestartWarningOptions = {
          plugins: ['sw'],
          projectPath: '/path/to/project',
        };

        // When: formatRestartWarning() is called
        const result = formatRestartWarning(options);

        // Then: should display properly without plural issues
        expect(result.text).toContain('sw');
        // Should say "plugin" not "plugins" for single
        expect(result.text).toMatch(/plugin\s+was|1\s+plugin/i);
      });

      it('should handle many plugins without truncation', () => {
        // Given: Many plugins installed
        const options: RestartWarningOptions = {
          plugins: ['sw', 'frontend', 'backend', 'sw-github', 'sw-jira'],
          projectPath: '/path/to/project',
        };

        // When: formatRestartWarning() is called
        const result = formatRestartWarning(options);

        // Then: all plugins should be listed
        expect(result.text).toContain('sw-github');
        expect(result.text).toContain('sw-jira');
      });
    });

    describe('Project Path Display', () => {
      it('should display the project path', () => {
        // Given: Project path provided
        const options: RestartWarningOptions = {
          plugins: ['sw'],
          projectPath: '/Users/developer/Projects/my-app',
        };

        // When: formatRestartWarning() is called
        const result = formatRestartWarning(options);

        // Then: path should be displayed
        expect(result.text).toContain('/Users/developer/Projects/my-app');
      });

      it('should handle paths with spaces', () => {
        // Given: Path with spaces
        const options: RestartWarningOptions = {
          plugins: ['sw'],
          projectPath: '/Users/developer/My Projects/my app',
        };

        // When: formatRestartWarning() is called
        const result = formatRestartWarning(options);

        // Then: path should be preserved with spaces
        expect(result.text).toContain('/Users/developer/My Projects/my app');
      });

      it('should label the path section clearly', () => {
        // Given: Project path
        const options: RestartWarningOptions = {
          plugins: ['sw'],
          projectPath: '/path/to/project',
        };

        // When: formatRestartWarning() is called
        const result = formatRestartWarning(options);

        // Then: should have a clear label
        expect(result.text).toMatch(/project|path|directory|location/i);
      });
    });

    describe('Restart Instructions', () => {
      it('should include restart instructions', () => {
        // Given: Warning options
        const options: RestartWarningOptions = {
          plugins: ['sw'],
          projectPath: '/path/to/project',
        };

        // When: formatRestartWarning() is called
        const result = formatRestartWarning(options);

        // Then: should include instructions on how to restart
        expect(result.text).toMatch(/restart|new session|exit|quit/i);
      });

      it('should explain why restart is needed', () => {
        // Given: Warning options
        const options: RestartWarningOptions = {
          plugins: ['sw'],
          projectPath: '/path/to/project',
        };

        // When: formatRestartWarning() is called
        const result = formatRestartWarning(options);

        // Then: should explain the reason
        expect(result.text).toMatch(/plugin.*load|won't be.*available|not.*active/i);
      });

      it('should provide actionable next steps', () => {
        // Given: Warning options
        const options: RestartWarningOptions = {
          plugins: ['sw'],
          projectPath: '/path/to/project',
        };

        // When: formatRestartWarning() is called
        const result = formatRestartWarning(options);

        // Then: should tell user exactly what to do
        expect(result.text).toMatch(/step|action|do|run|execute|type/i);
      });
    });

    describe('Output Structure', () => {
      it('should return structured output with text and metadata', () => {
        // Given: Warning options
        const options: RestartWarningOptions = {
          plugins: ['sw', 'frontend'],
          projectPath: '/path/to/project',
        };

        // When: formatRestartWarning() is called
        const result = formatRestartWarning(options);

        // Then: should return structured output
        expect(result).toHaveProperty('text');
        expect(result).toHaveProperty('plugins');
        expect(result).toHaveProperty('projectPath');
        expect(typeof result.text).toBe('string');
        expect(result.plugins).toEqual(['sw', 'frontend']);
        expect(result.projectPath).toBe('/path/to/project');
      });

      it('should include halt indicator for hook detection', () => {
        // Given: Warning options
        const options: RestartWarningOptions = {
          plugins: ['sw'],
          projectPath: '/path/to/project',
        };

        // When: formatRestartWarning() is called
        const result = formatRestartWarning(options);

        // Then: should include halt marker
        expect(result).toHaveProperty('shouldHalt');
        expect(result.shouldHalt).toBe(true);
      });
    });

    describe('Handoff Context Section', () => {
      it('should include handoff context when provided', () => {
        // Given: Options with original intent
        const options: RestartWarningOptions = {
          plugins: ['sw', 'frontend'],
          projectPath: '/path/to/project',
          originalIntent: 'Create a React dashboard with Stripe',
        };

        // When: formatRestartWarning() is called
        const result = formatRestartWarning(options);

        // Then: should include the original intent
        expect(result.text).toContain('React dashboard');
        expect(result.text).toContain('Stripe');
      });

      it('should suggest copy-paste continuation prompt', () => {
        // Given: Options with context
        const options: RestartWarningOptions = {
          plugins: ['sw', 'frontend'],
          projectPath: '/path/to/project',
          originalIntent: 'Build auth system',
        };

        // When: formatRestartWarning() is called
        const result = formatRestartWarning(options);

        // Then: should have copy-paste friendly continuation section
        expect(result.text).toMatch(/continue|resume|next session|copy.*paste/i);
      });

      it('should list available skills from installed plugins', () => {
        // Given: Plugins installed
        const options: RestartWarningOptions = {
          plugins: ['sw', 'frontend'],
          projectPath: '/path/to/project',
          includeSkillsList: true,
        };

        // When: formatRestartWarning() is called
        const result = formatRestartWarning(options);

        // Then: should mention available skills
        expect(result.text).toMatch(/skill|command|capability/i);
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty plugins array gracefully', () => {
        // Given: Empty plugins (shouldn't happen but be defensive)
        const options: RestartWarningOptions = {
          plugins: [],
          projectPath: '/path/to/project',
        };

        // When: formatRestartWarning() is called
        const result = formatRestartWarning(options);

        // Then: should still produce valid output
        expect(result.text).toBeDefined();
        expect(result.shouldHalt).toBe(false); // No plugins = no halt needed
      });

      it('should handle missing project path', () => {
        // Given: No project path
        const options: RestartWarningOptions = {
          plugins: ['sw'],
        };

        // When: formatRestartWarning() is called
        const result = formatRestartWarning(options);

        // Then: should produce output without path section
        expect(result.text).toContain('SESSION RESTART REQUIRED');
        expect(result.projectPath).toBeUndefined();
      });

      it('should handle unknown plugin names', () => {
        // Given: Unknown plugin
        const options: RestartWarningOptions = {
          plugins: ['sw-unknown-plugin'],
          projectPath: '/path/to/project',
          includeDescriptions: true,
        };

        // When: formatRestartWarning() is called
        const result = formatRestartWarning(options);

        // Then: should list plugin without crashing
        expect(result.text).toContain('sw-unknown-plugin');
      });

      it('should handle very long project paths', () => {
        // Given: Very long path
        const longPath =
          '/Users/developer/Documents/Projects/Company/Division/Team/SubTeam/ProductLine/FeatureArea/ComponentGroup/Module/SubModule/Implementation/Version1';
        const options: RestartWarningOptions = {
          plugins: ['sw'],
          projectPath: longPath,
        };

        // When: formatRestartWarning() is called
        const result = formatRestartWarning(options);

        // Then: should preserve full path without truncation
        expect(result.text).toContain(longPath);
        expect(result.projectPath).toBe(longPath);
      });

      it('should handle many plugins (10+)', () => {
        // Given: Many plugins
        const manyPlugins = [
          'sw',
          'frontend',
          'backend',
          'sw-github',
          'sw-jira',
          'sw-ado',
          'k8s',
          'infra',
          'testing',
          'mobile',
          'ml',
          'payments',
        ];
        const options: RestartWarningOptions = {
          plugins: manyPlugins,
          projectPath: '/path/to/project',
        };

        // When: formatRestartWarning() is called
        const result = formatRestartWarning(options);

        // Then: all plugins should be present
        manyPlugins.forEach((plugin) => {
          expect(result.text).toContain(plugin);
        });
        expect(result.plugins).toHaveLength(12);
      });

      it('should handle special characters in path', () => {
        // Given: Path with special characters
        const options: RestartWarningOptions = {
          plugins: ['sw'],
          projectPath: "/path/to/project-with-dashes_and_underscores (copy)/[v2.0]",
        };

        // When: formatRestartWarning() is called
        const result = formatRestartWarning(options);

        // Then: should preserve special characters
        expect(result.text).toContain('[v2.0]');
        expect(result.text).toContain('(copy)');
      });

      it('should handle unicode in original intent', () => {
        // Given: Unicode characters in intent
        const options: RestartWarningOptions = {
          plugins: ['sw'],
          projectPath: '/path/to/project',
          originalIntent: 'Create a dashboard with 日本語 support and émojis 🚀',
        };

        // When: formatRestartWarning() is called
        const result = formatRestartWarning(options);

        // Then: should preserve unicode
        expect(result.text).toContain('日本語');
        expect(result.text).toContain('🚀');
      });
    });
  });
});
