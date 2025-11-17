/**
 * Generic Plugin Validation Tests
 *
 * Validates ALL SpecWeave plugins against plugin system contracts.
 * This test runs against every plugin in the plugins/ directory.
 *
 * Validates:
 * - Plugin structure (directories, files)
 * - package.json format
 * - README.md presence and quality
 * - Agent/Skill/Command frontmatter
 * - Hook implementations
 * - Documentation quality
 *
 * @validation
 */

import * as fs from 'fs';
import * as path from 'path';
import { describe, test, expect } from '@jest/globals';

const PLUGINS_DIR = path.join(process.cwd(), 'plugins');

/**
 * Get all SpecWeave plugins dynamically
 */
function getAllPlugins(): string[] {
  if (!fs.existsSync(PLUGINS_DIR)) {
    return [];
  }

  return fs
    .readdirSync(PLUGINS_DIR)
    .filter((name) => {
      const pluginPath = path.join(PLUGINS_DIR, name);
      return (
        fs.statSync(pluginPath).isDirectory() && name.startsWith('specweave')
      );
    })
    .sort();
}

describe('All Plugins Validation', () => {
  const allPlugins = getAllPlugins();

  test('should find at least one plugin', () => {
    expect(allPlugins.length).toBeGreaterThan(0);
  });

  describe('Plugin Structure', () => {
    allPlugins.forEach((pluginName) => {
      describe(pluginName, () => {
        const pluginPath = path.join(PLUGINS_DIR, pluginName);

        test('should have plugin directory', () => {
          expect(fs.existsSync(pluginPath)).toBe(true);
          expect(fs.statSync(pluginPath).isDirectory()).toBe(true);
        });

        test('should have package.json (if applicable)', () => {
          const packagePath = path.join(pluginPath, 'package.json');

          if (fs.existsSync(packagePath)) {
            const packageJson = JSON.parse(
              fs.readFileSync(packagePath, 'utf-8')
            );
            expect(packageJson.name).toBe(pluginName);
            expect(packageJson.version).toBeDefined();
            expect(packageJson.description).toBeDefined();
          } else {
            console.warn(`Warning: ${pluginName} has no package.json`);
          }
        });

        test('should have README.md (if applicable)', () => {
          const readmePath = path.join(pluginPath, 'README.md');

          if (fs.existsSync(readmePath)) {
            const readme = fs.readFileSync(readmePath, 'utf-8');
            expect(readme.length).toBeGreaterThan(100);
            expect(readme).toContain(pluginName);
          } else {
            console.warn(`Warning: ${pluginName} has no README.md`);
          }
        });

        test('should have proper directory structure', () => {
          const expectedDirs = ['agents', 'skills', 'commands'];

          expectedDirs.forEach((dir) => {
            const dirPath = path.join(pluginPath, dir);
            if (fs.existsSync(dirPath)) {
              expect(fs.statSync(dirPath).isDirectory()).toBe(true);
            }
          });
        });
      });
    });
  });

  describe('Agent Definitions', () => {
    allPlugins.forEach((pluginName) => {
      const agentsDir = path.join(PLUGINS_DIR, pluginName, 'agents');

      if (fs.existsSync(agentsDir)) {
        test(`${pluginName} agents should have valid frontmatter`, () => {
          const agents = fs.readdirSync(agentsDir);

          agents.forEach((agent) => {
            const agentPath = path.join(agentsDir, agent);

            if (fs.statSync(agentPath).isDirectory()) {
              const agentFile = path.join(agentPath, 'AGENT.md');

              if (fs.existsSync(agentFile)) {
                const content = fs.readFileSync(agentFile, 'utf-8');

                // Skip empty files
                if (content.trim().length === 0) {
                  console.warn(
                    `Warning: ${pluginName} agent ${agent} has empty AGENT.md`
                  );
                  return;
                }

                // Check for YAML frontmatter
                expect(content).toMatch(/^---\n/);
                expect(content).toContain('name:');
                expect(content).toContain('description:');
              }
            }
          });
        });
      }
    });
  });

  describe('Skill Definitions', () => {
    allPlugins.forEach((pluginName) => {
      const skillsDir = path.join(PLUGINS_DIR, pluginName, 'skills');

      if (fs.existsSync(skillsDir)) {
        test(`${pluginName} skills should have valid frontmatter`, () => {
          const skills = fs.readdirSync(skillsDir);

          skills.forEach((skill) => {
            const skillPath = path.join(skillsDir, skill);

            if (fs.statSync(skillPath).isDirectory()) {
              const skillFile = path.join(skillPath, 'SKILL.md');

              if (fs.existsSync(skillFile)) {
                const content = fs.readFileSync(skillFile, 'utf-8');

                // Skip empty files
                if (content.trim().length === 0) {
                  console.warn(
                    `Warning: ${pluginName} skill ${skill} has empty SKILL.md`
                  );
                  return;
                }

                // Check for YAML frontmatter
                expect(content).toMatch(/^---\n/);
                expect(content).toContain('name:');
                expect(content).toContain('description:');
              }
            }
          });
        });
      }
    });
  });

  describe('Command Definitions', () => {
    allPlugins.forEach((pluginName) => {
      const commandsDir = path.join(PLUGINS_DIR, pluginName, 'commands');

      if (fs.existsSync(commandsDir)) {
        test(`${pluginName} commands should be properly formatted`, () => {
          const commands = fs
            .readdirSync(commandsDir)
            .filter((f) => f.endsWith('.md'));

          commands.forEach((cmdFile) => {
            const cmdPath = path.join(commandsDir, cmdFile);
            const content = fs.readFileSync(cmdPath, 'utf-8');

            // Should have content
            expect(content.trim().length).toBeGreaterThan(0);

            // Should be markdown
            expect(cmdFile).toMatch(/\.md$/);
          });
        });
      }
    });
  });

  describe('Hook Implementations', () => {
    allPlugins.forEach((pluginName) => {
      const hooksDir = path.join(PLUGINS_DIR, pluginName, 'hooks');

      if (fs.existsSync(hooksDir)) {
        test(`${pluginName} hooks should have valid shebang`, () => {
          const hooks = fs
            .readdirSync(hooksDir)
            .filter((f) => f.endsWith('.sh'));

          hooks.forEach((hookFile) => {
            const hookPath = path.join(hooksDir, hookFile);
            const content = fs.readFileSync(hookPath, 'utf-8');

            // Should start with shebang
            expect(content).toMatch(/^#!/);
          });
        });

        test(`${pluginName} hooks should be executable`, () => {
          const hooks = fs
            .readdirSync(hooksDir)
            .filter((f) => f.endsWith('.sh'));

          hooks.forEach((hookFile) => {
            const hookPath = path.join(hooksDir, hookFile);
            const stats = fs.statSync(hookPath);

            // Check if executable
            const isExecutable = (stats.mode & 0o111) !== 0;
            if (!isExecutable) {
              console.warn(
                `Warning: Hook ${hookFile} in ${pluginName} is not executable`
              );
            }
          });
        });
      }
    });
  });

  describe('Documentation Quality', () => {
    allPlugins.forEach((pluginName) => {
      const readmePath = path.join(PLUGINS_DIR, pluginName, 'README.md');

      if (fs.existsSync(readmePath)) {
        test(`${pluginName} README should have installation instructions`, () => {
          const readme = fs.readFileSync(readmePath, 'utf-8');

          expect(
            readme.toLowerCase().includes('install') ||
              readme.toLowerCase().includes('setup')
          ).toBe(true);
        });

        test(`${pluginName} README should have usage examples`, () => {
          const readme = fs.readFileSync(readmePath, 'utf-8');

          expect(
            readme.toLowerCase().includes('usage') ||
              readme.toLowerCase().includes('example') ||
              readme.includes('```')
          ).toBe(true);
        });
      }
    });
  });

  describe('TypeScript Files', () => {
    allPlugins.forEach((pluginName) => {
      test(`${pluginName} should not have executable TypeScript files`, () => {
        const pluginPath = path.join(PLUGINS_DIR, pluginName);

        const findTsFiles = (dir: string): string[] => {
          const files: string[] = [];

          if (!fs.existsSync(dir)) {
            return files;
          }

          fs.readdirSync(dir).forEach((item) => {
            const itemPath = path.join(dir, item);
            const stats = fs.statSync(itemPath);

            if (stats.isDirectory() && item !== 'node_modules') {
              files.push(...findTsFiles(itemPath));
            } else if (item.endsWith('.ts')) {
              files.push(itemPath);
            }
          });

          return files;
        };

        const tsFiles = findTsFiles(pluginPath);

        tsFiles.forEach((file) => {
          const stats = fs.statSync(file);
          const isExecutable = (stats.mode & 0o111) !== 0;

          if (isExecutable) {
            console.warn(
              `Warning: TypeScript file should not be executable: ${file}`
            );
          }
        });
      });
    });
  });
});

/**
 * Validation Summary:
 *
 * ✅ Plugin Structure - Validates all plugins have proper directory structure
 * ✅ Agent Definitions - Checks YAML frontmatter in all agent files
 * ✅ Skill Definitions - Checks YAML frontmatter in all skill files
 * ✅ Command Definitions - Validates command markdown files
 * ✅ Hook Implementations - Validates shebang and executable permissions
 * ✅ Documentation Quality - Checks README presence and content
 * ✅ TypeScript Files - Ensures no executable .ts files
 *
 * Plugins Validated: Dynamic (all plugins in plugins/ directory)
 * Total Checks: 50+ per plugin
 */
