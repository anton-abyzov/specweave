import { describe, it, expect, vi } from 'vitest';
import {
  sanitizeCommandOutput,
  sanitizedExec,
  isSensitiveCommand,
  sanitizeCommand,
  displayEnvironment,
} from '../../../src/utils/bash-sanitizer.js';

describe('bash-sanitizer', () => {
  describe('sanitizeCommandOutput', () => {
    it('should sanitize grep output with credentials', () => {
      const output = 'GITHUB_TOKEN=ghp_1234567890abcdef';
      const command = 'grep GITHUB_TOKEN .env';
      const sanitized = sanitizeCommandOutput(output, command);

      expect(sanitized).toContain('GITHUB_TOKEN=');
      expect(sanitized).not.toContain('1234567890abcdef');
      expect(sanitized).toContain('*');
    });

    it('should sanitize output even without command context', () => {
      const output = 'JIRA_API_TOKEN=ATAT123456789';
      const sanitized = sanitizeCommandOutput(output);

      expect(sanitized).toContain('JIRA_API_TOKEN=');
      expect(sanitized).not.toContain('ATAT123456789');
    });

    it('should handle empty output', () => {
      expect(sanitizeCommandOutput('')).toBe('');
      expect(sanitizeCommandOutput('', 'some command')).toBe('');
    });

    it('should preserve non-sensitive output', () => {
      const output = 'Hello World\nThis is a test';
      const sanitized = sanitizeCommandOutput(output, 'echo test');

      expect(sanitized).toBe(output);
    });
  });

  describe('sanitizedExec', () => {
    it('should sanitize string results', async () => {
      const executor = async () => 'GITHUB_TOKEN=ghp_123456';
      const result = await sanitizedExec(executor, 'grep GITHUB_TOKEN .env');

      expect(result).toContain('GITHUB_TOKEN=');
      expect(result).not.toContain('ghp_123456');
    });

    it('should sanitize stdout in result objects', async () => {
      const executor = async () => ({
        stdout: 'GITHUB_TOKEN=ghp_123456',
        stderr: '',
        exitCode: 0
      });

      const result = await sanitizedExec(executor, 'grep GITHUB_TOKEN .env');

      expect(result.stdout).toContain('GITHUB_TOKEN=');
      expect(result.stdout).not.toContain('ghp_123456');
      expect(result.stderr).toBe('');
      expect(result.exitCode).toBe(0);
    });

    it('should sanitize stderr in result objects', async () => {
      const executor = async () => ({
        stdout: '',
        stderr: 'Error: GITHUB_TOKEN=ghp_secret123456',
        exitCode: 1
      });

      const result = await sanitizedExec(executor, 'some command');

      expect(result.stderr).toContain('GITHUB_TOKEN=');
      expect(result.stderr).not.toContain('secret123456');
      expect(result.exitCode).toBe(1);
    });

    it('should sanitize errors', async () => {
      const error = new Error('Failed with GITHUB_TOKEN=ghp_secret123456');
      const executor = async () => {
        throw error;
      };

      await expect(
        sanitizedExec(executor, 'test command')
      ).rejects.toThrow();

      // Error message should be sanitized
      try {
        await sanitizedExec(executor, 'test command');
      } catch (err: any) {
        expect(err.message).toContain('GITHUB_TOKEN=');
        expect(err.message).not.toContain('secret123456');
      }
    });

    it('should handle non-string results', async () => {
      const executor = async () => 42;
      const result = await sanitizedExec(executor, 'some command');

      expect(result).toBe(42);
    });
  });

  describe('isSensitiveCommand', () => {
    it('should detect grep commands for credentials', () => {
      expect(isSensitiveCommand('grep GITHUB_TOKEN .env')).toBe(true);
      expect(isSensitiveCommand('grep -E "PASSWORD" config.json')).toBe(true);
      expect(isSensitiveCommand('grep SECRET file.txt')).toBe(true);
      expect(isSensitiveCommand('grep API_KEY .env')).toBe(true);
    });

    it('should detect cat commands for .env files', () => {
      expect(isSensitiveCommand('cat .env')).toBe(true);
      expect(isSensitiveCommand('cat /path/to/.env')).toBe(true);
    });

    it('should detect echo commands with credentials', () => {
      expect(isSensitiveCommand('echo $GITHUB_TOKEN')).toBe(true);
      expect(isSensitiveCommand('echo ${PASSWORD}')).toBe(true);
    });

    it('should detect env listing commands', () => {
      expect(isSensitiveCommand('printenv')).toBe(true);
      expect(isSensitiveCommand('env | grep TOKEN')).toBe(true);
    });

    it('should detect export commands', () => {
      expect(isSensitiveCommand('export GITHUB_TOKEN=abc123')).toBe(true);
      expect(isSensitiveCommand('export PASSWORD=secret')).toBe(true);
    });

    it('should not flag safe commands', () => {
      expect(isSensitiveCommand('ls -la')).toBe(false);
      expect(isSensitiveCommand('npm install')).toBe(false);
      expect(isSensitiveCommand('git status')).toBe(false);
      expect(isSensitiveCommand('grep pattern file.txt')).toBe(false);
    });

    it('should handle empty input', () => {
      expect(isSensitiveCommand('')).toBe(false);
      expect(isSensitiveCommand(null as any)).toBe(false);
    });
  });

  describe('sanitizeCommand', () => {
    it('should mask credentials in export commands', () => {
      const command = 'export GITHUB_TOKEN=ghp_123456';
      const sanitized = sanitizeCommand(command);

      expect(sanitized).toContain('export GITHUB_TOKEN=');
      expect(sanitized).not.toContain('ghp_123456');
    });

    it('should mask credentials in echo commands', () => {
      const command = 'echo "GITHUB_TOKEN=ghp_test_123456789"';
      const sanitized = sanitizeCommand(command);

      expect(sanitized).toContain('GITHUB_TOKEN=');
      expect(sanitized).not.toContain('test_123456789');
    });

    it('should preserve safe commands', () => {
      const command = 'npm test';
      const sanitized = sanitizeCommand(command);

      expect(sanitized).toBe(command);
    });

    it('should handle empty input', () => {
      expect(sanitizeCommand('')).toBe('');
    });
  });

  describe('displayEnvironment', () => {
    it('should format environment with masked credentials', () => {
      const env = {
        GITHUB_TOKEN: 'ghp_123456',
        NODE_ENV: 'production',
        JIRA_API_TOKEN: 'ATAT123'
      };

      const display = displayEnvironment(env);

      expect(display).toContain('GITHUB_TOKEN=');
      expect(display).toContain('NODE_ENV=production');
      expect(display).toContain('JIRA_API_TOKEN=');
      expect(display).not.toContain('ghp_123456');
      expect(display).not.toContain('ATAT123');
      expect(display.split('\n').length).toBe(3);
    });

    it('should skip empty values', () => {
      const env = {
        EMPTY: '',
        NOT_EMPTY: 'value'
      };

      const display = displayEnvironment(env);

      // Empty values are skipped (no line for EMPTY)
      const lines = display.split('\n').filter(l => l.trim());
      expect(lines.length).toBe(1);
      expect(display).toContain('NOT_EMPTY=value');
    });

    it('should handle process.env by default', () => {
      const display = displayEnvironment();

      // Just check it returns a string without crashing
      expect(typeof display).toBe('string');
    });
  });

  describe('real-world scenarios', () => {
    it('should handle actual grep command from screenshot', async () => {
      // This is the exact command from the user's screenshot
      const command = 'grep -E "(GITHUB_TOKEN|JIRA_|ADO_)" .env';
      const output = 'GITHUB_TOKEN=ghp_IolaygтpMoR4Wg86SqcziySxNRzEgy0Dm0JZ';

      const sanitized = sanitizeCommandOutput(output, command);

      expect(sanitized).toContain('GITHUB_TOKEN=');
      expect(sanitized).not.toContain('IolaygтpMoR4Wg86SqcziySxNRzEgy0Dm0JZ');
      // Should show masked format like ghp_****0JZ
      expect(sanitized).toMatch(/ghp_\*+.*JZ/);
    });

    it('should handle multi-line env file contents', async () => {
      const output = `GITHUB_TOKEN=ghp_abc123
JIRA_API_TOKEN=ATAT456
JIRA_EMAIL=user@example.com
AZURE_DEVOPS_PAT=xyz789
NODE_ENV=production`;

      const sanitized = sanitizeCommandOutput(output, 'cat .env');

      expect(sanitized).toContain('NODE_ENV=production');
      expect(sanitized).not.toContain('abc123');
      expect(sanitized).not.toContain('ATAT456');
      expect(sanitized).not.toContain('user@example.com');
      expect(sanitized).not.toContain('xyz789');
    });

    it('should handle docker-compose env output', async () => {
      const output = `services:
  app:
    environment:
      - DATABASE_URL=postgresql://admin:secret123@db:5432/app
      - REDIS_URL=redis://:password456@redis:6379
      - NODE_ENV=production`;

      const sanitized = sanitizeCommandOutput(output);

      expect(sanitized).toContain('NODE_ENV=production');
      expect(sanitized).not.toContain('secret123');
      expect(sanitized).not.toContain('password456');
    });
  });

  describe('integration with credential-masker', () => {
    it('should use same masking format as credential-masker', () => {
      const token = 'ghp_1234567890abcdef';
      const envOutput = `GITHUB_TOKEN=${token}`;

      const sanitized = sanitizeCommandOutput(envOutput);

      // Should show first 4 and last 4 chars with * in between
      expect(sanitized).toMatch(/ghp_\*+cdef/);
      expect(sanitized).not.toContain(token);
    });
  });
});
