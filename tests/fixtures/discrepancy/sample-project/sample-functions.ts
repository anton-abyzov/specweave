/**
 * Sample TypeScript file for testing the analyzer.
 */

/**
 * Adds two numbers together.
 * @param a First number
 * @param b Second number
 * @returns Sum of a and b
 */
export function add(a: number, b: number): number {
  return a + b;
}

/**
 * Subtracts b from a.
 */
export const subtract = (a: number, b: number): number => {
  return a - b;
};

// Not exported - should not be detected
function privateHelper(x: number): number {
  return x * 2;
}

/**
 * User interface
 */
export interface User {
  id: string;
  name: string;
  email: string;
  age?: number;
}

/**
 * API Response type
 */
export type ApiResponse<T> = {
  success: boolean;
  data: T;
  error?: string;
};

/**
 * Calculator class
 */
export class Calculator {
  /**
   * Multiplies two numbers
   */
  multiply(a: number, b: number): number {
    return a * b;
  }

  /**
   * Divides a by b
   */
  async divide(a: number, b: number): Promise<number> {
    if (b === 0) throw new Error('Division by zero');
    return a / b;
  }
}
