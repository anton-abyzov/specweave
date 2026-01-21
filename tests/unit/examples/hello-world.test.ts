import { describe, it, expect } from 'vitest';
import { hello } from '../../../src/examples/hello-world.js';

describe('hello-world', () => {
  it('should return Hello, World!', () => {
    expect(hello()).toBe('Hello, World!');
  });
});
