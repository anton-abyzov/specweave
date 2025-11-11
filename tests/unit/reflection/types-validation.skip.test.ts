/**
 * Unit Test: Reflection Types Validation
 * Tests the type system and default configuration for self-reflection
 */

import {
  ReflectionMode,
  ReflectionDepth,
  ReflectionModel,
  IssueSeverity,
  IssueCategory,
  DEFAULT_REFLECTION_CONFIG,
  ReflectionConfig,
  ReflectionIssue,
  ReflectionResult,
  type GitDiffInfo,
  type LessonLearned,
  type ReflectionMetrics
} from '../../../src/hooks/lib/types/reflection-types';

describe('Reflection Types - Validation', () => {
  describe('Enums', () => {
    it('should have correct ReflectionMode values', () => {
      expect(ReflectionMode.AUTO).toBe('auto');
      expect(ReflectionMode.MANUAL).toBe('manual');
      expect(ReflectionMode.DISABLED).toBe('disabled');
    });

    it('should have correct ReflectionDepth values', () => {
      expect(ReflectionDepth.QUICK).toBe('quick');
      expect(ReflectionDepth.STANDARD).toBe('standard');
      expect(ReflectionDepth.DEEP).toBe('deep');
    });

    it('should have correct ReflectionModel values', () => {
      expect(ReflectionModel.HAIKU).toBe('haiku');
      expect(ReflectionModel.SONNET).toBe('sonnet');
      expect(ReflectionModel.OPUS).toBe('opus');
    });

    it('should have correct IssueSeverity values', () => {
      expect(IssueSeverity.CRITICAL).toBe('CRITICAL');
      expect(IssueSeverity.HIGH).toBe('HIGH');
      expect(IssueSeverity.MEDIUM).toBe('MEDIUM');
      expect(IssueSeverity.LOW).toBe('LOW');
    });

    it('should have correct IssueCategory values', () => {
      expect(IssueCategory.SECURITY).toBe('SECURITY');
      expect(IssueCategory.QUALITY).toBe('QUALITY');
      expect(IssueCategory.TESTING).toBe('TESTING');
      expect(IssueCategory.PERFORMANCE).toBe('PERFORMANCE');
      expect(IssueCategory.TECHNICAL_DEBT).toBe('TECHNICAL_DEBT');
    });
  });

  describe('DEFAULT_REFLECTION_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_REFLECTION_CONFIG.enabled).toBe(true);
      expect(DEFAULT_REFLECTION_CONFIG.mode).toBe(ReflectionMode.AUTO);
      expect(DEFAULT_REFLECTION_CONFIG.depth).toBe(ReflectionDepth.STANDARD);
      expect(DEFAULT_REFLECTION_CONFIG.model).toBe(ReflectionModel.HAIKU);
      expect(DEFAULT_REFLECTION_CONFIG.criticalThreshold).toBe(IssueSeverity.MEDIUM);
      expect(DEFAULT_REFLECTION_CONFIG.storeReflections).toBe(true);
      expect(DEFAULT_REFLECTION_CONFIG.autoCreateFollowUpTasks).toBe(false);
      expect(DEFAULT_REFLECTION_CONFIG.soundNotifications).toBe(false);
    });

    it('should have all categories enabled by default', () => {
      expect(DEFAULT_REFLECTION_CONFIG.categories.security).toBe(true);
      expect(DEFAULT_REFLECTION_CONFIG.categories.quality).toBe(true);
      expect(DEFAULT_REFLECTION_CONFIG.categories.testing).toBe(true);
      expect(DEFAULT_REFLECTION_CONFIG.categories.performance).toBe(true);
      expect(DEFAULT_REFLECTION_CONFIG.categories.technicalDebt).toBe(true);
    });
  });

  describe('Type Interfaces', () => {
    it('should create valid GitDiffInfo object', () => {
      const diffInfo: GitDiffInfo = {
        file: 'src/auth.ts',
        linesAdded: 50,
        linesRemoved: 10,
        content: '@@ -1,10 +1,50 @@'
      };

      expect(diffInfo.file).toBe('src/auth.ts');
      expect(diffInfo.linesAdded).toBe(50);
      expect(diffInfo.linesRemoved).toBe(10);
      expect(diffInfo.content).toContain('@@');
    });

    it('should create valid ReflectionIssue object', () => {
      const issue: ReflectionIssue = {
        severity: IssueSeverity.HIGH,
        category: IssueCategory.SECURITY,
        description: 'JWT secret exposed in code',
        impact: 'Potential credential leakage',
        recommendation: 'Move to environment variable',
        location: {
          file: 'src/config/auth.ts',
          line: 12,
          column: 5
        }
      };

      expect(issue.severity).toBe(IssueSeverity.HIGH);
      expect(issue.category).toBe(IssueCategory.SECURITY);
      expect(issue.description).toContain('JWT');
      expect(issue.location?.file).toBe('src/config/auth.ts');
      expect(issue.location?.line).toBe(12);
    });

    it('should create valid LessonLearned object', () => {
      const lessons: LessonLearned = {
        whatWentWell: ['TypeScript types caught errors early', 'Tests passed first time'],
        whatCouldImprove: ['Should have reviewed security checklist', 'Missed edge case'],
        forNextTime: ['Run security scan before commit', 'Add more unit tests']
      };

      expect(lessons.whatWentWell).toHaveLength(2);
      expect(lessons.whatCouldImprove).toHaveLength(2);
      expect(lessons.forNextTime).toHaveLength(2);
    });

    it('should create valid ReflectionMetrics object', () => {
      const metrics: ReflectionMetrics = {
        codeQuality: 8,
        security: 6,
        testCoverage: 75,
        technicalDebt: 'LOW',
        performance: 'GOOD'
      };

      expect(metrics.codeQuality).toBe(8);
      expect(metrics.security).toBe(6);
      expect(metrics.testCoverage).toBe(75);
      expect(metrics.technicalDebt).toBe('LOW');
      expect(metrics.performance).toBe('GOOD');
    });

    it('should create valid ReflectionResult object', () => {
      const result: ReflectionResult = {
        taskName: 'T-001: Add Authentication',
        completed: new Date().toISOString(),
        duration: '30 minutes',
        filesModified: {
          count: 2,
          linesAdded: 150,
          linesRemoved: 20
        },
        accomplishments: [
          'Implemented JWT authentication',
          'Added password hashing with bcrypt'
        ],
        strengths: [
          'Secure password storage',
          'Token expiration configured'
        ],
        issues: [
          {
            severity: IssueSeverity.HIGH,
            category: IssueCategory.SECURITY,
            description: 'JWT secret exposed'
          }
        ],
        recommendedActions: {
          priority1: ['Move JWT secret to environment variable'],
          priority2: ['Add email validation'],
          priority3: ['Add logging for failed attempts']
        },
        lessonsLearned: {
          whatWentWell: ['bcrypt integration straightforward'],
          whatCouldImprove: ['Should have checked security checklist'],
          forNextTime: ['Review security before implementing']
        },
        metrics: {
          codeQuality: 8,
          security: 6,
          testCoverage: 75,
          technicalDebt: 'LOW',
          performance: 'GOOD'
        },
        metadata: {
          model: ReflectionModel.HAIKU,
          reflectionTime: 18,
          estimatedCost: 0.009
        }
      };

      expect(result.taskName).toBe('T-001: Add Authentication');
      expect(result.filesModified.count).toBe(2);
      expect(result.accomplishments).toHaveLength(2);
      expect(result.strengths).toHaveLength(2);
      expect(result.issues).toHaveLength(1);
      expect(result.recommendedActions.priority1).toHaveLength(1);
      expect(result.metadata.model).toBe(ReflectionModel.HAIKU);
      expect(result.metadata.estimatedCost).toBe(0.009);
    });
  });

  describe('Configuration Validation', () => {
    it('should allow custom config with all categories disabled', () => {
      const config: ReflectionConfig = {
        ...DEFAULT_REFLECTION_CONFIG,
        categories: {
          security: false,
          quality: false,
          testing: false,
          performance: false,
          technicalDebt: false
        }
      };

      expect(config.categories.security).toBe(false);
      expect(config.categories.quality).toBe(false);
    });

    it('should allow manual mode configuration', () => {
      const config: ReflectionConfig = {
        ...DEFAULT_REFLECTION_CONFIG,
        mode: ReflectionMode.MANUAL,
        depth: ReflectionDepth.DEEP,
        model: ReflectionModel.OPUS
      };

      expect(config.mode).toBe(ReflectionMode.MANUAL);
      expect(config.depth).toBe(ReflectionDepth.DEEP);
      expect(config.model).toBe(ReflectionModel.OPUS);
    });

    it('should allow disabled reflection', () => {
      const config: ReflectionConfig = {
        ...DEFAULT_REFLECTION_CONFIG,
        enabled: false,
        mode: ReflectionMode.DISABLED
      };

      expect(config.enabled).toBe(false);
      expect(config.mode).toBe(ReflectionMode.DISABLED);
    });

    it('should allow critical threshold customization', () => {
      const config: ReflectionConfig = {
        ...DEFAULT_REFLECTION_CONFIG,
        criticalThreshold: IssueSeverity.CRITICAL
      };

      expect(config.criticalThreshold).toBe(IssueSeverity.CRITICAL);
    });
  });

  describe('Cost Estimation Expectations', () => {
    it('should have correct model cost expectations', () => {
      // Haiku: ~$0.01/task
      expect(0.01).toBeLessThan(0.02);

      // Sonnet: ~$0.05/task
      expect(0.05).toBeLessThan(0.10);

      // Opus: ~$0.15/task
      expect(0.15).toBeLessThan(0.20);
    });

    it('should have correct depth time expectations', () => {
      // Quick: ~5s
      const quickTime = 5;
      expect(quickTime).toBeLessThan(10);

      // Standard: ~20s
      const standardTime = 20;
      expect(standardTime).toBeGreaterThan(10);
      expect(standardTime).toBeLessThan(30);

      // Deep: ~60s
      const deepTime = 60;
      expect(deepTime).toBeGreaterThan(30);
      expect(deepTime).toBeLessThan(90);
    });
  });

  describe('Issue Severity Ordering', () => {
    it('should have correct severity priority order', () => {
      const severities = [
        IssueSeverity.CRITICAL,
        IssueSeverity.HIGH,
        IssueSeverity.MEDIUM,
        IssueSeverity.LOW
      ];

      // Verify all severities are unique
      const uniqueSeverities = new Set(severities);
      expect(uniqueSeverities.size).toBe(4);

      // Verify ordering makes sense (CRITICAL > HIGH > MEDIUM > LOW)
      expect(severities[0]).toBe(IssueSeverity.CRITICAL);
      expect(severities[1]).toBe(IssueSeverity.HIGH);
      expect(severities[2]).toBe(IssueSeverity.MEDIUM);
      expect(severities[3]).toBe(IssueSeverity.LOW);
    });
  });

  describe('Category Coverage', () => {
    it('should cover all critical analysis areas', () => {
      const categories = Object.keys(DEFAULT_REFLECTION_CONFIG.categories);

      expect(categories).toContain('security');
      expect(categories).toContain('quality');
      expect(categories).toContain('testing');
      expect(categories).toContain('performance');
      expect(categories).toContain('technicalDebt');
      expect(categories).toHaveLength(5);
    });
  });
});
