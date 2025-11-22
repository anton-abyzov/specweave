/**
 * Vitest Unit Test Template
 *
 * This template demonstrates best practices for writing unit tests
 * with Vitest for TypeScript projects.
 *
 * Features:
 * - AAA pattern (Arrange-Act-Assert)
 * - Test isolation
 * - Mocking dependencies
 * - Parametric testing
 * - Error handling tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Import the module under test
import { YourModule } from './YourModule';

// Import dependencies (to be mocked)
import { ExternalDependency } from './ExternalDependency';

// ============================================================================
// MOCKS
// ============================================================================

// Mock external dependencies
vi.mock('./ExternalDependency', () => ({
  ExternalDependency: vi.fn().mockImplementation(() => ({
    fetchData: vi.fn().mockResolvedValue({ data: 'mocked' }),
    processData: vi.fn(),
  })),
}));

// ============================================================================
// TEST SUITE
// ============================================================================

describe('YourModule', () => {
  // ========================================================================
  // SETUP & TEARDOWN
  // ========================================================================

  let instance: YourModule;
  let mockDependency: any;

  beforeEach(() => {
    // ARRANGE: Set up fresh instance for each test
    mockDependency = new ExternalDependency();
    instance = new YourModule(mockDependency);
  });

  afterEach(() => {
    // TEARDOWN: Clean up mocks
    vi.clearAllMocks();
  });

  // ========================================================================
  // HAPPY PATH TESTS
  // ========================================================================

  describe('methodName', () => {
    it('should perform expected operation with valid input', () => {
      // ARRANGE
      const input = 'test-input';
      const expectedOutput = 'test-output';

      // ACT
      const result = instance.methodName(input);

      // ASSERT
      expect(result).toBe(expectedOutput);
    });

    it('should call dependency with correct parameters', () => {
      // ARRANGE
      const input = 'test-input';

      // ACT
      instance.methodName(input);

      // ASSERT
      expect(mockDependency.processData).toHaveBeenCalledWith(input);
      expect(mockDependency.processData).toHaveBeenCalledTimes(1);
    });
  });

  // ========================================================================
  // ASYNC TESTS
  // ========================================================================

  describe('asyncMethod', () => {
    it('should resolve with data on success', async () => {
      // ARRANGE
      const mockData = { id: 1, value: 'test' };
      mockDependency.fetchData.mockResolvedValue(mockData);

      // ACT
      const result = await instance.asyncMethod();

      // ASSERT
      expect(result).toEqual(mockData);
      expect(mockDependency.fetchData).toHaveBeenCalled();
    });

    it('should handle async errors gracefully', async () => {
      // ARRANGE
      const error = new Error('Network error');
      mockDependency.fetchData.mockRejectedValue(error);

      // ACT & ASSERT
      await expect(instance.asyncMethod()).rejects.toThrow('Network error');
    });
  });

  // ========================================================================
  // EDGE CASES
  // ========================================================================

  describe('edge cases', () => {
    it('should handle empty input', () => {
      // ACT
      const result = instance.methodName('');

      // ASSERT
      expect(result).toBe('');
    });

    it('should handle null input', () => {
      // ACT
      const result = instance.methodName(null as any);

      // ASSERT
      expect(result).toBeNull();
    });

    it('should handle undefined input', () => {
      // ACT
      const result = instance.methodName(undefined as any);

      // ASSERT
      expect(result).toBeUndefined();
    });

    it('should handle very large input', () => {
      // ARRANGE
      const largeInput = 'x'.repeat(1000000);

      // ACT
      const result = instance.methodName(largeInput);

      // ASSERT
      expect(result).toBeDefined();
    });
  });

  // ========================================================================
  // ERROR HANDLING
  // ========================================================================

  describe('error handling', () => {
    it('should throw error for invalid input', () => {
      // ARRANGE
      const invalidInput = -1;

      // ACT & ASSERT
      expect(() => instance.methodName(invalidInput)).toThrow(
        'Input must be positive'
      );
    });

    it('should throw specific error type', () => {
      // ARRANGE
      const invalidInput = 'invalid';

      // ACT & ASSERT
      expect(() => instance.methodName(invalidInput)).toThrow(ValidationError);
    });

    it('should include error details', () => {
      // ARRANGE
      const invalidInput = 'invalid';

      // ACT
      try {
        instance.methodName(invalidInput);
        fail('Expected error to be thrown');
      } catch (error) {
        // ASSERT
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.message).toContain('invalid');
        expect(error.code).toBe('INVALID_INPUT');
      }
    });
  });

  // ========================================================================
  // PARAMETRIC TESTS (Table-Driven)
  // ========================================================================

  describe.each([
    { input: 1, expected: 2 },
    { input: 2, expected: 4 },
    { input: 3, expected: 6 },
    { input: 4, expected: 8 },
  ])('methodName($input)', ({ input, expected }) => {
    it(`should return ${expected}`, () => {
      // ACT
      const result = instance.methodName(input);

      // ASSERT
      expect(result).toBe(expected);
    });
  });

  // ========================================================================
  // STATE MANAGEMENT TESTS
  // ========================================================================

  describe('state management', () => {
    it('should update internal state correctly', () => {
      // ARRANGE
      const initialState = instance.getState();

      // ACT
      instance.updateState('new-value');

      // ASSERT
      const newState = instance.getState();
      expect(newState).not.toBe(initialState);
      expect(newState).toBe('new-value');
    });

    it('should emit events on state change', () => {
      // ARRANGE
      const eventHandler = vi.fn();
      instance.on('stateChanged', eventHandler);

      // ACT
      instance.updateState('new-value');

      // ASSERT
      expect(eventHandler).toHaveBeenCalledWith('new-value');
    });
  });

  // ========================================================================
  // PERFORMANCE TESTS
  // ========================================================================

  describe('performance', () => {
    it('should complete within reasonable time', () => {
      // ARRANGE
      const startTime = Date.now();

      // ACT
      instance.methodName('test');

      // ASSERT
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(100); // 100ms threshold
    });

    it('should handle large datasets efficiently', () => {
      // ARRANGE
      const largeDataset = Array.from({ length: 10000 }, (_, i) => i);

      // ACT
      const startTime = Date.now();
      const result = instance.processBatch(largeDataset);
      const endTime = Date.now();

      // ASSERT
      expect(result).toHaveLength(10000);
      expect(endTime - startTime).toBeLessThan(1000); // 1s threshold
    });
  });

  // ========================================================================
  // SNAPSHOT TESTS
  // ========================================================================

  describe('snapshots', () => {
    it('should match snapshot for complex output', () => {
      // ARRANGE
      const input = { id: 1, name: 'Test', nested: { value: 42 } };

      // ACT
      const result = instance.transform(input);

      // ASSERT
      expect(result).toMatchSnapshot();
    });

    it('should match inline snapshot for simple output', () => {
      // ARRANGE
      const input = 'test';

      // ACT
      const result = instance.methodName(input);

      // ASSERT
      expect(result).toMatchInlineSnapshot('"test-output"');
    });
  });

  // ========================================================================
  // TIMER/DEBOUNCE TESTS
  // ========================================================================

  describe('timers', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllTimers();
    });

    it('should debounce function calls', () => {
      // ARRANGE
      const callback = vi.fn();
      const debounced = instance.debounce(callback, 1000);

      // ACT
      debounced();
      debounced();
      debounced();

      // ASSERT (not called yet)
      expect(callback).not.toHaveBeenCalled();

      // Fast-forward time
      vi.advanceTimersByTime(1000);

      // ASSERT (called once)
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should throttle function calls', () => {
      // ARRANGE
      const callback = vi.fn();
      const throttled = instance.throttle(callback, 1000);

      // ACT
      throttled(); // Called immediately
      throttled(); // Ignored (within throttle window)
      throttled(); // Ignored (within throttle window)

      // ASSERT
      expect(callback).toHaveBeenCalledTimes(1);

      // Fast-forward time
      vi.advanceTimersByTime(1000);

      // ACT
      throttled(); // Called after throttle window

      // ASSERT
      expect(callback).toHaveBeenCalledTimes(2);
    });
  });
});

// ============================================================================
// HELPER TYPES & CLASSES (For Examples Above)
// ============================================================================

class ValidationError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ============================================================================
// BEST PRACTICES CHECKLIST
// ============================================================================

/*
✅ AAA Pattern (Arrange-Act-Assert)
✅ Test Isolation (beforeEach creates fresh instance)
✅ Descriptive Test Names (should do X when Y)
✅ One Assertion Per Test (when possible)
✅ Mock External Dependencies
✅ Test Happy Path
✅ Test Edge Cases (null, undefined, empty, large)
✅ Test Error Handling
✅ Parametric Tests (test.each)
✅ Async Testing (async/await, rejects, resolves)
✅ Timer Testing (useFakeTimers)
✅ Performance Testing (execution time)
✅ Snapshot Testing (complex outputs)
✅ No Shared State Between Tests
✅ Fast Execution (< 1s per test)
*/
