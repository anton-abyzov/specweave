import { expect } from '@jest/globals';

/**
 * Custom Jest matchers for SpecWeave tests
 */

declare global {
  namespace jest {
    interface Matchers<R> {
      /**
       * Check if a number is within a specified range (inclusive)
       */
      toBeWithinRange(min: number, max: number): R;

      /**
       * Check if an object has the expected classification result
       */
      toHaveClassification(expected: { type: string; confidence: number }): R;

      /**
       * Check if a keyword score meets the minimum threshold
       */
      toHaveKeywordScore(min: number): R;

      /**
       * Check if a path exists on the filesystem
       */
      toExistOnFilesystem(): Promise<R>;

      /**
       * Check if a file contains specific content
       */
      toHaveFileContent(expectedContent: string): Promise<R>;
    }
  }
}

// Register custom matchers
expect.extend({
  /**
   * Check if a number is within a range
   */
  toBeWithinRange(received: number, min: number, max: number) {
    const pass = received >= min && received <= max;

    const message = () => {
      if (pass) {
        return `expected ${received} not to be within range ${min} to ${max}`;
      } else {
        return `expected ${received} to be within range ${min} to ${max}`;
      }
    };

    return {
      message,
      pass,
    };
  },

  /**
   * Check if an object has the expected classification
   */
  toHaveClassification(
    received: any,
    expected: { type: string; confidence: number }
  ) {
    const hasType = received && received.type === expected.type;
    const hasConfidence =
      received &&
      typeof received.confidence === 'number' &&
      Math.abs(received.confidence - expected.confidence) < 0.1; // Allow 0.1 tolerance

    const pass = hasType && hasConfidence;

    const message = () => {
      if (pass) {
        return `expected classification not to match type: ${expected.type}, confidence: ${expected.confidence}`;
      } else {
        return `expected classification to match type: ${expected.type}, confidence: ${expected.confidence}, but got type: ${received?.type}, confidence: ${received?.confidence}`;
      }
    };

    return {
      message,
      pass,
    };
  },

  /**
   * Check if a keyword score meets minimum threshold
   */
  toHaveKeywordScore(received: number, min: number) {
    const pass = typeof received === 'number' && received >= min;

    const message = () => {
      if (pass) {
        return `expected keyword score ${received} not to be at least ${min}`;
      } else {
        return `expected keyword score ${received} to be at least ${min}`;
      }
    };

    return {
      message,
      pass,
    };
  },

  /**
   * Check if a path exists on filesystem
   */
  async toExistOnFilesystem(received: string) {
    const fs = await import('fs-extra');
    const exists = await fs.pathExists(received);

    const message = () => {
      if (exists) {
        return `expected path ${received} not to exist on filesystem`;
      } else {
        return `expected path ${received} to exist on filesystem`;
      }
    };

    return {
      message,
      pass: exists,
    };
  },

  /**
   * Check if a file contains specific content
   */
  async toHaveFileContent(received: string, expectedContent: string) {
    const fs = await import('fs-extra');

    try {
      const exists = await fs.pathExists(received);
      if (!exists) {
        return {
          message: () => `expected file ${received} to exist`,
          pass: false,
        };
      }

      const actualContent = await fs.readFile(received, 'utf-8');
      const pass = actualContent.includes(expectedContent);

      const message = () => {
        if (pass) {
          return `expected file ${received} not to contain "${expectedContent}"`;
        } else {
          return `expected file ${received} to contain "${expectedContent}", but got:\n${actualContent.substring(0, 200)}...`;
        }
      };

      return {
        message,
        pass,
      };
    } catch (error) {
      return {
        message: () => `error reading file ${received}: ${error}`,
        pass: false,
      };
    }
  },
});

export {};
