import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { IncrementNumberManager } from '../../src/core/increment-utils.js';
import * as fs from 'fs';
import * as path from 'path';

describe('IncrementNumberManager', () => {
  describe('T-001: Class Structure', () => {
    it('should export IncrementNumberManager class', () => {
      expect(IncrementNumberManager).toBeDefined();
      expect(typeof IncrementNumberManager).toBe('function');
    });

    it('should have static getNextIncrementNumber method', () => {
      expect(IncrementNumberManager.getNextIncrementNumber).toBeDefined();
      expect(typeof IncrementNumberManager.getNextIncrementNumber).toBe('function');
    });

    it('should have static incrementNumberExists method', () => {
      expect(IncrementNumberManager.incrementNumberExists).toBeDefined();
      expect(typeof IncrementNumberManager.incrementNumberExists).toBe('function');
    });

    it('should have static clearCache method', () => {
      expect(IncrementNumberManager.clearCache).toBeDefined();
      expect(typeof IncrementNumberManager.clearCache).toBe('function');
    });
  });
});
