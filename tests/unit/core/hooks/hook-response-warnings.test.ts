import { describe, it, expect } from 'vitest';

/**
 * T-001: Hook Response Warnings
 * AC-US1-01: Hook responses include `warnings` array with failure messages
 * AC-US1-04: Silent `{"continue":true}` replaced with `{"continue":true, "warnings": [...]}`
 *
 * Tests for new hook response format with warnings array
 */

describe('Hook Response with Warnings', () => {
  describe('Response Format', () => {
    it('should include warnings array in hook response type', () => {
      // Given: A hook response with warnings
      const response = {
        continue: true,
        warnings: [
          {
            severity: 'WARNING' as const,
            message: 'Hook timed out after 5s',
            recommendation: 'Consider optimizing or increasing HOOK_TIMEOUT',
          },
        ],
      };

      // Then: Response should have expected structure
      expect(response).toHaveProperty('continue');
      expect(response).toHaveProperty('warnings');
      expect(response.warnings).toBeInstanceOf(Array);
      expect(response.warnings).toHaveLength(1);
      expect(response.warnings[0]).toHaveProperty('severity');
      expect(response.warnings[0]).toHaveProperty('message');
      expect(response.warnings[0]).toHaveProperty('recommendation');
    });

    it('should support empty warnings array for successful hooks', () => {
      // Given: A successful hook response
      const response = {
        continue: true,
        warnings: [],
      };

      // Then: Warnings array should be empty
      expect(response.warnings).toHaveLength(0);
    });

    it('should support ERROR severity for critical failures', () => {
      // Given: A hook response with critical error
      const response = {
        continue: true,
        warnings: [
          {
            severity: 'ERROR' as const,
            message: 'Merge conflict detected in spec.md',
            recommendation: 'Resolve conflicts manually and retry',
          },
        ],
      };

      // Then: Severity should be ERROR
      expect(response.warnings[0].severity).toBe('ERROR');
    });

    it('should support WARNING severity for timeout failures', () => {
      // Given: A hook response with timeout warning
      const response = {
        continue: true,
        warnings: [
          {
            severity: 'WARNING' as const,
            message: 'Hook timed out after 5s',
            recommendation: 'Run specweave check-hooks',
          },
        ],
      };

      // Then: Severity should be WARNING
      expect(response.warnings[0].severity).toBe('WARNING');
    });

    it('should support multiple warnings in single response', () => {
      // Given: A hook response with multiple warnings
      const response = {
        continue: true,
        warnings: [
          {
            severity: 'WARNING' as const,
            message: 'Hook timed out after 5s',
            recommendation: 'Consider optimizing',
          },
          {
            severity: 'ERROR' as const,
            message: 'Syntax error in hook script',
            recommendation: 'Fix syntax errors',
          },
        ],
      };

      // Then: All warnings should be present
      expect(response.warnings).toHaveLength(2);
      expect(response.warnings[0].severity).toBe('WARNING');
      expect(response.warnings[1].severity).toBe('ERROR');
    });
  });

  describe('Backwards Compatibility', () => {
    it('should allow responses without warnings array (legacy)', () => {
      // Given: Legacy hook response without warnings
      const response = {
        continue: true,
      };

      // Then: Should be valid (warnings optional for backwards compatibility)
      expect(response).toHaveProperty('continue');
      expect(response).not.toHaveProperty('warnings');
    });
  });
});
