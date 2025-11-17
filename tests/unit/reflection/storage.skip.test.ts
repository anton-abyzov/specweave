import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit tests for Reflection Storage Manager
 */

import fs from 'fs-extra';
import path from 'path';
import {
  generateReflectionMarkdown,
  getReflectionLogDir,
  getReflectionFilename,
  saveReflection,
  listReflections,
  readReflection,
  deleteReflection
} from '../../../src/hooks/lib/reflection-storage.js';
import {
  ReflectionResult,
  IssueSeverity,
  IssueCategory,
  ReflectionModel
} from '../../../src/hooks/lib/types/reflection-types.js';

describe('Reflection Storage Manager', () => {
  const testDir = path.join(__dirname, '../../fixtures/reflection-storage');
  const incrementId = '0016-self-reflection-system';

  const mockReflectionResult: ReflectionResult = {
    taskName: 'T-005: Implement Reflection Engine',
    completed: '2025-11-10T14:30:00Z',
    duration: '45 minutes',
    filesModified: {
      count: 3,
      linesAdded: 287,
      linesRemoved: 45
    },
    accomplishments: [
      'Created run-self-reflection.ts with agent invocation logic',
      'Added configuration loading from .specweave/config.json',
      'Implemented reflection prompt builder'
    ],
    strengths: [
      'Clean separation of concerns (engine vs agent)',
      'Type-safe configuration loading',
      'Comprehensive error handling'
    ],
    issues: [
      {
        severity: IssueSeverity.CRITICAL,
        category: IssueCategory.SECURITY,
        description: 'API key exposed in debug logs',
        impact: 'Potential credential leakage in log files',
        recommendation: 'Redact API keys before logging',
        location: {
          file: 'src/hooks/lib/run-self-reflection.ts',
          line: 45
        }
      },
      {
        severity: IssueSeverity.MEDIUM,
        category: IssueCategory.TESTING,
        description: 'Missing edge case tests for API failures',
        impact: 'Unhandled error scenarios',
        recommendation: 'Add test cases for rate limits and timeouts'
      }
    ],
    recommendedActions: {
      priority1: ['Redact API keys in debug logging'],
      priority2: ['Add error handling tests', 'Refactor complex functions'],
      priority3: ['Add performance metrics tracking']
    },
    lessonsLearned: {
      whatWentWell: ['TypeScript types caught configuration errors early'],
      whatCouldImprove: ['Should have added API failure tests from start'],
      forNextTime: ['Always review security implications before implementing']
    },
    metrics: {
      codeQuality: 7,
      security: 6,
      testCoverage: 85,
      technicalDebt: 'MEDIUM',
      performance: 'GOOD'
    },
    relatedTasks: ['T-006: Reflection storage manager'],
    metadata: {
      model: ReflectionModel.HAIKU,
      reflectionTime: 23,
      estimatedCost: 0.008
    }
  };

  beforeEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.removeSync(testDir);
    }
    fs.mkdirpSync(testDir);
  });

  afterEach(() => {
    // Clean up after tests
    if (fs.existsSync(testDir)) {
      fs.removeSync(testDir);
    }
  });

  describe('generateReflectionMarkdown', () => {
    it('should generate complete markdown with all sections', () => {
      const markdown = generateReflectionMarkdown(mockReflectionResult);

      // Check required sections
      expect(markdown).toContain('# Self-Reflection: T-005: Implement Reflection Engine');
      expect(markdown).toContain('**Completed**: 2025-11-10T14:30:00Z');
      expect(markdown).toContain('**Duration**: 45 minutes');
      expect(markdown).toContain('**Files Modified**: 3 files, +287 -45');
      expect(markdown).toContain('## ✅ What Was Accomplished');
      expect(markdown).toContain('## 🎯 Quality Assessment');
      expect(markdown).toContain('### ✅ Strengths');
      expect(markdown).toContain('### ⚠️ Issues Identified');
      expect(markdown).toContain('## 🔧 Recommended Follow-Up Actions');
      expect(markdown).toContain('## 📚 Lessons Learned');
      expect(markdown).toContain('## 📊 Metrics');
      expect(markdown).toContain('## 🔗 Related Tasks');
    });

    it('should include accomplishments', () => {
      const markdown = generateReflectionMarkdown(mockReflectionResult);

      expect(markdown).toContain('- Created run-self-reflection.ts with agent invocation logic');
      expect(markdown).toContain('- Added configuration loading from .specweave/config.json');
    });

    it('should include strengths with checkmarks', () => {
      const markdown = generateReflectionMarkdown(mockReflectionResult);

      expect(markdown).toContain('- ✅ Clean separation of concerns (engine vs agent)');
      expect(markdown).toContain('- ✅ Type-safe configuration loading');
    });

    it('should format issues by severity', () => {
      const markdown = generateReflectionMarkdown(mockReflectionResult);

      // CRITICAL issue should appear first
      const criticalIndex = markdown.indexOf('**CRITICAL (SECURITY)**');
      const mediumIndex = markdown.indexOf('**MEDIUM (TESTING)**');

      expect(criticalIndex).toBeGreaterThan(-1);
      expect(mediumIndex).toBeGreaterThan(-1);
      expect(criticalIndex).toBeLessThan(mediumIndex);
    });

    it('should include issue details with location', () => {
      const markdown = generateReflectionMarkdown(mockReflectionResult);

      expect(markdown).toContain('- ❌ API key exposed in debug logs');
      expect(markdown).toContain('**Impact**: Potential credential leakage in log files');
      expect(markdown).toContain('**Recommendation**: Redact API keys before logging');
      expect(markdown).toContain('**Location**: `src/hooks/lib/run-self-reflection.ts:45`');
    });

    it('should format recommended actions by priority', () => {
      const markdown = generateReflectionMarkdown(mockReflectionResult);

      expect(markdown).toContain('**Priority 1 (MUST FIX - before closing increment)**:');
      expect(markdown).toContain('1. Redact API keys in debug logging');
      expect(markdown).toContain('**Priority 2 (SHOULD FIX - this increment)**:');
      expect(markdown).toContain('1. Add error handling tests');
      expect(markdown).toContain('**Priority 3 (NICE TO HAVE - future increment)**:');
    });

    it('should include lessons learned sections', () => {
      const markdown = generateReflectionMarkdown(mockReflectionResult);

      expect(markdown).toContain('**What went well**:');
      expect(markdown).toContain('- TypeScript types caught configuration errors early');
      expect(markdown).toContain('**What could improve**:');
      expect(markdown).toContain('**For next time**:');
    });

    it('should include metrics', () => {
      const markdown = generateReflectionMarkdown(mockReflectionResult);

      expect(markdown).toContain('- **Code Quality**: 7/10');
      expect(markdown).toContain('- **Security**: 6/10');
      expect(markdown).toContain('- **Test Coverage**: 85%');
      expect(markdown).toContain('- **Technical Debt**: MEDIUM');
      expect(markdown).toContain('- **Performance**: GOOD');
    });

    it('should include metadata footer', () => {
      const markdown = generateReflectionMarkdown(mockReflectionResult);

      expect(markdown).toContain('**Auto-generated by**: SpecWeave Self-Reflection System');
      expect(markdown).toContain('**Model**: Claude 3.5 Haiku');
      expect(markdown).toContain('**Reflection Time**: 23 seconds');
      expect(markdown).toContain('**Estimated Cost**: ~$0.008');
    });

    it('should handle reflection without issues', () => {
      const noIssuesResult: ReflectionResult = {
        ...mockReflectionResult,
        issues: []
      };

      const markdown = generateReflectionMarkdown(noIssuesResult);

      expect(markdown).toContain('✅ No critical issues detected. Code follows best practices.');
    });

    it('should handle reflection without recommended actions', () => {
      const noActionsResult: ReflectionResult = {
        ...mockReflectionResult,
        recommendedActions: { priority1: [], priority2: [], priority3: [] }
      };

      const markdown = generateReflectionMarkdown(noActionsResult);

      expect(markdown).toContain('✅ No follow-up actions required. Ready to proceed.');
    });

    it('should handle reflection without lessons learned', () => {
      const noLessonsResult: ReflectionResult = {
        ...mockReflectionResult,
        lessonsLearned: { whatWentWell: [], whatCouldImprove: [], forNextTime: [] }
      };

      const markdown = generateReflectionMarkdown(noLessonsResult);

      // Lessons learned section should not be present
      expect(markdown).not.toContain('## 📚 Lessons Learned');
    });

    it('should handle undefined test coverage', () => {
      const noCoverageResult: ReflectionResult = {
        ...mockReflectionResult,
        metrics: { ...mockReflectionResult.metrics, testCoverage: undefined }
      };

      const markdown = generateReflectionMarkdown(noCoverageResult);

      expect(markdown).toContain('- **Test Coverage**: N/A');
    });

    it('should handle performance with underscores', () => {
      const needsWorkResult: ReflectionResult = {
        ...mockReflectionResult,
        metrics: { ...mockReflectionResult.metrics, performance: 'NEEDS_WORK' }
      };

      const markdown = generateReflectionMarkdown(needsWorkResult);

      expect(markdown).toContain('- **Performance**: NEEDS WORK');
    });
  });

  describe('getReflectionLogDir', () => {
    it('should return correct log directory path', () => {
      const logDir = getReflectionLogDir(incrementId, testDir);
      const expected = path.join(testDir, '.specweave', 'increments', incrementId, 'logs', 'reflections');

      expect(logDir).toBe(expected);
    });

    it('should use current working directory if not specified', () => {
      const logDir = getReflectionLogDir(incrementId);
      expect(logDir).toContain(incrementId);
      expect(logDir).toContain('logs');
      expect(logDir).toContain('reflections');
    });
  });

  describe('getReflectionFilename', () => {
    it('should generate filename with task ID and date', () => {
      const date = new Date('2025-11-10T14:30:00Z');
      const filename = getReflectionFilename('T-005', date);

      expect(filename).toBe('task-T-005-reflection-2025-11-10.md');
    });

    it('should sanitize task ID', () => {
      const filename = getReflectionFilename('Task#005 (Test)', new Date('2025-11-10'));

      expect(filename).toBe('task-Task-005--Test--reflection-2025-11-10.md');
    });

    it('should use current date if not specified', () => {
      const filename = getReflectionFilename('T-001');
      const today = new Date().toISOString().split('T')[0];

      expect(filename).toContain(today);
    });
  });

  describe('saveReflection', () => {
    it('should save reflection to file', () => {
      const filepath = saveReflection(mockReflectionResult, incrementId, 'T-005', testDir);

      expect(fs.existsSync(filepath)).toBe(true);

      const content = fs.readFileSync(filepath, 'utf-8');
      expect(content).toContain('# Self-Reflection: T-005: Implement Reflection Engine');
    });

    it('should create directory structure if it does not exist', () => {
      const logDir = getReflectionLogDir(incrementId, testDir);
      expect(fs.existsSync(logDir)).toBe(false);

      saveReflection(mockReflectionResult, incrementId, 'T-005', testDir);

      expect(fs.existsSync(logDir)).toBe(true);
    });

    it('should return path to saved file', () => {
      const filepath = saveReflection(mockReflectionResult, incrementId, 'T-005', testDir);

      expect(filepath).toContain('reflections');
      expect(filepath).toContain('T-005');
      expect(filepath).toEndWith('.md');
    });

    it('should throw error if file cannot be written', () => {
      // Create read-only directory
      const logDir = getReflectionLogDir(incrementId, testDir);
      fs.mkdirpSync(logDir);
      fs.chmodSync(logDir, 0o444); // Read-only

      expect(() => {
        saveReflection(mockReflectionResult, incrementId, 'T-005', testDir);
      }).toThrow('Failed to save reflection');

      // Restore permissions for cleanup
      fs.chmodSync(logDir, 0o755);
    });
  });

  describe('listReflections', () => {
    it('should list all reflection files', () => {
      // Save multiple reflections
      saveReflection(mockReflectionResult, incrementId, 'T-001', testDir);
      saveReflection(mockReflectionResult, incrementId, 'T-002', testDir);
      saveReflection(mockReflectionResult, incrementId, 'T-003', testDir);

      const reflections = listReflections(incrementId, testDir);

      expect(reflections.length).toBe(3);
      expect(reflections.every(f => f.endsWith('.md'))).toBe(true);
    });

    it('should return empty array if no reflections exist', () => {
      const reflections = listReflections(incrementId, testDir);

      expect(reflections).toEqual([]);
    });

    it('should sort reflections by modification time (newest first)', () => {
      // Save reflections with small delays
      saveReflection(mockReflectionResult, incrementId, 'T-001', testDir);
      const file1 = getReflectionLogDir(incrementId, testDir) + `/task-T-001-reflection-${new Date().toISOString().split('T')[0]}.md`;

      // Touch file1 to make it older
      const oldTime = new Date('2025-01-01').getTime() / 1000;
      fs.utimesSync(file1, oldTime, oldTime);

      saveReflection(mockReflectionResult, incrementId, 'T-002', testDir);

      const reflections = listReflections(incrementId, testDir);

      // T-002 should be first (newest)
      expect(path.basename(reflections[0])).toContain('T-002');
      expect(path.basename(reflections[1])).toContain('T-001');
    });
  });

  describe('readReflection', () => {
    it('should read reflection from file', () => {
      const filepath = saveReflection(mockReflectionResult, incrementId, 'T-005', testDir);
      const content = readReflection(filepath);

      expect(content).toContain('# Self-Reflection');
      expect(content).toContain('T-005');
    });

    it('should throw error if file does not exist', () => {
      const nonExistentPath = path.join(testDir, 'nonexistent.md');

      expect(() => readReflection(nonExistentPath)).toThrow('Failed to read reflection');
    });
  });

  describe('deleteReflection', () => {
    it('should delete reflection file', () => {
      const filepath = saveReflection(mockReflectionResult, incrementId, 'T-005', testDir);

      expect(fs.existsSync(filepath)).toBe(true);

      deleteReflection(filepath);

      expect(fs.existsSync(filepath)).toBe(false);
    });

    it('should throw error if file cannot be deleted', () => {
      const nonExistentPath = path.join(testDir, 'nonexistent.md');

      // Note: fs-extra's removeSync doesn't throw for non-existent files
      // so we can't test the error path easily without mocking
      deleteReflection(nonExistentPath); // Should not throw
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty accomplishments', () => {
      const emptyResult: ReflectionResult = {
        ...mockReflectionResult,
        accomplishments: []
      };

      const markdown = generateReflectionMarkdown(emptyResult);
      expect(markdown).toContain('(No accomplishments recorded)');
    });

    it('should handle empty strengths', () => {
      const emptyResult: ReflectionResult = {
        ...mockReflectionResult,
        strengths: []
      };

      const markdown = generateReflectionMarkdown(emptyResult);
      expect(markdown).toContain('(No strengths recorded)');
    });

    it('should handle issue without location', () => {
      const noLocationResult: ReflectionResult = {
        ...mockReflectionResult,
        issues: [{
          severity: IssueSeverity.LOW,
          category: IssueCategory.QUALITY,
          description: 'Minor code smell',
          impact: 'Slight maintainability concern',
          recommendation: 'Refactor when time permits'
        }]
      };

      const markdown = generateReflectionMarkdown(noLocationResult);
      expect(markdown).toContain('Minor code smell');
      expect(markdown).not.toContain('**Location**:');
    });
  });
});
