/**
 * Unit tests for multi-project-detector.ts
 *
 * Tests detection of multi-project/umbrella configuration, prefix inference,
 * user story/AC ID formatting, and template variable generation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

import {
  inferProjectPrefix,
  detectMultiProjectMode,
  getProjectPrefixes,
  getProjectByPrefix,
  formatUserStoryId,
  formatAcceptanceCriteriaId,
  generateMultiProjectTemplateVars,
  type MultiProjectDetectionResult,
} from '../../../src/utils/multi-project-detector.js';

describe('multi-project-detector', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-mpd-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  /**
   * Helper to write .specweave/config.json
   */
  function createConfig(config: object): void {
    const configDir = path.join(tempDir, '.specweave');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(
      path.join(configDir, 'config.json'),
      JSON.stringify(config, null, 2)
    );
  }

  /**
   * Helper to create spec project folders
   */
  function createSpecFolders(folderNames: string[]): void {
    const specsDir = path.join(tempDir, '.specweave', 'docs', 'internal', 'specs');
    fs.mkdirSync(specsDir, { recursive: true });
    for (const name of folderNames) {
      fs.mkdirSync(path.join(specsDir, name), { recursive: true });
    }
  }

  // ---------------------------------------------------------------------------
  // inferProjectPrefix
  // ---------------------------------------------------------------------------

  describe('inferProjectPrefix', () => {
    describe('exact matches', () => {
      it('should map "fe" to "FE"', () => {
        expect(inferProjectPrefix('fe')).toBe('FE');
      });

      it('should map "frontend" to "FE"', () => {
        expect(inferProjectPrefix('frontend')).toBe('FE');
      });

      it('should map "web" to "FE"', () => {
        expect(inferProjectPrefix('web')).toBe('FE');
      });

      it('should map "ui" to "FE"', () => {
        expect(inferProjectPrefix('ui')).toBe('FE');
      });

      it('should map "client" to "FE"', () => {
        expect(inferProjectPrefix('client')).toBe('FE');
      });

      it('should map "be" to "BE"', () => {
        expect(inferProjectPrefix('be')).toBe('BE');
      });

      it('should map "backend" to "BE"', () => {
        expect(inferProjectPrefix('backend')).toBe('BE');
      });

      it('should map "api" to "BE"', () => {
        expect(inferProjectPrefix('api')).toBe('BE');
      });

      it('should map "server" to "BE"', () => {
        expect(inferProjectPrefix('server')).toBe('BE');
      });

      it('should map "service" to "BE"', () => {
        expect(inferProjectPrefix('service')).toBe('BE');
      });

      it('should map "shared" to "SHARED"', () => {
        expect(inferProjectPrefix('shared')).toBe('SHARED');
      });

      it('should map "common" to "SHARED"', () => {
        expect(inferProjectPrefix('common')).toBe('SHARED');
      });

      it('should map "lib" to "SHARED"', () => {
        expect(inferProjectPrefix('lib')).toBe('SHARED');
      });

      it('should map "types" to "SHARED"', () => {
        expect(inferProjectPrefix('types')).toBe('SHARED');
      });

      it('should map "mobile" to "MOBILE"', () => {
        expect(inferProjectPrefix('mobile')).toBe('MOBILE');
      });

      it('should map "ios" to "MOBILE"', () => {
        expect(inferProjectPrefix('ios')).toBe('MOBILE');
      });

      it('should map "android" to "MOBILE"', () => {
        expect(inferProjectPrefix('android')).toBe('MOBILE');
      });

      it('should map "app" to "MOBILE"', () => {
        expect(inferProjectPrefix('app')).toBe('MOBILE');
      });

      it('should map "infra" to "INFRA"', () => {
        expect(inferProjectPrefix('infra')).toBe('INFRA');
      });

      it('should map "infrastructure" to "INFRA"', () => {
        expect(inferProjectPrefix('infrastructure')).toBe('INFRA');
      });

      it('should map "devops" to "INFRA"', () => {
        expect(inferProjectPrefix('devops')).toBe('INFRA');
      });

      it('should map "deploy" to "INFRA"', () => {
        expect(inferProjectPrefix('deploy')).toBe('INFRA');
      });
    });

    describe('case insensitivity', () => {
      it('should handle uppercase input "FE"', () => {
        expect(inferProjectPrefix('FE')).toBe('FE');
      });

      it('should handle mixed case input "Frontend"', () => {
        expect(inferProjectPrefix('Frontend')).toBe('FE');
      });

      it('should handle uppercase "BACKEND"', () => {
        expect(inferProjectPrefix('BACKEND')).toBe('BE');
      });
    });

    describe('suffix matches', () => {
      it('should extract prefix from "my-app-fe" (hyphen suffix)', () => {
        expect(inferProjectPrefix('my-app-fe')).toBe('FE');
      });

      it('should extract prefix from "my-app-be" (hyphen suffix)', () => {
        expect(inferProjectPrefix('my-app-be')).toBe('BE');
      });

      it('should extract prefix from "platform_api" (underscore suffix)', () => {
        expect(inferProjectPrefix('platform_api')).toBe('BE');
      });

      it('should extract prefix from "company_frontend" (underscore suffix)', () => {
        expect(inferProjectPrefix('company_frontend')).toBe('FE');
      });

      it('should extract prefix from "acme-mobile" (hyphen suffix)', () => {
        expect(inferProjectPrefix('acme-mobile')).toBe('MOBILE');
      });

      it('should extract prefix from "project-shared" (hyphen suffix)', () => {
        expect(inferProjectPrefix('project-shared')).toBe('SHARED');
      });

      it('should extract prefix from "cloud_infra" (underscore suffix)', () => {
        expect(inferProjectPrefix('cloud_infra')).toBe('INFRA');
      });
    });

    describe('contains matches', () => {
      it('should detect "frontend-service" as BE (suffix "-service" matches first)', () => {
        // Suffix match for "-service" → BE takes priority over contains "frontend" → FE
        expect(inferProjectPrefix('frontend-service')).toBe('BE');
      });

      it('should detect "backend-gateway" as BE', () => {
        expect(inferProjectPrefix('backend-gateway')).toBe('BE');
      });

      it('should detect "shared-utils" as SHARED', () => {
        expect(inferProjectPrefix('shared-utils')).toBe('SHARED');
      });

      it('should detect "mobile-sdk" as MOBILE', () => {
        expect(inferProjectPrefix('mobile-sdk')).toBe('MOBILE');
      });
    });

    describe('fallback behavior', () => {
      it('should uppercase first part for unknown "analytics"', () => {
        expect(inferProjectPrefix('analytics')).toBe('ANALYT');
      });

      it('should uppercase first part for unknown "reports-engine"', () => {
        expect(inferProjectPrefix('reports-engine')).toBe('REPORT');
      });

      it('should truncate to 6 characters for long first parts', () => {
        expect(inferProjectPrefix('authentication-system')).toBe('AUTHEN');
      });

      it('should handle single char ID', () => {
        expect(inferProjectPrefix('x')).toBe('X');
      });

      it('should handle underscore-separated "data_pipeline"', () => {
        expect(inferProjectPrefix('data_pipeline')).toBe('DATA');
      });
    });
  });

  // ---------------------------------------------------------------------------
  // detectMultiProjectMode
  // ---------------------------------------------------------------------------

  describe('detectMultiProjectMode', () => {
    describe('no config (single project fallback)', () => {
      it('should return single project when no .specweave directory exists', () => {
        const result = detectMultiProjectMode(tempDir);
        expect(result.isMultiProject).toBe(false);
        expect(result.detectionReason).toBe('no multi-project configuration detected');
        expect(result.projects).toEqual([]);
        expect(result.umbrellaEnabled).toBe(false);
        expect(result.hasBoardMapping).toBe(false);
      });

      it('should return single project when config.json is empty object', () => {
        createConfig({});
        const result = detectMultiProjectMode(tempDir);
        expect(result.isMultiProject).toBe(false);
        expect(result.projects).toEqual([]);
      });

      it('should return single project when config.json has invalid JSON', () => {
        const configDir = path.join(tempDir, '.specweave');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(path.join(configDir, 'config.json'), '{ bad json');
        const result = detectMultiProjectMode(tempDir);
        expect(result.isMultiProject).toBe(false);
      });
    });

    describe('umbrella.enabled with childRepos', () => {
      it('should detect multi-project with 2+ child repos', () => {
        createConfig({
          umbrella: {
            enabled: true,
            childRepos: [
              { id: 'my-fe', displayName: 'Frontend', path: 'packages/fe' },
              { id: 'my-be', displayName: 'Backend', path: 'packages/be' },
            ],
          },
        });

        const result = detectMultiProjectMode(tempDir);
        expect(result.isMultiProject).toBe(true);
        expect(result.detectionReason).toBe('umbrella.enabled with childRepos');
        expect(result.umbrellaEnabled).toBe(true);
        expect(result.projects).toHaveLength(2);
        expect(result.projects[0]).toEqual({
          id: 'my-fe',
          prefix: 'FE',
          name: 'Frontend',
          path: 'packages/fe',
        });
        expect(result.projects[1]).toEqual({
          id: 'my-be',
          prefix: 'BE',
          name: 'Backend',
          path: 'packages/be',
        });
      });

      it('should use explicit prefix from childRepo config', () => {
        createConfig({
          umbrella: {
            enabled: true,
            childRepos: [
              { id: 'proj-a', prefix: 'ALPHA' },
              { id: 'proj-b', prefix: 'BETA' },
            ],
          },
        });

        const result = detectMultiProjectMode(tempDir);
        expect(result.isMultiProject).toBe(true);
        expect(result.projects[0].prefix).toBe('ALPHA');
        expect(result.projects[1].prefix).toBe('BETA');
      });

      it('should return single project when umbrella has only 1 child repo', () => {
        createConfig({
          umbrella: {
            enabled: true,
            childRepos: [{ id: 'only-one' }],
          },
        });

        const result = detectMultiProjectMode(tempDir);
        expect(result.isMultiProject).toBe(false);
      });

      it('should return single project when umbrella.enabled is false', () => {
        createConfig({
          umbrella: {
            enabled: false,
            childRepos: [
              { id: 'fe' },
              { id: 'be' },
            ],
          },
        });

        const result = detectMultiProjectMode(tempDir);
        expect(result.isMultiProject).toBe(false);
      });

      it('should return single project when umbrella has no childRepos', () => {
        createConfig({
          umbrella: {
            enabled: true,
          },
        });

        const result = detectMultiProjectMode(tempDir);
        expect(result.isMultiProject).toBe(false);
      });

      it('should skip child repos without id', () => {
        createConfig({
          umbrella: {
            enabled: true,
            childRepos: [
              { displayName: 'No ID' },
              { id: 'fe' },
              { id: 'be' },
            ],
          },
        });

        const result = detectMultiProjectMode(tempDir);
        expect(result.isMultiProject).toBe(true);
        expect(result.projects).toHaveLength(2);
      });

      it('should use id as name when displayName is absent', () => {
        createConfig({
          umbrella: {
            enabled: true,
            childRepos: [
              { id: 'frontend' },
              { id: 'backend' },
            ],
          },
        });

        const result = detectMultiProjectMode(tempDir);
        expect(result.projects[0].name).toBe('frontend');
        expect(result.projects[1].name).toBe('backend');
      });
    });

    describe('multiProject.enabled with projects', () => {
      it('should detect multi-project from multiProject config', () => {
        createConfig({
          multiProject: {
            enabled: true,
            projects: {
              'web-client': { name: 'Web Client', path: 'apps/web' },
              'api-server': { name: 'API Server', path: 'apps/api' },
            },
          },
        });

        const result = detectMultiProjectMode(tempDir);
        expect(result.isMultiProject).toBe(true);
        expect(result.detectionReason).toBe('multiProject.enabled with projects config');
        expect(result.umbrellaEnabled).toBe(false);
        expect(result.projects).toHaveLength(2);
      });

      it('should use project key as id', () => {
        createConfig({
          multiProject: {
            enabled: true,
            projects: {
              'my-fe': { name: 'Frontend' },
              'my-be': { name: 'Backend' },
            },
          },
        });

        const result = detectMultiProjectMode(tempDir);
        expect(result.projects[0].id).toBe('my-fe');
        expect(result.projects[1].id).toBe('my-be');
      });

      it('should use explicit prefix from project config', () => {
        createConfig({
          multiProject: {
            enabled: true,
            projects: {
              'proj-1': { prefix: 'P1', name: 'Project 1' },
              'proj-2': { prefix: 'P2', name: 'Project 2' },
            },
          },
        });

        const result = detectMultiProjectMode(tempDir);
        expect(result.projects[0].prefix).toBe('P1');
        expect(result.projects[1].prefix).toBe('P2');
      });

      it('should infer prefix when not explicitly set', () => {
        createConfig({
          multiProject: {
            enabled: true,
            projects: {
              'frontend': { name: 'Frontend' },
              'backend': { name: 'Backend' },
            },
          },
        });

        const result = detectMultiProjectMode(tempDir);
        expect(result.projects[0].prefix).toBe('FE');
        expect(result.projects[1].prefix).toBe('BE');
      });

      it('should return single project when multiProject has only 1 project', () => {
        createConfig({
          multiProject: {
            enabled: true,
            projects: {
              'only-one': { name: 'Only One' },
            },
          },
        });

        const result = detectMultiProjectMode(tempDir);
        expect(result.isMultiProject).toBe(false);
      });

      it('should return single project when multiProject.enabled is false', () => {
        createConfig({
          multiProject: {
            enabled: false,
            projects: {
              fe: { name: 'Frontend' },
              be: { name: 'Backend' },
            },
          },
        });

        const result = detectMultiProjectMode(tempDir);
        expect(result.isMultiProject).toBe(false);
      });

      it('should skip non-object project entries', () => {
        createConfig({
          multiProject: {
            enabled: true,
            projects: {
              fe: { name: 'Frontend' },
              be: { name: 'Backend' },
              broken: 'not-an-object',
            },
          },
        });

        const result = detectMultiProjectMode(tempDir);
        expect(result.isMultiProject).toBe(true);
        expect(result.projects).toHaveLength(2);
      });

      it('should use displayName when name is absent', () => {
        createConfig({
          multiProject: {
            enabled: true,
            projects: {
              fe: { displayName: 'Web Frontend' },
              be: { displayName: 'API Backend' },
            },
          },
        });

        const result = detectMultiProjectMode(tempDir);
        expect(result.projects[0].name).toBe('Web Frontend');
        expect(result.projects[1].name).toBe('API Backend');
      });

      it('should use id as name when neither name nor displayName is set', () => {
        createConfig({
          multiProject: {
            enabled: true,
            projects: {
              frontend: {},
              backend: {},
            },
          },
        });

        const result = detectMultiProjectMode(tempDir);
        expect(result.projects[0].name).toBe('frontend');
        expect(result.projects[1].name).toBe('backend');
      });
    });

    describe('sync profiles with board/area path mapping', () => {
      it('should detect multi-project from boardMapping', () => {
        createConfig({
          sync: {
            profiles: {
              jira: {
                config: {
                  boardMapping: {
                    'Frontend Board': 'fe-project',
                    'Backend Board': 'be-project',
                  },
                },
              },
            },
          },
        });

        const result = detectMultiProjectMode(tempDir);
        expect(result.isMultiProject).toBe(true);
        expect(result.detectionReason).toBe('sync profiles with multiple projects');
        expect(result.hasBoardMapping).toBe(true);
        expect(result.projects).toHaveLength(2);
      });

      it('should detect multi-project from areaPathMapping', () => {
        createConfig({
          sync: {
            profiles: {
              ado: {
                config: {
                  areaPathMapping: {
                    'Project\\Frontend': 'fe-project',
                    'Project\\Backend': 'be-project',
                  },
                },
              },
            },
          },
        });

        const result = detectMultiProjectMode(tempDir);
        expect(result.isMultiProject).toBe(true);
        expect(result.hasBoardMapping).toBe(true);
        expect(result.projects).toHaveLength(2);
      });

      it('should extract name from last segment of area path', () => {
        createConfig({
          sync: {
            profiles: {
              ado: {
                config: {
                  areaPathMapping: {
                    'Root\\Team\\Frontend': 'fe',
                    'Root\\Team\\Backend': 'be',
                  },
                },
              },
            },
          },
        });

        const result = detectMultiProjectMode(tempDir);
        expect(result.projects[0].name).toBe('Frontend');
        expect(result.projects[1].name).toBe('Backend');
      });

      it('should detect multi-project from projects array in sync profile', () => {
        createConfig({
          sync: {
            profiles: {
              github: {
                config: {
                  projects: ['frontend-app', 'backend-api'],
                },
              },
            },
          },
        });

        const result = detectMultiProjectMode(tempDir);
        expect(result.isMultiProject).toBe(true);
        expect(result.projects).toHaveLength(2);
        expect(result.hasBoardMapping).toBe(false);
      });

      it('should deduplicate projects across multiple sync profiles', () => {
        createConfig({
          sync: {
            profiles: {
              jira: {
                config: {
                  boardMapping: {
                    'FE Board': 'fe-project',
                    'BE Board': 'be-project',
                  },
                },
              },
              ado: {
                config: {
                  areaPathMapping: {
                    'Area\\FE': 'fe-project',
                    'Area\\Infra': 'infra-project',
                  },
                },
              },
            },
          },
        });

        const result = detectMultiProjectMode(tempDir);
        expect(result.isMultiProject).toBe(true);
        // fe-project appears in both profiles, should be deduplicated
        expect(result.projects).toHaveLength(3);
        const ids = result.projects.map((p) => p.id);
        expect(ids).toContain('fe-project');
        expect(ids).toContain('be-project');
        expect(ids).toContain('infra-project');
      });

      it('should return single project when sync has only 1 project', () => {
        createConfig({
          sync: {
            profiles: {
              jira: {
                config: {
                  boardMapping: {
                    'Single Board': 'only-one',
                  },
                },
              },
            },
          },
        });

        const result = detectMultiProjectMode(tempDir);
        expect(result.isMultiProject).toBe(false);
      });

      it('should handle profiles with no config', () => {
        createConfig({
          sync: {
            profiles: {
              jira: {},
              github: { config: null },
            },
          },
        });

        const result = detectMultiProjectMode(tempDir);
        expect(result.isMultiProject).toBe(false);
      });
    });

    describe('folder-based detection from specs/', () => {
      it('should detect multi-project from 2+ project folders', () => {
        createConfig({});
        createSpecFolders(['frontend', 'backend']);

        const result = detectMultiProjectMode(tempDir);
        expect(result.isMultiProject).toBe(true);
        expect(result.detectionReason).toBe('multiple project folders in specs/');
        expect(result.projects).toHaveLength(2);
      });

      it('should infer prefixes from folder names', () => {
        createConfig({});
        createSpecFolders(['frontend', 'backend', 'mobile']);

        const result = detectMultiProjectMode(tempDir);
        const prefixes = result.projects.map((p) => p.prefix);
        expect(prefixes).toContain('FE');
        expect(prefixes).toContain('BE');
        expect(prefixes).toContain('MOBILE');
      });

      it('should set path on folder-detected projects', () => {
        createConfig({});
        createSpecFolders(['frontend']);
        // Need 2+ folders for multi-project
        createSpecFolders(['backend']);

        const result = detectMultiProjectMode(tempDir);
        const specsBase = path.join(tempDir, '.specweave', 'docs', 'internal', 'specs');
        expect(result.projects[0].path).toContain(specsBase);
      });

      it('should skip dot-prefixed directories', () => {
        createConfig({});
        createSpecFolders(['.hidden', 'frontend', 'backend']);

        const result = detectMultiProjectMode(tempDir);
        expect(result.projects).toHaveLength(2);
        const ids = result.projects.map((p) => p.id);
        expect(ids).not.toContain('.hidden');
      });

      it('should skip underscore-prefixed directories', () => {
        createConfig({});
        createSpecFolders(['_internal', 'frontend', 'backend']);

        const result = detectMultiProjectMode(tempDir);
        expect(result.projects).toHaveLength(2);
      });

      it('should skip "default" directory', () => {
        createConfig({});
        createSpecFolders(['default', 'frontend', 'backend']);

        const result = detectMultiProjectMode(tempDir);
        expect(result.projects).toHaveLength(2);
        const ids = result.projects.map((p) => p.id);
        expect(ids).not.toContain('default');
      });

      it('should skip files (non-directories)', () => {
        createConfig({});
        createSpecFolders(['frontend', 'backend']);
        // Create a file in specs/
        const specsDir = path.join(tempDir, '.specweave', 'docs', 'internal', 'specs');
        fs.writeFileSync(path.join(specsDir, 'README.md'), '# Specs');

        const result = detectMultiProjectMode(tempDir);
        expect(result.projects).toHaveLength(2);
      });

      it('should return single project when only 1 folder exists', () => {
        createConfig({});
        createSpecFolders(['only-one']);

        const result = detectMultiProjectMode(tempDir);
        expect(result.isMultiProject).toBe(false);
      });

      it('should return single project when specs/ does not exist', () => {
        createConfig({});
        // No specs folders created
        const result = detectMultiProjectMode(tempDir);
        expect(result.isMultiProject).toBe(false);
      });
    });

    describe('detection priority', () => {
      it('should prefer umbrella config over multiProject config', () => {
        createConfig({
          umbrella: {
            enabled: true,
            childRepos: [
              { id: 'umbrella-fe' },
              { id: 'umbrella-be' },
            ],
          },
          multiProject: {
            enabled: true,
            projects: {
              'multi-fe': { name: 'FE' },
              'multi-be': { name: 'BE' },
            },
          },
        });

        const result = detectMultiProjectMode(tempDir);
        expect(result.detectionReason).toBe('umbrella.enabled with childRepos');
        expect(result.umbrellaEnabled).toBe(true);
        expect(result.projects[0].id).toBe('umbrella-fe');
      });

      it('should prefer multiProject config over sync profiles', () => {
        createConfig({
          multiProject: {
            enabled: true,
            projects: {
              'mp-fe': { name: 'FE' },
              'mp-be': { name: 'BE' },
            },
          },
          sync: {
            profiles: {
              jira: {
                config: {
                  boardMapping: {
                    'Board FE': 'sync-fe',
                    'Board BE': 'sync-be',
                  },
                },
              },
            },
          },
        });

        const result = detectMultiProjectMode(tempDir);
        expect(result.detectionReason).toBe('multiProject.enabled with projects config');
        expect(result.projects[0].id).toBe('mp-fe');
      });

      it('should prefer sync profiles over folder detection', () => {
        createConfig({
          sync: {
            profiles: {
              jira: {
                config: {
                  boardMapping: {
                    'FE Board': 'sync-fe',
                    'BE Board': 'sync-be',
                  },
                },
              },
            },
          },
        });
        createSpecFolders(['folder-fe', 'folder-be']);

        const result = detectMultiProjectMode(tempDir);
        expect(result.detectionReason).toBe('sync profiles with multiple projects');
        expect(result.projects[0].id).toBe('sync-fe');
      });

      it('should fall through to folders when umbrella has <2 repos', () => {
        createConfig({
          umbrella: {
            enabled: true,
            childRepos: [{ id: 'only-one' }],
          },
        });
        createSpecFolders(['frontend', 'backend']);

        const result = detectMultiProjectMode(tempDir);
        expect(result.detectionReason).toBe('multiple project folders in specs/');
      });
    });
  });

  // ---------------------------------------------------------------------------
  // getProjectPrefixes
  // ---------------------------------------------------------------------------

  describe('getProjectPrefixes', () => {
    it('should return prefix array for multi-project', () => {
      createConfig({
        umbrella: {
          enabled: true,
          childRepos: [
            { id: 'fe', prefix: 'FE' },
            { id: 'be', prefix: 'BE' },
            { id: 'shared', prefix: 'SHARED' },
          ],
        },
      });

      const prefixes = getProjectPrefixes(tempDir);
      expect(prefixes).toEqual(['FE', 'BE', 'SHARED']);
    });

    it('should return empty array for single project', () => {
      createConfig({});
      const prefixes = getProjectPrefixes(tempDir);
      expect(prefixes).toEqual([]);
    });

    it('should return empty array when no config exists', () => {
      const prefixes = getProjectPrefixes(tempDir);
      expect(prefixes).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // getProjectByPrefix
  // ---------------------------------------------------------------------------

  describe('getProjectByPrefix', () => {
    it('should find project by exact prefix match', () => {
      createConfig({
        umbrella: {
          enabled: true,
          childRepos: [
            { id: 'my-fe', prefix: 'FE', displayName: 'Frontend' },
            { id: 'my-be', prefix: 'BE', displayName: 'Backend' },
          ],
        },
      });

      const project = getProjectByPrefix('FE', tempDir);
      expect(project).toBeDefined();
      expect(project!.id).toBe('my-fe');
      expect(project!.name).toBe('Frontend');
    });

    it('should find project case-insensitively', () => {
      createConfig({
        umbrella: {
          enabled: true,
          childRepos: [
            { id: 'my-fe', prefix: 'FE' },
            { id: 'my-be', prefix: 'BE' },
          ],
        },
      });

      const project = getProjectByPrefix('fe', tempDir);
      expect(project).toBeDefined();
      expect(project!.prefix).toBe('FE');
    });

    it('should handle mixed case lookup', () => {
      createConfig({
        umbrella: {
          enabled: true,
          childRepos: [
            { id: 'my-shared', prefix: 'SHARED' },
            { id: 'my-be', prefix: 'BE' },
          ],
        },
      });

      const project = getProjectByPrefix('Shared', tempDir);
      expect(project).toBeDefined();
      expect(project!.id).toBe('my-shared');
    });

    it('should return undefined for non-existent prefix', () => {
      createConfig({
        umbrella: {
          enabled: true,
          childRepos: [
            { id: 'my-fe', prefix: 'FE' },
            { id: 'my-be', prefix: 'BE' },
          ],
        },
      });

      const project = getProjectByPrefix('MOBILE', tempDir);
      expect(project).toBeUndefined();
    });

    it('should return undefined for single project mode', () => {
      createConfig({});
      const project = getProjectByPrefix('FE', tempDir);
      expect(project).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // formatUserStoryId
  // ---------------------------------------------------------------------------

  describe('formatUserStoryId', () => {
    it('should format with prefix: US-FE-001', () => {
      expect(formatUserStoryId(1, 'FE')).toBe('US-FE-001');
    });

    it('should format without prefix: US-001', () => {
      expect(formatUserStoryId(1)).toBe('US-001');
    });

    it('should pad to 3 digits: US-003', () => {
      expect(formatUserStoryId(3)).toBe('US-003');
    });

    it('should handle double-digit numbers: US-042', () => {
      expect(formatUserStoryId(42)).toBe('US-042');
    });

    it('should handle triple-digit numbers: US-100', () => {
      expect(formatUserStoryId(100)).toBe('US-100');
    });

    it('should handle large numbers beyond 3 digits: US-1234', () => {
      expect(formatUserStoryId(1234)).toBe('US-1234');
    });

    it('should uppercase the prefix', () => {
      expect(formatUserStoryId(1, 'fe')).toBe('US-FE-001');
    });

    it('should handle mixed case prefix', () => {
      expect(formatUserStoryId(5, 'Mobile')).toBe('US-MOBILE-005');
    });

    it('should format US-BE-010 correctly', () => {
      expect(formatUserStoryId(10, 'BE')).toBe('US-BE-010');
    });

    it('should return US-NNN without prefix in multi-project when no prefix provided', () => {
      createConfig({
        umbrella: {
          enabled: true,
          childRepos: [
            { id: 'fe' },
            { id: 'be' },
          ],
        },
      });

      // When multi-project but no prefix given, still uses generic format
      const result = formatUserStoryId(1, undefined, tempDir);
      expect(result).toBe('US-001');
    });
  });

  // ---------------------------------------------------------------------------
  // formatAcceptanceCriteriaId
  // ---------------------------------------------------------------------------

  describe('formatAcceptanceCriteriaId', () => {
    it('should format without prefix: AC-US1-01', () => {
      expect(formatAcceptanceCriteriaId(1, 1)).toBe('AC-US1-01');
    });

    it('should format with prefix: AC-FE-US1-01', () => {
      expect(formatAcceptanceCriteriaId(1, 1, 'FE')).toBe('AC-FE-US1-01');
    });

    it('should pad AC number to 2 digits', () => {
      expect(formatAcceptanceCriteriaId(1, 3)).toBe('AC-US1-03');
    });

    it('should handle double-digit AC numbers: AC-US1-12', () => {
      expect(formatAcceptanceCriteriaId(1, 12)).toBe('AC-US1-12');
    });

    it('should handle large story numbers: AC-US42-05', () => {
      expect(formatAcceptanceCriteriaId(42, 5)).toBe('AC-US42-05');
    });

    it('should uppercase the prefix', () => {
      expect(formatAcceptanceCriteriaId(2, 3, 'be')).toBe('AC-BE-US2-03');
    });

    it('should handle mixed case prefix', () => {
      expect(formatAcceptanceCriteriaId(1, 1, 'Shared')).toBe('AC-SHARED-US1-01');
    });

    it('should format AC-MOBILE-US3-07 correctly', () => {
      expect(formatAcceptanceCriteriaId(3, 7, 'MOBILE')).toBe('AC-MOBILE-US3-07');
    });
  });

  // ---------------------------------------------------------------------------
  // generateMultiProjectTemplateVars
  // ---------------------------------------------------------------------------

  describe('generateMultiProjectTemplateVars', () => {
    it('should return MULTI_PROJECT=false for single project', () => {
      const detection: MultiProjectDetectionResult = {
        isMultiProject: false,
        detectionReason: 'no multi-project configuration detected',
        projects: [],
        umbrellaEnabled: false,
        hasBoardMapping: false,
      };

      const vars = generateMultiProjectTemplateVars(detection);
      expect(vars).toEqual({ MULTI_PROJECT: 'false' });
    });

    it('should return MULTI_PROJECT=true for multi-project', () => {
      const detection: MultiProjectDetectionResult = {
        isMultiProject: true,
        detectionReason: 'umbrella.enabled with childRepos',
        projects: [
          { id: 'my-fe', prefix: 'FE', name: 'Frontend' },
          { id: 'my-be', prefix: 'BE', name: 'Backend' },
        ],
        umbrellaEnabled: true,
        hasBoardMapping: false,
      };

      const vars = generateMultiProjectTemplateVars(detection);
      expect(vars.MULTI_PROJECT).toBe('true');
    });

    it('should include per-project variables', () => {
      const detection: MultiProjectDetectionResult = {
        isMultiProject: true,
        detectionReason: 'test',
        projects: [
          { id: 'my-fe', prefix: 'FE', name: 'Frontend' },
          { id: 'my-be', prefix: 'BE', name: 'Backend' },
        ],
        umbrellaEnabled: false,
        hasBoardMapping: false,
      };

      const vars = generateMultiProjectTemplateVars(detection);
      expect(vars.PROJECT_FE_ID).toBe('my-fe');
      expect(vars.PROJECT_FE_PREFIX).toBe('FE');
      expect(vars.PROJECT_FE_NAME).toBe('Frontend');
      expect(vars.PROJECT_BE_ID).toBe('my-be');
      expect(vars.PROJECT_BE_PREFIX).toBe('BE');
      expect(vars.PROJECT_BE_NAME).toBe('Backend');
    });

    it('should add common project shorthand for FE project', () => {
      const detection: MultiProjectDetectionResult = {
        isMultiProject: true,
        detectionReason: 'test',
        projects: [
          { id: 'web-client', prefix: 'FE', name: 'Web' },
          { id: 'api-svc', prefix: 'BE', name: 'API' },
        ],
        umbrellaEnabled: false,
        hasBoardMapping: false,
      };

      const vars = generateMultiProjectTemplateVars(detection);
      expect(vars.PROJECT_FE_ID).toBe('web-client');
    });

    it('should add common project shorthand for BE project', () => {
      const detection: MultiProjectDetectionResult = {
        isMultiProject: true,
        detectionReason: 'test',
        projects: [
          { id: 'web-client', prefix: 'FE', name: 'Web' },
          { id: 'api-gateway', prefix: 'BE', name: 'Gateway' },
        ],
        umbrellaEnabled: false,
        hasBoardMapping: false,
      };

      const vars = generateMultiProjectTemplateVars(detection);
      expect(vars.PROJECT_BE_ID).toBe('api-gateway');
    });

    it('should add common project shorthand for SHARED project', () => {
      const detection: MultiProjectDetectionResult = {
        isMultiProject: true,
        detectionReason: 'test',
        projects: [
          { id: 'my-fe', prefix: 'FE', name: 'FE' },
          { id: 'my-shared', prefix: 'SHARED', name: 'Shared Libs' },
        ],
        umbrellaEnabled: false,
        hasBoardMapping: false,
      };

      const vars = generateMultiProjectTemplateVars(detection);
      expect(vars.PROJECT_SHARED_ID).toBe('my-shared');
    });

    it('should add common project shorthand for COMMON prefix (maps to shared)', () => {
      const detection: MultiProjectDetectionResult = {
        isMultiProject: true,
        detectionReason: 'test',
        projects: [
          { id: 'my-fe', prefix: 'FE', name: 'FE' },
          { id: 'my-common', prefix: 'COMMON', name: 'Common' },
        ],
        umbrellaEnabled: false,
        hasBoardMapping: false,
      };

      const vars = generateMultiProjectTemplateVars(detection);
      expect(vars.PROJECT_SHARED_ID).toBe('my-common');
    });

    it('should not include shorthand keys when those projects are absent', () => {
      const detection: MultiProjectDetectionResult = {
        isMultiProject: true,
        detectionReason: 'test',
        projects: [
          { id: 'proj-alpha', prefix: 'ALPHA', name: 'Alpha' },
          { id: 'proj-beta', prefix: 'BETA', name: 'Beta' },
        ],
        umbrellaEnabled: false,
        hasBoardMapping: false,
      };

      const vars = generateMultiProjectTemplateVars(detection);
      expect(vars.MULTI_PROJECT).toBe('true');
      expect(vars.PROJECT_ALPHA_ID).toBe('proj-alpha');
      expect(vars.PROJECT_BETA_ID).toBe('proj-beta');
      // Common shorthands should not be set
      expect(vars).not.toHaveProperty('PROJECT_FE_ID');
      expect(vars).not.toHaveProperty('PROJECT_BE_ID');
      expect(vars).not.toHaveProperty('PROJECT_SHARED_ID');
    });

    it('should not add extra vars for single project detection', () => {
      const detection: MultiProjectDetectionResult = {
        isMultiProject: false,
        detectionReason: 'no multi-project configuration detected',
        projects: [],
        umbrellaEnabled: false,
        hasBoardMapping: false,
      };

      const vars = generateMultiProjectTemplateVars(detection);
      expect(Object.keys(vars)).toEqual(['MULTI_PROJECT']);
    });

    it('should handle projects with lowercase prefix by uppercasing for keys', () => {
      const detection: MultiProjectDetectionResult = {
        isMultiProject: true,
        detectionReason: 'test',
        projects: [
          { id: 'proj-a', prefix: 'alpha', name: 'Alpha' },
          { id: 'proj-b', prefix: 'beta', name: 'Beta' },
        ],
        umbrellaEnabled: false,
        hasBoardMapping: false,
      };

      const vars = generateMultiProjectTemplateVars(detection);
      expect(vars.PROJECT_ALPHA_ID).toBe('proj-a');
      expect(vars.PROJECT_ALPHA_PREFIX).toBe('alpha');
      expect(vars.PROJECT_BETA_ID).toBe('proj-b');
    });
  });
});
