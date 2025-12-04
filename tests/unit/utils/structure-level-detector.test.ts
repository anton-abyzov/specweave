/**
 * Unit tests for structure-level-detector.ts
 *
 * Tests detection of 1-level vs 2-level folder structures for living docs sync.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

// Import the functions we're testing
import {
  detectStructureLevel,
  validateProjectContext,
  getRequiredSpecFields,
  normalizeId,
  type StructureLevelConfig,
  type ProjectContextValidation
} from '../../../src/utils/structure-level-detector.js';

describe('structure-level-detector', () => {
  let tempDir: string;

  beforeEach(() => {
    // Create temp directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-test-'));
  });

  afterEach(() => {
    // Cleanup temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  /**
   * Helper to create config.json
   */
  function createConfig(config: object): void {
    const specweavePath = path.join(tempDir, '.specweave');
    fs.mkdirSync(specweavePath, { recursive: true });
    fs.writeFileSync(
      path.join(specweavePath, 'config.json'),
      JSON.stringify(config, null, 2)
    );
  }

  /**
   * Helper to create folder structure
   */
  function createFolders(folders: string[]): void {
    for (const folder of folders) {
      fs.mkdirSync(path.join(tempDir, folder), { recursive: true });
    }
  }

  describe('normalizeId', () => {
    it('should convert to lowercase', () => {
      expect(normalizeId('MyProject')).toBe('myproject');
    });

    it('should replace spaces with hyphens', () => {
      expect(normalizeId('My Project Name')).toBe('my-project-name');
    });

    it('should remove special characters', () => {
      expect(normalizeId('project@name#123')).toBe('projectname123');
    });

    it('should collapse multiple hyphens', () => {
      expect(normalizeId('project--name')).toBe('project-name');
    });

    it('should trim leading/trailing hyphens', () => {
      expect(normalizeId('-project-name-')).toBe('project-name');
    });
  });

  describe('detectStructureLevel', () => {
    describe('default behavior', () => {
      it('should return 1-level with default project when no config exists', () => {
        const result = detectStructureLevel(tempDir);

        expect(result.level).toBe(1);
        expect(result.source).toBe('single-project');
        expect(result.projects).toHaveLength(1);
        expect(result.projects[0].id).toBe('default');
      });
    });

    describe('ADO area path mapping (2-level)', () => {
      it('should detect 2-level structure from ADO areaPathMapping', () => {
        createConfig({
          sync: {
            profiles: {
              'ado-profile': {
                provider: 'ado',
                config: {
                  project: 'AcmeCorp',
                  areaPathMapping: {
                    project: 'AcmeCorp',
                    mappings: [
                      { areaPath: 'AcmeCorp\\Digital', specweaveProject: 'digital-operations', keywords: ['digital'] },
                      { areaPath: 'AcmeCorp\\Clinical', specweaveProject: 'clinical-insights', keywords: ['clinical'] }
                    ]
                  }
                }
              }
            }
          }
        });

        const result = detectStructureLevel(tempDir);

        expect(result.level).toBe(2);
        expect(result.source).toBe('ado-area-path');
        expect(result.detectionReason).toBe('ADO area path mapping configured');
        expect(result.projects).toHaveLength(1);
        expect(result.projects[0].id).toBe('acmecorp');
        expect(result.boardsByProject).toBeDefined();
        expect(result.boardsByProject!['acmecorp']).toHaveLength(2);
        expect(result.boardsByProject!['acmecorp'][0].id).toBe('digital-operations');
        expect(result.boardsByProject!['acmecorp'][1].id).toBe('clinical-insights');
      });

      it('should detect 2-level structure from simple ADO areaPaths', () => {
        createConfig({
          sync: {
            profiles: {
              'ado-profile': {
                provider: 'ado',
                config: {
                  project: 'MyProject',
                  areaPaths: ['Team A', 'Team B', 'Team C']
                }
              }
            }
          }
        });

        const result = detectStructureLevel(tempDir);

        expect(result.level).toBe(2);
        expect(result.source).toBe('ado-area-path');
        expect(result.boardsByProject!['myproject']).toHaveLength(3);
      });
    });

    describe('JIRA board mapping (2-level)', () => {
      it('should detect 2-level structure from JIRA boardMapping with multiple boards', () => {
        createConfig({
          sync: {
            profiles: {
              'jira-profile': {
                provider: 'jira',
                config: {
                  boardMapping: {
                    boards: [
                      { id: '1', name: 'Frontend', specweaveProject: 'frontend' },
                      { id: '2', name: 'Backend', specweaveProject: 'backend' }
                    ]
                  }
                }
              }
            }
          }
        });

        const result = detectStructureLevel(tempDir);

        expect(result.level).toBe(2);
        expect(result.source).toBe('jira-board');
        expect(result.projects.map(p => p.id)).toContain('frontend');
        expect(result.projects.map(p => p.id)).toContain('backend');
      });
    });

    describe('Umbrella with teams (2-level)', () => {
      it('should detect 2-level structure from umbrella with multiple teams', () => {
        createConfig({
          umbrella: {
            enabled: true,
            childRepos: [
              { id: 'app-fe', name: 'Frontend App', team: 'Frontend Team' },
              { id: 'app-be', name: 'Backend App', team: 'Backend Team' },
              { id: 'shared-lib', name: 'Shared Library', team: 'Frontend Team' }
            ]
          }
        });

        const result = detectStructureLevel(tempDir);

        expect(result.level).toBe(2);
        expect(result.source).toBe('umbrella-teams');
        expect(result.projects).toHaveLength(2); // Frontend Team, Backend Team
        expect(result.boardsByProject!['frontend-team']).toHaveLength(2); // app-fe, shared-lib
        expect(result.boardsByProject!['backend-team']).toHaveLength(1); // app-be
      });
    });

    describe('multiProject (1-level)', () => {
      it('should detect 1-level structure from multiProject configuration', () => {
        createConfig({
          multiProject: {
            enabled: true,
            projects: {
              frontend: { name: 'Frontend' },
              backend: { name: 'Backend' }
            }
          }
        });

        const result = detectStructureLevel(tempDir);

        expect(result.level).toBe(1);
        expect(result.source).toBe('multi-project');
        expect(result.projects).toHaveLength(2);
        expect(result.projects.map(p => p.id)).toContain('frontend');
        expect(result.projects.map(p => p.id)).toContain('backend');
        expect(result.boardsByProject).toBeUndefined();
      });
    });

    describe('existing folder structure', () => {
      it('should detect 1-level from existing project folders', () => {
        createFolders([
          '.specweave/docs/internal/specs/project-a/FS-001',
          '.specweave/docs/internal/specs/project-b/FS-002'
        ]);

        const result = detectStructureLevel(tempDir);

        expect(result.level).toBe(1);
        expect(result.source).toBe('existing-folders');
        expect(result.projects.map(p => p.id)).toContain('project-a');
        expect(result.projects.map(p => p.id)).toContain('project-b');
      });

      it('should detect 2-level from existing nested folder structure', () => {
        createFolders([
          '.specweave/docs/internal/specs/acme-corp/digital-ops/FS-001',
          '.specweave/docs/internal/specs/acme-corp/clinical/FS-002'
        ]);

        const result = detectStructureLevel(tempDir);

        expect(result.level).toBe(2);
        expect(result.source).toBe('existing-folders');
        expect(result.projects[0].id).toBe('acme-corp');
        expect(result.boardsByProject!['acme-corp'].map(b => b.id)).toContain('digital-ops');
        expect(result.boardsByProject!['acme-corp'].map(b => b.id)).toContain('clinical');
      });

      it('should ignore _archive and FS-XXX folders at top level', () => {
        createFolders([
          '.specweave/docs/internal/specs/_archive',
          '.specweave/docs/internal/specs/FS-001',
          '.specweave/docs/internal/specs/my-project/FS-002'
        ]);

        const result = detectStructureLevel(tempDir);

        expect(result.level).toBe(1);
        expect(result.projects).toHaveLength(1);
        expect(result.projects[0].id).toBe('my-project');
      });
    });
  });

  describe('validateProjectContext', () => {
    describe('1-level structure validation', () => {
      beforeEach(() => {
        createConfig({
          multiProject: {
            enabled: true,
            projects: {
              frontend: { name: 'Frontend' },
              backend: { name: 'Backend' }
            }
          }
        });
      });

      it('should pass when project is specified in YAML frontmatter', () => {
        const specContent = `---
increment: 0001-test-feature
project: frontend
---
# Test Feature
`;

        const result = validateProjectContext(specContent, tempDir);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.project).toBe('frontend');
        expect(result.structureLevel).toBe(1);
        expect(result.expectedPath).toBe('internal/specs/frontend/');
      });

      it('should fail when project is missing', () => {
        const specContent = `---
increment: 0001-test-feature
---
# Test Feature
`;

        const result = validateProjectContext(specContent, tempDir);

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain('Missing project field');
      });

      it('should accept legacy **Project**: field with warning', () => {
        const specContent = `---
increment: 0001-test-feature
---
# Test Feature

**Project**: frontend
`;

        const result = validateProjectContext(specContent, tempDir);

        expect(result.isValid).toBe(true);
        expect(result.warnings).toHaveLength(1);
        expect(result.warnings[0]).toContain('prefer project: in YAML frontmatter');
        expect(result.project).toBe('frontend');
      });

      it('should warn when project not found in configuration', () => {
        const specContent = `---
increment: 0001-test-feature
project: unknown-project
---
# Test Feature
`;

        const result = validateProjectContext(specContent, tempDir);

        expect(result.isValid).toBe(true);
        expect(result.warnings).toHaveLength(1);
        expect(result.warnings[0]).toContain('not found in configuration');
      });
    });

    describe('2-level structure validation', () => {
      beforeEach(() => {
        createConfig({
          sync: {
            profiles: {
              'ado-profile': {
                provider: 'ado',
                config: {
                  project: 'AcmeCorp',
                  areaPathMapping: {
                    project: 'AcmeCorp',
                    mappings: [
                      { areaPath: 'AcmeCorp\\Digital', specweaveProject: 'digital-operations' },
                      { areaPath: 'AcmeCorp\\Clinical', specweaveProject: 'clinical-insights' }
                    ]
                  }
                }
              }
            }
          }
        });
      });

      it('should pass when both project and board are specified', () => {
        const specContent = `---
increment: 0001-test-feature
project: acmecorp
board: digital-operations
---
# Test Feature
`;

        const result = validateProjectContext(specContent, tempDir);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.project).toBe('acmecorp');
        expect(result.board).toBe('digital-operations');
        expect(result.structureLevel).toBe(2);
        expect(result.expectedPath).toBe('internal/specs/acmecorp/digital-operations/');
      });

      it('should fail when project is missing', () => {
        const specContent = `---
increment: 0001-test-feature
board: digital-operations
---
# Test Feature
`;

        const result = validateProjectContext(specContent, tempDir);

        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('Missing project field'))).toBe(true);
      });

      it('should fail when board is missing', () => {
        const specContent = `---
increment: 0001-test-feature
project: acmecorp
---
# Test Feature
`;

        const result = validateProjectContext(specContent, tempDir);

        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('Missing board field'))).toBe(true);
      });

      it('should fail when both project and board are missing', () => {
        const specContent = `---
increment: 0001-test-feature
---
# Test Feature
`;

        const result = validateProjectContext(specContent, tempDir);

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(2);
      });

      it('should warn when board not found under project', () => {
        const specContent = `---
increment: 0001-test-feature
project: acmecorp
board: unknown-board
---
# Test Feature
`;

        const result = validateProjectContext(specContent, tempDir);

        expect(result.isValid).toBe(true); // Still valid, just a warning
        expect(result.warnings).toHaveLength(1);
        expect(result.warnings[0]).toContain('not found under project');
      });
    });
  });

  describe('getRequiredSpecFields', () => {
    it('should return project as required for 1-level', () => {
      createConfig({
        multiProject: {
          enabled: true,
          projects: { frontend: { name: 'Frontend' } }
        }
      });

      const result = getRequiredSpecFields(tempDir);

      expect(result.level).toBe(1);
      expect(result.requiredFields).toContain('project');
      expect(result.requiredFields).not.toContain('board');
      expect(result.optionalFields).toContain('board');
    });

    it('should return project and board as required for 2-level', () => {
      createConfig({
        sync: {
          profiles: {
            'ado-profile': {
              provider: 'ado',
              config: {
                project: 'MyProject',
                areaPaths: ['Area1', 'Area2']
              }
            }
          }
        }
      });

      const result = getRequiredSpecFields(tempDir);

      expect(result.level).toBe(2);
      expect(result.requiredFields).toContain('project');
      expect(result.requiredFields).toContain('board');
      expect(result.optionalFields).toHaveLength(0);
    });

    it('should include available projects and boards', () => {
      createConfig({
        sync: {
          profiles: {
            'ado-profile': {
              provider: 'ado',
              config: {
                project: 'MyProject',
                areaPathMapping: {
                  project: 'MyProject',
                  mappings: [
                    { areaPath: 'MyProject\\Team1', specweaveProject: 'team-1' },
                    { areaPath: 'MyProject\\Team2', specweaveProject: 'team-2' }
                  ]
                }
              }
            }
          }
        }
      });

      const result = getRequiredSpecFields(tempDir);

      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].id).toBe('myproject');
      expect(result.boardsByProject).toBeDefined();
      expect(result.boardsByProject!['myproject']).toHaveLength(2);
    });
  });
});
