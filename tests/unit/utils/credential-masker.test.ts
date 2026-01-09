import { describe, it, expect } from 'vitest';
import {
  maskValue,
  maskCredentials,
  maskCredentialsInData,
  sanitizeBashOutput,
  containsCredentials,
  maskEnvironment,
} from '../../../src/utils/credential-masker.js';

describe('credential-masker', () => {
  describe('maskValue', () => {
    it('should mask long values showing first and last 4 characters', () => {
      const token = 'ghp_1234567890abcdefghijklmnop';
      const masked = maskValue(token);

      expect(masked).toMatch(/^ghp_.*mnop$/);
      expect(masked).toContain('*');
      expect(masked.length).toBeGreaterThanOrEqual(token.length);
    });

    it('should completely mask short values', () => {
      const short = 'abc123';
      const masked = maskValue(short);

      expect(masked).toBe('********');
      expect(masked).not.toContain('abc');
      expect(masked).not.toContain('123');
    });

    it('should respect custom mask options', () => {
      const token = 'my-secret-token-value';
      const masked = maskValue(token, {
        showFirst: 2,
        showLast: 2,
        maskChar: '#',
      });

      expect(masked).toMatch(/^my.*ue$/);
      expect(masked).toContain('#');
    });
  });

  describe('maskCredentials', () => {
    it('should mask GITHUB_TOKEN in environment variable format', () => {
      const text = 'GITHUB_TOKEN=ghp_1234567890abcdefghij';
      const masked = maskCredentials(text);

      expect(masked).toContain('GITHUB_TOKEN=');
      expect(masked).toContain('ghp_');
      expect(masked).toContain('*');
      expect(masked).not.toContain('1234567890abcdefghij');
    });

    it('should mask JIRA credentials', () => {
      const text = 'JIRA_API_TOKEN=ATATTxxxxxxxxxxxxxxxxxxxxx\nJIRA_EMAIL=user@example.com';
      const masked = maskCredentials(text);

      expect(masked).toContain('JIRA_API_TOKEN=');
      expect(masked).toContain('JIRA_EMAIL=');
      expect(masked).not.toContain('user@example.com');
      expect(masked).toContain('*');
    });

    it('should mask Azure DevOps PAT', () => {
      const text = 'AZURE_DEVOPS_PAT=abcdefghijklmnopqrstuvwxyz123456';
      const masked = maskCredentials(text);

      expect(masked).toContain('AZURE_DEVOPS_PAT=');
      expect(masked).toContain('*');
      expect(masked).not.toContain('abcdefghijklmnopqrstuvwxyz123456');
    });

    it('should mask database URLs', () => {
      const text = 'DATABASE_URL=postgresql://user:secretpass@localhost:5432/db';
      const masked = maskCredentials(text);

      expect(masked).toContain('DATABASE_URL=');
      expect(masked).toContain('*');
      expect(masked).not.toContain('secretpass');
    });

    it('should mask Bearer tokens', () => {
      const text = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const masked = maskCredentials(text);

      expect(masked).toContain('Bearer ');
      expect(masked).toContain('*');
      expect(masked).not.toContain('SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c');
    });

    it('should mask JSON credentials', () => {
      const text = '{"apiToken": "sk_test_1234567890abcdefghij", "password": "mySecretPass123"}';
      const masked = maskCredentials(text);

      // Credentials should be masked
      expect(masked).toContain('*');
      expect(masked).not.toContain('1234567890abcdefghij');
      expect(masked).not.toContain('mySecretPass123');
      // Should preserve some structure (not check exact format since generic pattern matches)
      expect(masked).toMatch(/sk_t.*ghij/);
      expect(masked).toMatch(/mySe.*123/);
    });

    it('should handle text without credentials', () => {
      const text = 'This is normal text without any credentials';
      const masked = maskCredentials(text);

      expect(masked).toBe(text);
    });

    it('should mask multiple credentials in same text', () => {
      const text = `
        GITHUB_TOKEN=ghp_abc123
        JIRA_API_TOKEN=ATAT123456
        DATABASE_URL=postgres://user:pass@host/db
      `;
      const masked = maskCredentials(text);

      expect(masked).toContain('GITHUB_TOKEN=');
      expect(masked).toContain('JIRA_API_TOKEN=');
      expect(masked).toContain('DATABASE_URL=');
      expect(masked).not.toContain('abc123');
      expect(masked).not.toContain('ATAT123456');
      expect(masked).not.toContain('pass@host');
    });
  });

  describe('maskCredentialsInData', () => {
    it('should mask credentials in nested objects', () => {
      const data = {
        config: {
          apiToken: 'sk_test_1234567890',
          database: {
            password: 'superSecret123'
          }
        },
        normal: 'not a secret'
      };

      const masked = maskCredentialsInData(data);

      expect(masked.config.apiToken).toContain('*');
      expect(masked.config.apiToken).not.toBe('sk_test_1234567890');
      expect(masked.config.database.password).toContain('*');
      expect(masked.config.database.password).not.toBe('superSecret123');
      expect(masked.normal).toBe('not a secret');
    });

    it('should mask credentials in arrays', () => {
      const data = [
        { token: 'abc123456789' },
        { token: 'xyz987654321' }
      ];

      const masked = maskCredentialsInData(data);

      expect(masked[0].token).toContain('*');
      expect(masked[0].token).not.toBe('abc123456789');
      expect(masked[1].token).toContain('*');
      expect(masked[1].token).not.toBe('xyz987654321');
    });

    it('should handle strings directly', () => {
      const data = 'GITHUB_TOKEN=ghp_123456';
      const masked = maskCredentialsInData(data);

      expect(masked).toContain('*');
      expect(masked).not.toContain('ghp_123456');
    });

    it('should not modify non-object data', () => {
      expect(maskCredentialsInData(123)).toBe(123);
      expect(maskCredentialsInData(true)).toBe(true);
      expect(maskCredentialsInData(null)).toBe(null);
    });
  });

  describe('sanitizeBashOutput', () => {
    it('should sanitize grep output for .env file', () => {
      const output = `GITHUB_TOKEN=ghp_1234567890abcdefghij
JIRA_API_TOKEN=ATAT123456789
DATABASE_URL=postgresql://user:password@localhost/db`;

      const sanitized = sanitizeBashOutput(output);

      expect(sanitized).toContain('GITHUB_TOKEN=');
      expect(sanitized).toContain('JIRA_API_TOKEN=');
      expect(sanitized).toContain('DATABASE_URL=');
      expect(sanitized).not.toContain('1234567890abcdefghij');
      expect(sanitized).not.toContain('ATAT123456789');
      expect(sanitized).not.toContain('password@localhost');
    });

    it('should preserve line structure', () => {
      const output = 'Line 1\nLine 2\nLine 3';
      const sanitized = sanitizeBashOutput(output);

      expect(sanitized.split('\n').length).toBe(3);
    });

    it('should handle empty output', () => {
      expect(sanitizeBashOutput('')).toBe('');
      expect(sanitizeBashOutput(null as any)).toBe(null);
    });
  });

  describe('containsCredentials', () => {
    it('should detect credentials in text', () => {
      expect(containsCredentials('GITHUB_TOKEN=ghp_123456')).toBe(true);
      expect(containsCredentials('password=secret123')).toBe(false); // too short
      expect(containsCredentials('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')).toBe(true);
      expect(containsCredentials('This is normal text')).toBe(false);
    });

    it('should handle empty input', () => {
      expect(containsCredentials('')).toBe(false);
      expect(containsCredentials(null as any)).toBe(false);
    });
  });

  describe('maskEnvironment', () => {
    it('should mask sensitive environment variables', () => {
      const env = {
        GITHUB_TOKEN: 'ghp_1234567890',
        JIRA_API_TOKEN: 'ATAT123456',
        NODE_ENV: 'production',
        PATH: '/usr/bin:/usr/local/bin'
      };

      const masked = maskEnvironment(env);

      expect(masked.GITHUB_TOKEN).toContain('*');
      expect(masked.GITHUB_TOKEN).not.toBe('ghp_1234567890');
      expect(masked.JIRA_API_TOKEN).toContain('*');
      expect(masked.JIRA_API_TOKEN).not.toBe('ATAT123456');
      expect(masked.NODE_ENV).toBe('production');
      expect(masked.PATH).toBe('/usr/bin:/usr/local/bin');
    });

    it('should handle empty values', () => {
      const env = {
        EMPTY: '',
        UNDEFINED: undefined as any
      };

      const masked = maskEnvironment(env);

      expect(masked.EMPTY).toBe('');
      expect(masked.UNDEFINED).toBe('');
    });
  });

  describe('real-world scenarios', () => {
    it('should mask credentials in actual grep output', () => {
      // Simulates: grep -E "(GITHUB_TOKEN|JIRA_|ADO_)" .env
      const grepOutput = 'GITHUB_TOKEN=ghp_IolaygтpMoR4Wg86SqcziySxNRzEgy0Dm0JZ';
      const sanitized = maskCredentials(grepOutput);

      expect(sanitized).toContain('GITHUB_TOKEN=');
      expect(sanitized).not.toContain('IolaygтpMoR4Wg86SqcziySxNRzEgy0Dm0JZ');
      expect(sanitized).toMatch(/ghp_.*0JZ/); // Shows first/last 4
    });

    it('should mask credentials in docker command outputs', () => {
      const output = 'docker run -e DATABASE_URL=postgres://admin:superSecret@db:5432/myapp';
      const sanitized = maskCredentials(output);

      expect(sanitized).not.toContain('superSecret');
      expect(sanitized).toContain('DATABASE_URL=');
    });

    it('should mask credentials in curl commands', () => {
      const output = 'curl -H "Authorization: Bearer sk_live_1234567890abcdef" https://api.example.com';
      const sanitized = maskCredentials(output);

      expect(sanitized).not.toContain('sk_live_1234567890abcdef');
      expect(sanitized).toContain('Bearer ');
      expect(sanitized).toContain('*');
    });

    it('should handle mixed content with credentials', () => {
      const mixedContent = `
Checking environment variables...
GITHUB_TOKEN=ghp_abc123def456
NODE_ENV=production
Connecting to database...
DATABASE_URL=postgresql://user:pass123@localhost:5432/db
All services ready!
      `;

      const sanitized = maskCredentials(mixedContent);

      expect(sanitized).toContain('Checking environment variables...');
      expect(sanitized).toContain('NODE_ENV=production');
      expect(sanitized).toContain('All services ready!');
      expect(sanitized).not.toContain('abc123def456');
      expect(sanitized).not.toContain('pass123@localhost');
    });
  });

  describe('edge cases', () => {
    it('should handle very long tokens', () => {
      const longToken = 'a'.repeat(200);
      const masked = maskValue(longToken);

      expect(masked).toContain('*');
      expect(masked.length).toBeGreaterThanOrEqual(20);
    });

    it('should handle special characters in credentials', () => {
      const special = 'P@ssw0rd!#$%^&*()_+-=[]{}|;:,.<>?';
      const masked = maskValue(special);

      expect(masked).toContain('*');
      expect(masked).not.toBe(special);
    });

    it('should not crash on null or undefined', () => {
      expect(() => maskCredentials(null as any)).not.toThrow();
      expect(() => maskCredentials(undefined as any)).not.toThrow();
      expect(() => maskValue(null as any)).not.toThrow();
    });
  });
});
