import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit tests for Reflection Prompt Builder
 */

import {
  buildReflectionPrompt,
  estimatePromptTokens,
  truncateModifiedFiles,
  buildSimplifiedPrompt
} from '../../../src/hooks/lib/reflection-prompt-builder.js';
import {
  DEFAULT_REFLECTION_CONFIG,
  ReflectionDepth,
  ReflectionModel,
  IssueSeverity,
  GitDiffInfo
} from '../../../src/hooks/lib/types/reflection-types.js';

describe('Reflection Prompt Builder', () => {
  const mockModifiedFiles: GitDiffInfo[] = [
    {
      file: 'src/utils/auth.ts',
      linesAdded: 15,
      linesRemoved: 5,
      content: `@@ -10,5 +10,15 @@
+const hashPassword = (password: string) => {
+  return bcrypt.hash(password, 10);
+};
+
+export function authenticateUser(email: string, password: string) {
+  const user = findUser(email);
+  if (!user) return null;
+  return comparePassword(password, user.passwordHash);
+}`
    },
    {
      file: 'src/services/user-service.ts',
      linesAdded: 8,
      linesRemoved: 2,
      content: `@@ -20,2 +20,8 @@
+export function createUser(data: UserData) {
+  const hashedPassword = hashPassword(data.password);
+  return db.insert('users', { ...data, passwordHash: hashedPassword });
+}`
    }
  ];

  describe('buildReflectionPrompt', () => {
    it('should build basic prompt with required sections', () => {
      const prompt = buildReflectionPrompt({
        taskId: 'T-001',
        taskName: 'Implement user authentication',
        modifiedFiles: mockModifiedFiles,
        config: DEFAULT_REFLECTION_CONFIG
      });

      // Check required sections
      expect(prompt).toContain('# Self-Reflection Request');
      expect(prompt).toContain('## Task Information');
      expect(prompt).toContain('**Task ID**: T-001');
      expect(prompt).toContain('**Task Name**: Implement user authentication');
      expect(prompt).toContain('## Modified Files Context');
      expect(prompt).toContain('## Analysis Request');
    });

    it('should include file statistics', () => {
      const prompt = buildReflectionPrompt({
        taskId: 'T-001',
        modifiedFiles: mockModifiedFiles,
        config: DEFAULT_REFLECTION_CONFIG
      });

      expect(prompt).toContain('**Files Changed**: 2');
      expect(prompt).toContain('**Lines Added**: +23');
      expect(prompt).toContain('**Lines Removed**: -7');
      expect(prompt).toContain('`src/utils/auth.ts`: +15 -5');
      expect(prompt).toContain('`src/services/user-service.ts`: +8 -2');
    });

    it('should include increment context when provided', () => {
      const prompt = buildReflectionPrompt({
        taskId: 'T-001',
        modifiedFiles: mockModifiedFiles,
        config: DEFAULT_REFLECTION_CONFIG,
        incrementId: '0016-self-reflection-system'
      });

      expect(prompt).toContain('**Increment**: 0016-self-reflection-system');
    });

    it('should include full diff when requested', () => {
      const prompt = buildReflectionPrompt({
        taskId: 'T-001',
        modifiedFiles: mockModifiedFiles,
        config: DEFAULT_REFLECTION_CONFIG,
        includeFullDiff: true
      });

      expect(prompt).toContain('### Detailed Changes');
      expect(prompt).toContain('```diff');
      expect(prompt).toContain('const hashPassword = (password: string)');
      expect(prompt).toContain('export function createUser(data: UserData)');
    });

    it('should not include full diff by default', () => {
      const prompt = buildReflectionPrompt({
        taskId: 'T-001',
        modifiedFiles: mockModifiedFiles,
        config: DEFAULT_REFLECTION_CONFIG
      });

      expect(prompt).not.toContain('### Detailed Changes');
      expect(prompt).not.toContain('```diff');
    });

    it('should adapt analysis mode based on depth', () => {
      const quickPrompt = buildReflectionPrompt({
        taskId: 'T-001',
        modifiedFiles: mockModifiedFiles,
        config: {
          ...DEFAULT_REFLECTION_CONFIG,
          depth: ReflectionDepth.QUICK
        }
      });

      expect(quickPrompt).toContain('**Analysis Mode**: QUICK (<15s)');
      expect(quickPrompt).toContain('Focus on CRITICAL and HIGH severity issues only');
      expect(quickPrompt).not.toContain('4. 📚 Lessons Learned');

      const deepPrompt = buildReflectionPrompt({
        taskId: 'T-001',
        modifiedFiles: mockModifiedFiles,
        config: {
          ...DEFAULT_REFLECTION_CONFIG,
          depth: ReflectionDepth.DEEP
        }
      });

      expect(deepPrompt).toContain('**Analysis Mode**: DEEP (<60s)');
      expect(deepPrompt).toContain('Include architectural recommendations');
      expect(deepPrompt).toContain('4. 📚 Lessons Learned');
    });

    it('should list enabled analysis categories', () => {
      const prompt = buildReflectionPrompt({
        taskId: 'T-001',
        modifiedFiles: mockModifiedFiles,
        config: {
          ...DEFAULT_REFLECTION_CONFIG,
          categories: {
            security: true,
            quality: false,
            testing: true,
            performance: false,
            technicalDebt: false
          }
        }
      });

      expect(prompt).toContain('✅ **Security**');
      expect(prompt).toContain('✅ **Testing**');
      expect(prompt).not.toContain('✅ **Quality**');
      expect(prompt).not.toContain('✅ **Performance**');
      expect(prompt).not.toContain('✅ **Technical Debt**');
    });

    it('should include severity threshold', () => {
      const prompt = buildReflectionPrompt({
        taskId: 'T-001',
        modifiedFiles: mockModifiedFiles,
        config: {
          ...DEFAULT_REFLECTION_CONFIG,
          criticalThreshold: IssueSeverity.HIGH
        }
      });

      expect(prompt).toContain('**Severity Threshold**: Flag issues with severity >= HIGH');
    });

    it('should include critical requirements', () => {
      const prompt = buildReflectionPrompt({
        taskId: 'T-001',
        modifiedFiles: mockModifiedFiles,
        config: DEFAULT_REFLECTION_CONFIG
      });

      expect(prompt).toContain('**Critical Requirements**:');
      expect(prompt).toContain('Be SPECIFIC: Always include file paths and line numbers');
      expect(prompt).toContain('Be CONSTRUCTIVE: Provide code examples for fixes');
      expect(prompt).toContain('Be ACTIONABLE: Every issue should have a clear next step');
    });

    it('should handle empty modified files', () => {
      const prompt = buildReflectionPrompt({
        taskId: 'T-001',
        modifiedFiles: [],
        config: DEFAULT_REFLECTION_CONFIG
      });

      expect(prompt).toContain('**Files Changed**: 0');
      expect(prompt).toContain('**Lines Added**: +0');
      expect(prompt).toContain('**Lines Removed**: -0');
    });

    it('should truncate very large diffs', () => {
      const largeFile: GitDiffInfo = {
        file: 'large-file.ts',
        linesAdded: 500,
        linesRemoved: 300,
        content: Array(150).fill('+ line of code').join('\n')
      };

      const prompt = buildReflectionPrompt({
        taskId: 'T-001',
        modifiedFiles: [largeFile],
        config: DEFAULT_REFLECTION_CONFIG,
        includeFullDiff: true
      });

      expect(prompt).toContain('```diff');
      expect(prompt).toContain('... (diff truncated)');
    });
  });

  describe('estimatePromptTokens', () => {
    it('should estimate token count', () => {
      const prompt = 'This is a test prompt with approximately 100 characters that should estimate to around 25 tokens';
      const tokens = estimatePromptTokens(prompt);

      expect(tokens).toBeGreaterThan(20);
      expect(tokens).toBeLessThan(35);
    });

    it('should handle empty prompt', () => {
      const tokens = estimatePromptTokens('');
      expect(tokens).toBe(0);
    });

    it('should estimate longer prompts', () => {
      const prompt = buildReflectionPrompt({
        taskId: 'T-001',
        modifiedFiles: mockModifiedFiles,
        config: DEFAULT_REFLECTION_CONFIG,
        includeFullDiff: true
      });

      const tokens = estimatePromptTokens(prompt);
      expect(tokens).toBeGreaterThan(100);
    });
  });

  describe('truncateModifiedFiles', () => {
    it('should not truncate small file sets', () => {
      const truncated = truncateModifiedFiles(mockModifiedFiles, 10000);
      expect(truncated).toHaveLength(2);
      expect(truncated).toEqual(mockModifiedFiles);
    });

    it('should truncate when exceeding token budget', () => {
      const largeFiles: GitDiffInfo[] = Array(20).fill(null).map((_, i) => ({
        file: `file${i}.ts`,
        linesAdded: 100,
        linesRemoved: 50,
        content: Array(500).fill(`+ line ${i}`).join('\n')
      }));

      const truncated = truncateModifiedFiles(largeFiles, 2000);

      expect(truncated.length).toBeLessThan(largeFiles.length);
      expect(truncated.length).toBeGreaterThan(0);
    });

    it('should truncate individual files when necessary', () => {
      const veryLargeFile: GitDiffInfo = {
        file: 'huge-file.ts',
        linesAdded: 1000,
        linesRemoved: 500,
        content: Array(1000).fill('+ code line').join('\n')
      };

      const truncated = truncateModifiedFiles([veryLargeFile, ...mockModifiedFiles], 3000);

      expect(truncated.length).toBeGreaterThan(0);
      const firstFile = truncated[0];
      if (firstFile.file === 'huge-file.ts') {
        expect(firstFile.content).toContain('(diff truncated)');
      }
    });

    it('should preserve file metadata when truncating', () => {
      const truncated = truncateModifiedFiles(mockModifiedFiles, 100);

      for (const file of truncated) {
        expect(file.file).toBeDefined();
        expect(file.linesAdded).toBeDefined();
        expect(file.linesRemoved).toBeDefined();
      }
    });
  });

  describe('buildSimplifiedPrompt', () => {
    it('should build prompt without full diff', () => {
      const prompt = buildSimplifiedPrompt({
        taskId: 'T-001',
        taskName: 'Implement authentication',
        modifiedFiles: mockModifiedFiles,
        config: DEFAULT_REFLECTION_CONFIG
      });

      expect(prompt).toContain('# Self-Reflection Request');
      expect(prompt).toContain('**Files Changed**: 2');
      expect(prompt).not.toContain('### Detailed Changes');
      expect(prompt).not.toContain('```diff');
    });

    it('should include file summary', () => {
      const prompt = buildSimplifiedPrompt({
        taskId: 'T-001',
        modifiedFiles: mockModifiedFiles,
        config: DEFAULT_REFLECTION_CONFIG
      });

      expect(prompt).toContain('### File Summary');
      expect(prompt).toContain('`src/utils/auth.ts`: +15 -5');
      expect(prompt).toContain('`src/services/user-service.ts`: +8 -2');
    });

    it('should be significantly shorter than full prompt', () => {
      const fullPrompt = buildReflectionPrompt({
        taskId: 'T-001',
        modifiedFiles: mockModifiedFiles,
        config: DEFAULT_REFLECTION_CONFIG,
        includeFullDiff: true
      });

      const simplifiedPrompt = buildSimplifiedPrompt({
        taskId: 'T-001',
        modifiedFiles: mockModifiedFiles,
        config: DEFAULT_REFLECTION_CONFIG
      });

      expect(simplifiedPrompt.length).toBeLessThan(fullPrompt.length / 2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle task without name', () => {
      const prompt = buildReflectionPrompt({
        taskId: 'T-001',
        modifiedFiles: mockModifiedFiles,
        config: DEFAULT_REFLECTION_CONFIG
      });

      expect(prompt).toContain('**Task ID**: T-001');
      expect(prompt).not.toContain('**Task Name**:');
    });

    it('should handle all categories disabled', () => {
      const prompt = buildReflectionPrompt({
        taskId: 'T-001',
        modifiedFiles: mockModifiedFiles,
        config: {
          ...DEFAULT_REFLECTION_CONFIG,
          categories: {
            security: false,
            quality: false,
            testing: false,
            performance: false,
            technicalDebt: false
          }
        }
      });

      expect(prompt).toContain('**Enabled Analysis Categories**:');
      expect(prompt).not.toContain('✅');
    });

    it('should handle files with special characters in names', () => {
      const specialFiles: GitDiffInfo[] = [
        {
          file: 'file with spaces.ts',
          linesAdded: 5,
          linesRemoved: 2,
          content: '+ code'
        },
        {
          file: 'file-with-dashes.ts',
          linesAdded: 3,
          linesRemoved: 1,
          content: '+ code'
        }
      ];

      const prompt = buildReflectionPrompt({
        taskId: 'T-001',
        modifiedFiles: specialFiles,
        config: DEFAULT_REFLECTION_CONFIG
      });

      expect(prompt).toContain('`file with spaces.ts`');
      expect(prompt).toContain('`file-with-dashes.ts`');
    });
  });
});
