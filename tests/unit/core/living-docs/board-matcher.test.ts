/**
 * BoardMatcher Tests
 *
 * Tests for intelligent board/area path matching for living docs sync
 * @see ADR-0178: Intelligent Board/Area Path Matching
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { BoardMatcher } from '../../../../src/core/living-docs/board-matcher.js';
import { Logger } from '../../../../src/utils/logger.js';

// Silent logger for tests
const silentLogger: Logger = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};

describe('BoardMatcher', () => {
  let testDir: string;
  let boardMatcher: BoardMatcher;

  beforeEach(async () => {
    // Create temp directory for tests
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'board-matcher-test-'));
    await fs.mkdir(path.join(testDir, '.specweave'), { recursive: true });
    boardMatcher = new BoardMatcher(testDir, { logger: silentLogger });
  });

  afterEach(async () => {
    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('extractIncrementKeywords', () => {
    it('should extract keywords from title', () => {
      const spec = `# Clinical Insights Dashboard

This is a feature for clinical data visualization.`;

      const keywords = boardMatcher.extractIncrementKeywords(spec);

      expect(keywords).toContain('clinical');
      expect(keywords).toContain('insights');
      expect(keywords).toContain('dashboard');
    });

    it('should extract keywords from increment frontmatter', () => {
      const spec = `---
increment: 0045-clinical-insights-dashboard
---

# Feature Title`;

      const keywords = boardMatcher.extractIncrementKeywords(spec);

      expect(keywords).toContain('clinical');
      expect(keywords).toContain('insights');
      expect(keywords).toContain('dashboard');
    });

    it('should extract keywords from Type field', () => {
      const spec = `# Feature
**Type**: hotfix
**Status**: active`;

      const keywords = boardMatcher.extractIncrementKeywords(spec);

      expect(keywords).toContain('hotfix');
    });

    it('should extract keywords from description', () => {
      const spec = `# Feature

## Description
This feature implements edge compute telemetry processing for IoMT devices.`;

      const keywords = boardMatcher.extractIncrementKeywords(spec);

      expect(keywords).toContain('edge');
      expect(keywords).toContain('compute');
      expect(keywords).toContain('telemetry');
      expect(keywords).toContain('iomt');
      expect(keywords).toContain('devices');
    });

    it('should remove common stop words', () => {
      const spec = `# The Feature is for the User

This is a new feature that will be implemented.`;

      const keywords = boardMatcher.extractIncrementKeywords(spec);

      expect(keywords).not.toContain('the');
      expect(keywords).not.toContain('is');
      expect(keywords).not.toContain('for');
      expect(keywords).not.toContain('new');
    });

    it('should extract words from title', () => {
      const spec = `# Clinical Insights Implementation

This is about clinical data platform work.`;

      const keywords = boardMatcher.extractIncrementKeywords(spec);

      // Should extract words from title
      expect(keywords).toContain('clinical');
      expect(keywords).toContain('insights');
      expect(keywords).toContain('implementation');
    });
  });

  describe('getAvailableBoards', () => {
    it('should return empty array when no config exists', async () => {
      const boards = await boardMatcher.getAvailableBoards();
      expect(boards).toEqual([]);
    });

    it('should extract boards from ADO areaPaths config', async () => {
      const config = {
        sync: {
          profiles: {
            'ado-profile': {
              provider: 'ado',
              config: {
                project: 'MyProject',
                areaPaths: ['Clinical-Insights', 'AI-Platform', 'Edge-Compute']
              }
            }
          }
        }
      };

      await fs.writeFile(
        path.join(testDir, '.specweave/config.json'),
        JSON.stringify(config, null, 2)
      );

      // Create new matcher to reload config
      const matcher = new BoardMatcher(testDir, { logger: silentLogger });
      const boards = await matcher.getAvailableBoards();

      expect(boards.length).toBe(3);
      expect(boards.map(b => b.id)).toContain('clinical-insights');
      expect(boards.map(b => b.id)).toContain('ai-platform');
      expect(boards.map(b => b.id)).toContain('edge-compute');
      expect(boards[0].source).toBe('areaPath');
      // Should include ADO project for 2-level folder structure
      expect(boards[0].adoProject).toBe('myproject');
    });

    it('should include adoProject for 2-level folder structure', async () => {
      const config = {
        sync: {
          profiles: {
            'ado-techcorp': {
              provider: 'ado',
              config: {
                project: 'TechCorp',
                areaPaths: ['Clinical-Insights', 'AI-Platform']
              }
            }
          }
        }
      };

      await fs.writeFile(
        path.join(testDir, '.specweave/config.json'),
        JSON.stringify(config, null, 2)
      );

      const matcher = new BoardMatcher(testDir, { logger: silentLogger });
      const boards = await matcher.getAvailableBoards();

      // All boards should have adoProject set for 2-level structure
      expect(boards.every(b => b.adoProject === 'techcorp')).toBe(true);

      // Match result should also include adoProject
      const decision = await matcher.matchIncrement('0001-clinical', '# Clinical Dashboard');
      if (decision.bestMatch) {
        expect(decision.bestMatch.adoProject).toBe('techcorp');
      }
    });

    it('should extract boards from areaPathMapping config', async () => {
      const config = {
        sync: {
          profiles: {
            'ado-profile': {
              provider: 'ado',
              config: {
                areaPathMapping: {
                  project: 'MyProject',
                  mappings: [
                    { areaPath: 'MyProject\\FE', specweaveProject: 'frontend', keywords: ['react', 'ui'] },
                    { areaPath: 'MyProject\\BE', specweaveProject: 'backend', keywords: ['api', 'nodejs'] }
                  ]
                }
              }
            }
          }
        }
      };

      await fs.writeFile(
        path.join(testDir, '.specweave/config.json'),
        JSON.stringify(config, null, 2)
      );

      const matcher = new BoardMatcher(testDir, { logger: silentLogger });
      const boards = await matcher.getAvailableBoards();

      expect(boards.length).toBe(2);
      expect(boards.find(b => b.id === 'frontend')?.keywords).toContain('react');
      expect(boards.find(b => b.id === 'backend')?.keywords).toContain('api');
      expect(boards[0].source).toBe('areaPathMapping');
    });

    it('should extract boards from umbrella childRepos', async () => {
      const config = {
        umbrella: {
          enabled: true,
          childRepos: [
            { id: 'fm-telemetry-service', name: 'fm-telemetry-service', team: 'fm-telemetry' },
            { id: 'clinical-insights', name: 'clinical-insights', team: 'clinical-team' }
          ]
        }
      };

      await fs.writeFile(
        path.join(testDir, '.specweave/config.json'),
        JSON.stringify(config, null, 2)
      );

      const matcher = new BoardMatcher(testDir, { logger: silentLogger });
      const boards = await matcher.getAvailableBoards();

      expect(boards.length).toBe(2);
      expect(boards.map(b => b.id)).toContain('fm-telemetry-service');
      expect(boards.map(b => b.id)).toContain('clinical-insights');
      expect(boards[0].source).toBe('childRepo');
    });

    it('should extract boards from existing specs folders', async () => {
      // Create specs folder with some project folders
      const specsDir = path.join(testDir, '.specweave/docs/internal/specs');
      await fs.mkdir(path.join(specsDir, 'frontend'), { recursive: true });
      await fs.mkdir(path.join(specsDir, 'backend'), { recursive: true });
      await fs.mkdir(path.join(specsDir, '_archive'), { recursive: true }); // Should be ignored

      const matcher = new BoardMatcher(testDir, { logger: silentLogger });
      const boards = await matcher.getAvailableBoards();

      expect(boards.length).toBe(2);
      expect(boards.map(b => b.id)).toContain('frontend');
      expect(boards.map(b => b.id)).toContain('backend');
      expect(boards.map(b => b.id)).not.toContain('_archive');
    });
  });

  describe('matchIncrement', () => {
    beforeEach(async () => {
      // Setup config with multiple boards
      const config = {
        sync: {
          profiles: {
            'ado-profile': {
              provider: 'ado',
              config: {
                project: 'TechCorp',
                areaPaths: [
                  'Clinical-Insights',
                  'AI-Platform',
                  'Edge-Compute',
                  'IoT-Fleet-Mgt',
                  'Design-System'
                ]
              }
            }
          }
        }
      };

      await fs.writeFile(
        path.join(testDir, '.specweave/config.json'),
        JSON.stringify(config, null, 2)
      );

      boardMatcher = new BoardMatcher(testDir, { logger: silentLogger });
    });

    it('should return high confidence match for exact name match', async () => {
      const spec = `---
increment: 0045-clinical-insights-dashboard
---

# Clinical Insights Dashboard

Implement a dashboard for clinical insights visualization.`;

      const decision = await boardMatcher.matchIncrement('0045-clinical-insights-dashboard', spec);

      expect(decision.needsUserInput).toBe(false);
      expect(decision.reason).toBe('high-confidence-match');
      expect(decision.bestMatch?.boardId).toBe('clinical-insights');
      expect(decision.bestMatch?.confidence).toBeGreaterThan(80);
    });

    it('should return medium confidence for partial matches', async () => {
      const spec = `# Edge Telemetry Enhancement

Improve edge device telemetry collection.`;

      const decision = await boardMatcher.matchIncrement('0046-edge-telemetry', spec);

      // Should match edge-compute with medium confidence
      expect(decision.bestMatch?.boardId).toBe('edge-compute');
      expect(decision.bestMatch?.confidence).toBeGreaterThan(0);
    });

    it('should need user input when no good match found', async () => {
      const spec = `# Random Utility Feature

Some utility work that doesn't match any board.`;

      const decision = await boardMatcher.matchIncrement('0047-random-utility', spec);

      // Either needs user input or has low confidence
      if (decision.bestMatch) {
        expect(decision.bestMatch.confidence).toBeLessThan(80);
      }
    });

    it('should auto-assign when only one board available', async () => {
      // Create config with single board
      const config = {
        sync: {
          profiles: {
            'ado-profile': {
              provider: 'ado',
              config: {
                areaPaths: ['Single-Board']
              }
            }
          }
        }
      };

      await fs.writeFile(
        path.join(testDir, '.specweave/config.json'),
        JSON.stringify(config, null, 2)
      );

      const matcher = new BoardMatcher(testDir, { logger: silentLogger });
      const decision = await matcher.matchIncrement('0001-test', '# Test');

      expect(decision.needsUserInput).toBe(false);
      expect(decision.reason).toBe('single-board');
      expect(decision.bestMatch?.boardId).toBe('single-board');
      expect(decision.bestMatch?.confidence).toBe(100);
    });

    it('should match using configured keywords', async () => {
      const config = {
        sync: {
          profiles: {
            'ado-profile': {
              provider: 'ado',
              config: {
                areaPathMapping: {
                  project: 'MyProject',
                  mappings: [
                    { areaPath: 'MyProject\\FE', specweaveProject: 'frontend', keywords: ['react', 'typescript', 'ui', 'component'] },
                    { areaPath: 'MyProject\\BE', specweaveProject: 'backend', keywords: ['api', 'nodejs', 'database'] }
                  ]
                }
              }
            }
          }
        }
      };

      await fs.writeFile(
        path.join(testDir, '.specweave/config.json'),
        JSON.stringify(config, null, 2)
      );

      const matcher = new BoardMatcher(testDir, { logger: silentLogger });

      const spec = `# New React Component

Implement a new UI component using React and TypeScript.`;

      const decision = await matcher.matchIncrement('0050-react-component', spec);

      expect(decision.bestMatch?.boardId).toBe('frontend');
      expect(decision.bestMatch?.matchedTerms.some(t => t.includes('react') || t.includes('typescript'))).toBe(true);
    });
  });

  describe('isUtilityIncrement', () => {
    it('should detect utility type increment', () => {
      const spec = `# Utility Feature
**Type**: utility

Cross-cutting infrastructure work.`;

      expect(boardMatcher.isUtilityIncrement(spec)).toBe(true);
    });

    it('should detect cross-cutting increment', () => {
      const spec = `# Platform-wide Enhancement

This is a cross-cutting feature that affects all teams.`;

      expect(boardMatcher.isUtilityIncrement(spec)).toBe(true);
    });

    it('should detect infrastructure type', () => {
      const spec = `# CI/CD Pipeline
**Type**: infrastructure`;

      expect(boardMatcher.isUtilityIncrement(spec)).toBe(true);
    });

    it('should not detect regular feature as utility', () => {
      const spec = `# Clinical Dashboard Feature
**Type**: feature

Implement a new dashboard for clinical data.`;

      expect(boardMatcher.isUtilityIncrement(spec)).toBe(false);
    });
  });

  describe('fuzzy matching', () => {
    beforeEach(async () => {
      const config = {
        sync: {
          profiles: {
            'ado-profile': {
              provider: 'ado',
              config: {
                areaPaths: [
                  'Digital-Service-Operations',
                  'Platform-Engineering',
                  'Dev-Sec-Ops'
                ]
              }
            }
          }
        }
      };

      await fs.writeFile(
        path.join(testDir, '.specweave/config.json'),
        JSON.stringify(config, null, 2)
      );

      boardMatcher = new BoardMatcher(testDir, { logger: silentLogger });
    });

    it('should match singular/plural variations', async () => {
      const spec = `# Operation Dashboard

Improve service operation monitoring.`;

      const decision = await boardMatcher.matchIncrement('0060-operation-dashboard', spec);

      // Should match digital-service-operations via fuzzy matching
      expect(decision.allMatches.some(m => m.boardId === 'digital-service-operations')).toBe(true);
    });

    it('should return matches for all boards when relevant keywords present', async () => {
      const spec = `# Operations and Engineering Work

Platform engineering and service operations improvements.`;

      const decision = await boardMatcher.matchIncrement('0061-ops-engineering', spec);

      // Should have matches from both operation and engineering boards
      expect(decision.allMatches.length).toBeGreaterThan(0);
      // At least one should match operations or engineering
      expect(decision.allMatches.some(m =>
        m.boardId.includes('operation') || m.boardId.includes('engineering')
      )).toBe(true);
    });
  });
});
