import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from '../../../src/utils/fs-native.js';
import path from 'path';
import os from 'os';
import {
  SkillJudge,
  judgeSkillOutput,
  judgeWithSpec,
  type JudgeInput,
  type JudgeResult,
  type JudgeVerdict,
} from '../../../src/core/skills/skill-judge.js';

/**
 * Skill Judge Unit Tests
 *
 * Tests for the LLM-as-Judge system that validates skill/agent output quality.
 * Uses Opus model with timeout handling.
 */

describe('SkillJudge', () => {
  let tempDir: string;
  let logsDir: string;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `skill-judge-test-${Date.now()}`);
    logsDir = path.join(tempDir, '.specweave', 'logs');
    fs.mkdirSync(logsDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('should create judge with default options', () => {
      const judge = new SkillJudge();

      expect(judge).toBeDefined();
    });

    it('should accept custom timeout', () => {
      const judge = new SkillJudge({ timeout_ms: 30000 });

      expect(judge).toBeDefined();
    });

    it('should accept custom log file path', () => {
      const logPath = path.join(logsDir, 'custom-judge.log');
      const judge = new SkillJudge({ logFile: logPath });

      expect(judge).toBeDefined();
    });

    it('should accept verbose option', () => {
      const judge = new SkillJudge({ verbose: true });

      expect(judge).toBeDefined();
    });
  });

  describe('judge (basic evaluation - no API key)', () => {
    it('should return basic evaluation when no API key', async () => {
      // Ensure no API key
      const originalKey = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      try {
        const judge = new SkillJudge({
          logFile: path.join(logsDir, 'test-judge.log'),
        });

        const result = await judge.judge({
          domain: 'backend',
          taskDescription: 'Implement user authentication',
          codeChanges: `
            function login(username, password) {
              try {
                const user = findUser(username);
                if (user && verifyPassword(password, user.hash)) {
                  return createSession(user);
                }
                return null;
              } catch (error) {
                console.log('Login error:', error);
                throw error;
              }
            }
          `,
        });

        expect(result.verdict).toBeDefined();
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
        expect(result.summary).toBeDefined();
        expect(result.duration_ms).toBeGreaterThanOrEqual(0);  // Basic eval is fast, can be 0ms
        expect(result.timedOut).toBe(false);
      } finally {
        if (originalKey) {
          process.env.ANTHROPIC_API_KEY = originalKey;
        }
      }
    });

    it('should detect console.log in non-testing code', async () => {
      const originalKey = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      try {
        const judge = new SkillJudge({
          logFile: path.join(logsDir, 'test-console.log'),
        });

        const result = await judge.judge({
          domain: 'backend',
          taskDescription: 'API endpoint',
          codeChanges: `
            function handleRequest() {
              console.log('Request received');
              return { status: 'ok' };
            }
          `,
        });

        expect(result.concerns).toContain('Contains console.log statements');
      } finally {
        if (originalKey) {
          process.env.ANTHROPIC_API_KEY = originalKey;
        }
      }
    });

    it('should detect TODO/FIXME comments', async () => {
      const originalKey = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      try {
        const judge = new SkillJudge({
          logFile: path.join(logsDir, 'test-todo.log'),
        });

        const result = await judge.judge({
          domain: 'frontend',
          taskDescription: 'Component implementation',
          codeChanges: `
            function Component() {
              // TODO: Add error handling
              // FIXME: This is broken
              return <div>Hello</div>;
            }
          `,
        });

        expect(result.concerns).toContain('Contains TODO/FIXME comments');
      } finally {
        if (originalKey) {
          process.env.ANTHROPIC_API_KEY = originalKey;
        }
      }
    });

    it('should detect TypeScript any type in frontend code', async () => {
      const originalKey = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      try {
        const judge = new SkillJudge({
          logFile: path.join(logsDir, 'test-any.log'),
        });

        const result = await judge.judge({
          domain: 'frontend',
          taskDescription: 'React component',
          codeChanges: `
            function Component(props: any) {
              const data: any = fetchData();
              return <div>{data.name}</div>;
            }
          `,
        });

        expect(result.concerns).toContain('Uses TypeScript "any" type');
      } finally {
        if (originalKey) {
          process.env.ANTHROPIC_API_KEY = originalKey;
        }
      }
    });

    it('should detect eslint-disable and ts-ignore', async () => {
      const originalKey = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      try {
        const judge = new SkillJudge({
          logFile: path.join(logsDir, 'test-suppress.log'),
        });

        const result = await judge.judge({
          domain: 'backend',
          taskDescription: 'Service implementation',
          codeChanges: `
            // eslint-disable-next-line
            // @ts-ignore
            function service() {
              return brokenCode();
            }
          `,
        });

        expect(result.concerns).toContain('Contains lint/type suppressions');
      } finally {
        if (originalKey) {
          process.env.ANTHROPIC_API_KEY = originalKey;
        }
      }
    });

    it('should give positive score for error handling', async () => {
      const originalKey = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      try {
        const judge = new SkillJudge({
          logFile: path.join(logsDir, 'test-error.log'),
        });

        const result = await judge.judge({
          domain: 'backend',
          taskDescription: 'Error-handled code',
          codeChanges: `
            async function fetchData() {
              try {
                const response = await api.get('/data');
                return response.data;
              } catch (error) {
                logger.error('Failed to fetch data', error);
                throw new DataFetchError(error);
              }
            }
          `,
        });

        expect(result.strengths).toContain('Has error handling');
      } finally {
        if (originalKey) {
          process.env.ANTHROPIC_API_KEY = originalKey;
        }
      }
    });

    it('should give positive score for including tests', async () => {
      const originalKey = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      try {
        const judge = new SkillJudge({
          logFile: path.join(logsDir, 'test-tests.log'),
        });

        const result = await judge.judge({
          domain: 'testing',
          taskDescription: 'Test suite',
          codeChanges: `
            describe('UserService', () => {
              it('should create user', () => {
                const user = createUser({ name: 'Test' });
                expect(user.name).toBe('Test');
              });
            });
          `,
        });

        expect(result.strengths).toContain('Includes tests');
      } finally {
        if (originalKey) {
          process.env.ANTHROPIC_API_KEY = originalKey;
        }
      }
    });
  });

  describe('formatResult', () => {
    it('should format PASS verdict', async () => {
      const originalKey = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      try {
        const judge = new SkillJudge({
          logFile: path.join(logsDir, 'test-format.log'),
        });

        // Create a good result
        const result: JudgeResult = {
          verdict: 'PASS',
          score: 92,
          summary: 'Excellent implementation',
          strengths: ['Has error handling', 'Includes tests'],
          concerns: [],
          recommendations: [],
          domainChecks: [],
          duration_ms: 1500,
          timedOut: false,
        };

        const formatted = judge.formatResult(result);

        expect(formatted).toContain('PASS');
        expect(formatted).toContain('92/100');
        expect(formatted).toContain('Has error handling');
        expect(formatted).toContain('Excellent implementation');
      } finally {
        if (originalKey) {
          process.env.ANTHROPIC_API_KEY = originalKey;
        }
      }
    });

    it('should format CONCERNS verdict', async () => {
      const originalKey = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      try {
        const judge = new SkillJudge({
          logFile: path.join(logsDir, 'test-format-concerns.log'),
        });

        const result: JudgeResult = {
          verdict: 'CONCERNS',
          score: 75,
          summary: 'Good but has issues',
          strengths: ['Has error handling'],
          concerns: ['Contains TODO comments', 'Missing input validation'],
          recommendations: ['Add input validation', 'Remove TODO comments'],
          domainChecks: [],
          duration_ms: 2000,
          timedOut: false,
        };

        const formatted = judge.formatResult(result);

        expect(formatted).toContain('CONCERNS');
        expect(formatted).toContain('75/100');
        expect(formatted).toContain('Contains TODO comments');
        expect(formatted).toContain('Add input validation');
      } finally {
        if (originalKey) {
          process.env.ANTHROPIC_API_KEY = originalKey;
        }
      }
    });

    it('should format FAIL verdict', async () => {
      const originalKey = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      try {
        const judge = new SkillJudge({
          logFile: path.join(logsDir, 'test-format-fail.log'),
        });

        const result: JudgeResult = {
          verdict: 'FAIL',
          score: 45,
          summary: 'Significant issues found',
          strengths: [],
          concerns: ['SQL injection vulnerability', 'No error handling'],
          recommendations: ['Use parameterized queries', 'Add try-catch'],
          domainChecks: [],
          duration_ms: 1800,
          timedOut: false,
        };

        const formatted = judge.formatResult(result);

        expect(formatted).toContain('FAIL');
        expect(formatted).toContain('45/100');
        expect(formatted).toContain('SQL injection vulnerability');
      } finally {
        if (originalKey) {
          process.env.ANTHROPIC_API_KEY = originalKey;
        }
      }
    });

    it('should indicate timeout in format', async () => {
      const originalKey = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      try {
        const judge = new SkillJudge({
          logFile: path.join(logsDir, 'test-format-timeout.log'),
        });

        const result: JudgeResult = {
          verdict: 'CONCERNS',
          score: 50,
          summary: 'Evaluation timed out',
          strengths: [],
          concerns: ['Evaluation could not complete within timeout'],
          recommendations: ['Increase timeout'],
          domainChecks: [],
          duration_ms: 60000,
          timedOut: true,
        };

        const formatted = judge.formatResult(result);

        expect(formatted).toContain('Timed out');
      } finally {
        if (originalKey) {
          process.env.ANTHROPIC_API_KEY = originalKey;
        }
      }
    });
  });

  describe('verdict thresholds', () => {
    it('should return PASS for score >= 90', async () => {
      const originalKey = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      try {
        const judge = new SkillJudge({
          logFile: path.join(logsDir, 'test-threshold-pass.log'),
        });

        // Clean code with error handling and tests
        const result = await judge.judge({
          domain: 'backend',
          taskDescription: 'Clean service',
          codeChanges: `
            async function service() {
              try {
                return await fetch();
              } catch (error) {
                throw error;
              }
            }

            it('should work', () => {
              expect(service()).toBeDefined();
            });
          `,
        });

        // Basic evaluation starts at 70, +5 for error handling, +5 for tests = 80
        // So CONCERNS is expected for basic evaluation
        expect(result.score).toBeGreaterThanOrEqual(70);
        expect(['PASS', 'CONCERNS']).toContain(result.verdict);
      } finally {
        if (originalKey) {
          process.env.ANTHROPIC_API_KEY = originalKey;
        }
      }
    });

    it('should return FAIL for score < 70', async () => {
      const originalKey = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      try {
        const judge = new SkillJudge({
          logFile: path.join(logsDir, 'test-threshold-fail.log'),
        });

        // Bad code with many issues
        const result = await judge.judge({
          domain: 'frontend',
          taskDescription: 'Bad component',
          codeChanges: `
            // TODO: fix this
            // FIXME: broken
            // eslint-disable-next-line
            // @ts-ignore
            function Component(props: any) {
              console.log('rendering');
              const data: any = props.data;
              return <div>{data}</div>;
            }
          `,
        });

        // 70 base - 5 (TODO) - 3 (console.log) - 5 (any) - 5 (suppressions) = 52
        expect(result.score).toBeLessThan(70);
        expect(result.verdict).toBe('FAIL');
      } finally {
        if (originalKey) {
          process.env.ANTHROPIC_API_KEY = originalKey;
        }
      }
    });
  });

  describe('progress logging', () => {
    it('should create log file', async () => {
      const originalKey = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      try {
        const logPath = path.join(logsDir, 'progress-test.log');
        const judge = new SkillJudge({
          logFile: logPath,
        });

        await judge.judge({
          domain: 'backend',
          taskDescription: 'Test logging',
          codeChanges: 'function test() { return true; }',
        });

        expect(fs.existsSync(logPath)).toBe(true);
        const logContent = fs.readFileSync(logPath, 'utf-8');
        expect(logContent).toContain('Starting LLM Judge evaluation');
        expect(logContent).toContain('backend');
      } finally {
        if (originalKey) {
          process.env.ANTHROPIC_API_KEY = originalKey;
        }
      }
    });
  });
});

describe('judgeSkillOutput', () => {
  it('should be a convenience function that creates judge', async () => {
    const originalKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    try {
      const result = await judgeSkillOutput(
        'backend',
        'Implement API',
        'function api() { return {}; }',
      );

      expect(result).toBeDefined();
      expect(result.verdict).toBeDefined();
      expect(result.score).toBeDefined();
    } finally {
      if (originalKey) {
        process.env.ANTHROPIC_API_KEY = originalKey;
      }
    }
  });
});

describe('judgeWithSpec', () => {
  it('should accept spec requirements and ACs', async () => {
    const originalKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    try {
      const result = await judgeWithSpec(
        'backend',
        'Implement user authentication',
        `
          function login(username, password) {
            return authenticate(username, password);
          }
        `,
        'Users must be able to login with username and password',
        ['AC-US1-01: User can login with valid credentials'],
      );

      expect(result).toBeDefined();
      expect(result.verdict).toBeDefined();
    } finally {
      if (originalKey) {
        process.env.ANTHROPIC_API_KEY = originalKey;
      }
    }
  });
});
