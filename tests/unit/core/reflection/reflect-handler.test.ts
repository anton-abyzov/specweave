/**
 * Tests for Reflect Handler (v2.0 Simplified)
 *
 * @module tests/unit/core/reflection/reflect-handler
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  readReflectConfig,
  handleReflectStop,
  formatReflectResult,
  migrateOldMemoryFiles,
  DEFAULT_REFLECT_CONFIG,
  type ReflectResult,
} from '../../../../src/core/reflection/reflect-handler.js';

// Mock the claude-cli-runner module
vi.mock('../../../../src/utils/claude-cli-runner.js', () => ({
  runClaudeCli: vi.fn(),
  parseJsonFromOutput: vi.fn(),
}));

// Mock logger to reduce noise
vi.mock('../../../../src/utils/logger.js', () => ({
  consoleLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('reflect-handler', () => {
  let tmpDir: string;
  let projectRoot: string;

  beforeEach(() => {
    // Create temp project structure
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reflect-test-'));
    projectRoot = path.join(tmpDir, 'project');
    fs.mkdirSync(path.join(projectRoot, '.specweave'), { recursive: true });
  });

  afterEach(() => {
    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  describe('readReflectConfig', () => {
    it('returns defaults when no config file exists', () => {
      const config = readReflectConfig(projectRoot);

      expect(config).toEqual(DEFAULT_REFLECT_CONFIG);
      expect(config.enabled).toBe(true);
      expect(config.model).toBe('haiku');
      expect(config.maxLearningsPerSession).toBe(3);
    });

    it('reads enabled=false from config', () => {
      const configPath = path.join(projectRoot, '.specweave', 'config.json');
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          project: { name: 'test' },
          reflect: { enabled: false },
        })
      );

      const config = readReflectConfig(projectRoot);

      expect(config.enabled).toBe(false);
    });

    it('reads custom model from config', () => {
      const configPath = path.join(projectRoot, '.specweave', 'config.json');
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          project: { name: 'test' },
          reflect: { model: 'sonnet' },
        })
      );

      const config = readReflectConfig(projectRoot);

      expect(config.model).toBe('sonnet');
    });

    it('reads maxLearningsPerSession from config', () => {
      const configPath = path.join(projectRoot, '.specweave', 'config.json');
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          project: { name: 'test' },
          reflect: { maxLearningsPerSession: 5 },
        })
      );

      const config = readReflectConfig(projectRoot);

      expect(config.maxLearningsPerSession).toBe(5);
    });

    it('ignores invalid model values', () => {
      const configPath = path.join(projectRoot, '.specweave', 'config.json');
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          project: { name: 'test' },
          reflect: { model: 'invalid-model' },
        })
      );

      const config = readReflectConfig(projectRoot);

      expect(config.model).toBe('haiku'); // Default
    });

    it('handles invalid JSON gracefully', () => {
      const configPath = path.join(projectRoot, '.specweave', 'config.json');
      fs.writeFileSync(configPath, 'not valid json');

      const config = readReflectConfig(projectRoot);

      expect(config).toEqual(DEFAULT_REFLECT_CONFIG);
    });
  });

  describe('handleReflectStop', () => {
    it('returns early when reflection is disabled', async () => {
      // Write config with reflect disabled
      const configPath = path.join(projectRoot, '.specweave', 'config.json');
      fs.writeFileSync(
        configPath,
        JSON.stringify({ reflect: { enabled: false } })
      );

      const result = await handleReflectStop('/some/transcript.txt', projectRoot);

      expect(result.ran).toBe(false);
      expect(result.reason).toBe('Reflection disabled in config');
    });

    it('returns early when transcript does not exist', async () => {
      const result = await handleReflectStop('/nonexistent/transcript.txt', projectRoot);

      expect(result.ran).toBe(false);
      expect(result.reason).toContain('Transcript not found');
    });

    it('returns early when transcript is too short', async () => {
      const transcriptPath = path.join(tmpDir, 'short.txt');
      fs.writeFileSync(transcriptPath, 'Short');

      const result = await handleReflectStop(transcriptPath, projectRoot);

      expect(result.ran).toBe(false);
      expect(result.reason).toBe('Transcript too short (< 100 chars)');
    });

    it('returns early when CLAUDE.md is not found', async () => {
      // Create transcript
      const transcriptPath = path.join(tmpDir, 'transcript.txt');
      fs.writeFileSync(transcriptPath, 'A'.repeat(200));

      const result = await handleReflectStop(transcriptPath, projectRoot);

      expect(result.ran).toBe(false);
      expect(result.reason).toBe('CLAUDE.md not found in project');
    });
  });

  describe('formatReflectResult', () => {
    it('formats skipped result', () => {
      const result: ReflectResult = {
        ran: false,
        reason: 'Test skip reason',
        inputSummary: { transcriptLines: 0 },
        extracted: { skillLearnings: [] },
        written: { learningsAdded: 0, learningsSkippedDuplicate: 0 },
        durationMs: 10,
      };

      const formatted = formatReflectResult(result);

      expect(formatted).toContain('REFLECT STOP HOOK');
      expect(formatted).toContain('Skipped: Test skip reason');
      expect(formatted).toContain('10ms');
    });

    it('formats successful result with learnings', () => {
      const result: ReflectResult = {
        ran: true,
        model: 'haiku',
        inputSummary: { transcriptLines: 100 },
        extracted: {
          skillLearnings: [
            { skill: 'mobile', learning: 'Use expo on port 8081' },
            { skill: 'frontend', learning: 'Prefer Vercel' },
          ],
        },
        written: {
          learningsAdded: 2,
          learningsSkippedDuplicate: 0,
          claudeMdPath: '/path/to/CLAUDE.md',
        },
        durationMs: 1500,
      };

      const formatted = formatReflectResult(result);

      expect(formatted).toContain('REFLECT STOP HOOK');
      expect(formatted).toContain('100 lines');
      expect(formatted).toContain('haiku');
      expect(formatted).toContain('[mobile] Use expo on port 8081');
      expect(formatted).toContain('[frontend] Prefer Vercel');
      expect(formatted).toContain('Added: 2 learning(s)');
      expect(formatted).toContain('1500ms');
    });

    it('formats result with duplicates skipped', () => {
      const result: ReflectResult = {
        ran: true,
        model: 'haiku',
        inputSummary: { transcriptLines: 50 },
        extracted: {
          skillLearnings: [{ skill: 'general', learning: 'Test learning' }],
        },
        written: {
          learningsAdded: 0,
          learningsSkippedDuplicate: 1,
          claudeMdPath: '/path/to/CLAUDE.md',
        },
        durationMs: 500,
      };

      const formatted = formatReflectResult(result);

      expect(formatted).toContain('Nothing new to add');
      expect(formatted).toContain('Skipped: 1 duplicate(s)');
    });
  });

  describe('migrateOldMemoryFiles', () => {
    it('returns empty result when CLAUDE.md is not found', () => {
      const result = migrateOldMemoryFiles(projectRoot);

      expect(result.migrated).toBe(0);
      expect(result.deleted).toHaveLength(0);
    });

    it('returns empty result when no memory directory exists', () => {
      // Create CLAUDE.md
      fs.writeFileSync(path.join(projectRoot, 'CLAUDE.md'), '# Project\n');

      const result = migrateOldMemoryFiles(projectRoot);

      expect(result.migrated).toBe(0);
      expect(result.deleted).toHaveLength(0);
    });

    it('migrates learnings from old memory files', () => {
      // Create CLAUDE.md with empty Skill Memories section
      fs.writeFileSync(
        path.join(projectRoot, 'CLAUDE.md'),
        '# Project\n\n## Skill Memories\n\n<!-- Auto-captured -->\n\n## Other Section\n'
      );

      // Create old memory directory with a memory file
      const memoryDir = path.join(projectRoot, '.specweave', 'memory');
      fs.mkdirSync(memoryDir, { recursive: true });

      fs.writeFileSync(
        path.join(memoryDir, 'mobile.md'),
        `# Mobile Skill Memory

#### LRN-12345678-abcd (High Confidence)
**Learning**: Use expo on port 8081 for local testing
**Signal**: User correction
**Context**: Testing setup
`
      );

      const result = migrateOldMemoryFiles(projectRoot);

      expect(result.migrated).toBe(1);
      expect(result.deleted).toHaveLength(1);
      expect(result.deleted[0]).toContain('mobile.md');

      // Verify CLAUDE.md was updated
      const claudeMd = fs.readFileSync(path.join(projectRoot, 'CLAUDE.md'), 'utf-8');
      expect(claudeMd).toContain('### Mobile');
      expect(claudeMd).toContain('Use expo on port 8081 for local testing');
    });

    it('handles multiple memory files', () => {
      // Create CLAUDE.md
      fs.writeFileSync(path.join(projectRoot, 'CLAUDE.md'), '# Project\n');

      // Create memory files
      const memoryDir = path.join(projectRoot, '.specweave', 'memory');
      fs.mkdirSync(memoryDir, { recursive: true });

      fs.writeFileSync(
        path.join(memoryDir, 'mobile.md'),
        '**Learning**: Mobile learning 1\n'
      );
      fs.writeFileSync(
        path.join(memoryDir, 'frontend.md'),
        '**Learning**: Frontend learning 1\n'
      );

      const result = migrateOldMemoryFiles(projectRoot);

      expect(result.migrated).toBe(2);
      expect(result.deleted).toHaveLength(2);
    });

    it('removes empty memory directory after migration', () => {
      // Create CLAUDE.md
      fs.writeFileSync(path.join(projectRoot, 'CLAUDE.md'), '# Project\n');

      // Create memory file
      const memoryDir = path.join(projectRoot, '.specweave', 'memory');
      fs.mkdirSync(memoryDir, { recursive: true });
      fs.writeFileSync(
        path.join(memoryDir, 'general.md'),
        '**Learning**: Some learning\n'
      );

      migrateOldMemoryFiles(projectRoot);

      // Verify memory directory was removed
      expect(fs.existsSync(memoryDir)).toBe(false);
    });

    it('ALWAYS removes memory directory even WITHOUT CLAUDE.md (generic cleanup)', () => {
      // NO CLAUDE.md - this is the edge case
      // The deprecated directory should STILL be removed

      const memoryDir = path.join(projectRoot, '.specweave', 'memory');
      fs.mkdirSync(memoryDir, { recursive: true });
      fs.writeFileSync(
        path.join(memoryDir, 'general.md'),
        '- → All tests pass locally\n- → Run tests on localhost\n'
      );
      fs.writeFileSync(
        path.join(memoryDir, 'testing.md'),
        '# Testing Rules\n> Project-specific patterns\n'
      );

      const result = migrateOldMemoryFiles(projectRoot);

      // Even without CLAUDE.md, the deprecated directory should be GONE
      expect(fs.existsSync(memoryDir)).toBe(false);
      // Files should be marked as deleted
      expect(result.deleted.length).toBeGreaterThan(0);
    });

    it('removes memory directory with non-standard files', () => {
      // Create CLAUDE.md
      fs.writeFileSync(path.join(projectRoot, 'CLAUDE.md'), '# Project\n');

      // Create memory directory with mixed files (md and non-md)
      const memoryDir = path.join(projectRoot, '.specweave', 'memory');
      fs.mkdirSync(memoryDir, { recursive: true });
      fs.writeFileSync(path.join(memoryDir, 'general.md'), 'content');
      fs.writeFileSync(path.join(memoryDir, 'cache.json'), '{}'); // Non-md file
      fs.writeFileSync(path.join(memoryDir, '.DS_Store'), ''); // Hidden file

      migrateOldMemoryFiles(projectRoot);

      // ALL files and directory should be removed
      expect(fs.existsSync(memoryDir)).toBe(false);
    });
  });
});
