/**
 * Test Template - Modern Vitest Patterns (2025)
 *
 * USAGE:
 * 1. Copy this file: cp tests/test-template.test.ts tests/unit/your-feature/your-test.test.ts
 * 2. Replace placeholders: YourModule, MyFeature, etc.
 * 3. Remove unused sections
 * 4. Write your tests following the patterns below
 *
 * This template enforces:
 * ✅ ES6 imports (NO require())
 * ✅ Vitest API (NO jest.*)
 * ✅ Type-safe mocks (vi.mocked())
 * ✅ Mock factories (prevent hoisting issues)
 * ✅ Isolated test state (vi.clearAllMocks())
 * ✅ Array/object copies (prevent mutations)
 *
 * See: CLAUDE.md → "Testing Best Practices & Anti-Patterns"
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// =====================================================
// STEP 1: Mock External Dependencies
// =====================================================
// ✅ CORRECT: Define mocks BEFORE imports
// ✅ CORRECT: Use inline factory functions (prevents hoisting issues)

// Example: Mocking fs-extra
vi.mock('fs-extra', () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    existsSync: vi.fn(),
    ensureDir: vi.fn(),
    pathExists: vi.fn(),
    readJson: vi.fn(),
    writeJson: vi.fn(),
  },
}));

// Example: Mocking inquirer
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}));

// Example: Mocking project-specific modules
vi.mock('../../../src/utils/project-detection.js', () => ({
  autoDetectProjectIdSync: vi.fn(() => 'default'),
  formatProjectName: vi.fn((id: string) => {
    return id.split('-').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }),
}));

// =====================================================
// STEP 2: Import Dependencies AFTER Mocking
// =====================================================
// ✅ CORRECT: ES6 imports with .js extensions
// ❌ WRONG: const { MyModule } = require('...') - NO require()!

import fs from 'fs-extra';
import inquirer from 'inquirer';
import { YourModule } from '../../../src/your-feature/your-module.js';
import { HelperFunction } from '../../../src/utils/helper.js';

// =====================================================
// STEP 3: Test Suite
// =====================================================

describe('YourModule - Feature Description', () => {
  // ===================================================
  // STEP 4: Get Mock References (Type-Safe)
  // ===================================================
  // ✅ CORRECT: vi.mocked() for type safety
  // ❌ WRONG: fs as anyed<typeof fs> - Invalid syntax!

  const mockReadFile = vi.mocked(fs.readFile);
  const mockWriteFile = vi.mocked(fs.writeFile);
  const mockExistsSync = vi.mocked(fs.existsSync);
  const mockPrompt = vi.mocked(inquirer.default.prompt);

  // ===================================================
  // STEP 5: Setup/Teardown
  // ===================================================

  beforeEach(() => {
    // ✅ ALWAYS clear mocks before each test
    vi.clearAllMocks();

    // ✅ Set up default mock behavior
    mockExistsSync.mockReturnValue(true);
    mockReadFile.mockResolvedValue('default content');
    mockPrompt.mockResolvedValue({ choice: 'default' });
  });

  afterEach(() => {
    // Optional: Clean up resources if needed
  });

  // ===================================================
  // PATTERN 1: Basic Unit Test
  // ===================================================

  describe('Core functionality', () => {
    it('should perform basic operation', async () => {
      // Arrange - Set up test data
      const input = 'test input';
      mockReadFile.mockResolvedValue('mocked content');

      // Act - Execute the code under test
      const result = await YourModule.doSomething(input);

      // Assert - Verify the results
      expect(mockReadFile).toHaveBeenCalledWith('expected/path');
      expect(mockReadFile).toHaveBeenCalledTimes(1);
      expect(result).toBe('expected output');
    });

    it('should handle edge cases', () => {
      // Example: Empty input
      const result = YourModule.doSomething('');
      expect(result).toBe('');

      // Example: Null input
      expect(() => YourModule.doSomething(null)).toThrow('Invalid input');
    });
  });

  // ===================================================
  // PATTERN 2: Testing with Arrays/Objects
  // ===================================================

  describe('Array/Object handling', () => {
    it('should not mutate original arrays', async () => {
      // ✅ CORRECT: Mock returns COPY to prevent mutation
      const existingData = [{ id: 1 }, { id: 2 }];
      mockReadFile.mockResolvedValue(JSON.stringify([...existingData]));

      await YourModule.processData();

      // Verify original data unchanged
      expect(existingData).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('should handle empty arrays', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify([]));
      const result = await YourModule.processData();
      expect(result).toEqual([]);
    });
  });

  // ===================================================
  // PATTERN 3: Testing State Transitions
  // ===================================================

  describe('Status transitions', () => {
    it('should transition from PLANNING to ACTIVE', () => {
      // ✅ CORRECT: Test valid state machine transitions
      const entity = { status: 'PLANNING' };
      const updated = YourModule.updateStatus(entity, 'ACTIVE');
      expect(updated.status).toBe('ACTIVE');
    });

    it('should reject invalid transitions', () => {
      // ❌ PLANNING → PAUSED is invalid
      const entity = { status: 'PLANNING' };
      expect(() => YourModule.updateStatus(entity, 'PAUSED'))
        .toThrow('Invalid state transition');
    });
  });

  // ===================================================
  // PATTERN 4: Testing Error Handling
  // ===================================================

  describe('Error handling', () => {
    it('should handle file read errors gracefully', async () => {
      // Arrange - Mock error
      const error = new Error('ENOENT: File not found');
      mockReadFile.mockRejectedValue(error);

      // Act & Assert
      await expect(YourModule.loadConfig()).rejects.toThrow('File not found');
    });

    it('should provide helpful error messages', async () => {
      mockReadFile.mockRejectedValue(new Error('Permission denied'));

      try {
        await YourModule.loadConfig();
        fail('Should have thrown error');
      } catch (error: any) {
        // ✅ PREFER flexible substring matching
        expect(error.message).toContain('Permission denied');
        expect(error.message).toContain('loadConfig');
      }
    });
  });

  // ===================================================
  // PATTERN 5: Testing with Fake Timers
  // ===================================================

  describe('Async operations with timers', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should retry failed operations', async () => {
      // Arrange - Fail twice, then succeed
      mockReadFile
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValue('success');

      // Act - Create promise first, run timers, then await
      // ✅ CORRECT: This order prevents unhandled rejections
      const promise = YourModule.retryOperation();
      await vi.runAllTimersAsync();
      const result = await promise;

      // Assert
      expect(mockReadFile).toHaveBeenCalledTimes(3);
      expect(result).toBe('success');
    });

    it('should fail after max retries', async () => {
      // Arrange - Always fail
      mockReadFile.mockRejectedValue(new Error('Persistent failure'));

      // Act - CORRECT order for rejection testing
      const promise = YourModule.retryOperation();
      const expectPromise = expect(promise).rejects.toThrow('Persistent failure');
      await vi.runAllTimersAsync();
      await expectPromise;

      // Assert
      expect(mockReadFile).toHaveBeenCalledTimes(3);
    });
  });

  // ===================================================
  // PATTERN 6: Testing User Interactions
  // ===================================================

  describe('User prompts', () => {
    it('should handle user confirmation', async () => {
      // Arrange
      mockPrompt.mockResolvedValue({ confirmed: true });

      // Act
      const result = await YourModule.confirmAction();

      // Assert
      expect(mockPrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'confirm',
          name: 'confirmed',
        })
      );
      expect(result).toBe(true);
    });

    it('should handle user cancellation', async () => {
      mockPrompt.mockResolvedValue({ confirmed: false });
      const result = await YourModule.confirmAction();
      expect(result).toBe(false);
    });
  });

  // ===================================================
  // PATTERN 7: Testing Multiple Scenarios
  // ===================================================

  describe('Scenario testing', () => {
    const scenarios = [
      { input: 'valid', expected: 'VALID' },
      { input: 'test', expected: 'TEST' },
      { input: '123', expected: '123' },
    ];

    scenarios.forEach(({ input, expected }) => {
      it(`should transform "${input}" to "${expected}"`, () => {
        const result = YourModule.transform(input);
        expect(result).toBe(expected);
      });
    });
  });

  // ===================================================
  // PATTERN 8: Testing Integration Points
  // ===================================================

  describe('Integration with external systems', () => {
    it('should call external API with correct parameters', async () => {
      // Arrange
      const mockApiCall = vi.fn().mockResolvedValue({ status: 'ok' });
      YourModule.setApiClient(mockApiCall);

      // Act
      await YourModule.syncWithExternal({ id: '123' });

      // Assert
      expect(mockApiCall).toHaveBeenCalledWith({
        method: 'POST',
        body: expect.objectContaining({ id: '123' }),
      });
    });

    it('should handle API failures', async () => {
      const mockApiCall = vi.fn().mockRejectedValue(new Error('Network error'));
      YourModule.setApiClient(mockApiCall);

      await expect(YourModule.syncWithExternal({ id: '123' }))
        .rejects.toThrow('Network error');
    });
  });

  // ===================================================
  // PATTERN 9: Testing Singleton Patterns
  // ===================================================

  describe('Singleton behavior', () => {
    it('should return same instance', () => {
      const instance1 = YourModule.getInstance();
      const instance2 = YourModule.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should allow reset for testing', () => {
      const instance1 = YourModule.getInstance();
      YourModule.resetInstance();
      const instance2 = YourModule.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  // ===================================================
  // PATTERN 10: Testing Complex Data Structures
  // ===================================================

  describe('Complex data validation', () => {
    it('should validate nested object structure', () => {
      const validData = {
        metadata: {
          id: '0001-feature',
          status: 'ACTIVE',
          created: '2025-11-17T00:00:00Z',
        },
        content: {
          title: 'Feature',
          description: 'Description',
        },
      };

      expect(() => YourModule.validate(validData)).not.toThrow();
    });

    it('should reject invalid structure', () => {
      const invalidData = {
        metadata: {
          // Missing required 'id' field
          status: 'ACTIVE',
        },
      };

      expect(() => YourModule.validate(invalidData))
        .toThrow(/Missing required field.*id/i);
    });
  });
});

// =====================================================
// CHECKLIST BEFORE COMMITTING
// =====================================================
// Before pushing your tests, verify:
//
// [ ] ✅ All imports use ES6 syntax (NO require())
// [ ] ✅ All imports have .js extensions
// [ ] ✅ All mocks use vi.* APIs (NO jest.*)
// [ ] ✅ All vi.mock() factories use inline definitions
// [ ] ✅ All mocked modules use vi.mocked() (NO anyed<>)
// [ ] ✅ All mocks return copies of arrays/objects
// [ ] ✅ All fake timer tests use correct promise order
// [ ] ✅ All status transitions are valid
// [ ] ✅ All string expectations use flexible matching
// [ ] ✅ vi.clearAllMocks() called in beforeEach()
//
// For more details, see: CLAUDE.md → "Testing Best Practices & Anti-Patterns"
