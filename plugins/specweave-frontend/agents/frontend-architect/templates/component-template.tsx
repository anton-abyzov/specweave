/**
 * React Component Template
 *
 * This template provides a starting point for creating well-structured,
 * type-safe React components following best practices.
 *
 * Usage:
 * 1. Copy this template to your components directory
 * 2. Rename file and component
 * 3. Define props interface
 * 4. Implement component logic
 * 5. Add tests and Storybook stories
 */

import React from 'react';
import { cn } from '@/lib/utils'; // Utility for className merging (clsx + tailwind-merge)

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the ComponentName component
 *
 * @property prop1 - Description of prop1
 * @property prop2 - Description of prop2 (optional)
 * @property className - Additional CSS classes (optional)
 * @property children - React children (optional)
 */
export interface ComponentNameProps {
  /** Required prop with specific type */
  prop1: string;

  /** Optional prop with default value */
  prop2?: number;

  /** Callback function */
  onAction?: (value: string) => void;

  /** Additional CSS classes for customization */
  className?: string;

  /** React children */
  children?: React.ReactNode;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_PROP2 = 42;

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * ComponentName - Brief description of what this component does
 *
 * More detailed description of the component's purpose, use cases,
 * and any important implementation notes.
 *
 * @example
 * ```tsx
 * <ComponentName
 *   prop1="value"
 *   prop2={100}
 *   onAction={(value) => console.log(value)}
 * >
 *   Content
 * </ComponentName>
 * ```
 */
export const ComponentName = React.forwardRef<
  HTMLDivElement,
  ComponentNameProps
>(
  (
    {
      prop1,
      prop2 = DEFAULT_PROP2,
      onAction,
      className,
      children,
      ...restProps
    },
    ref
  ) => {
    // ========================================================================
    // STATE
    // ========================================================================

    const [internalState, setInternalState] = React.useState<string>('');

    // ========================================================================
    // EFFECTS
    // ========================================================================

    React.useEffect(() => {
      // Side effects here
    }, [prop1]);

    // ========================================================================
    // HANDLERS
    // ========================================================================

    const handleClick = React.useCallback(() => {
      if (onAction) {
        onAction(internalState);
      }
    }, [internalState, onAction]);

    // ========================================================================
    // RENDER
    // ========================================================================

    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          'rounded-lg border bg-white p-4 shadow-sm',
          // Conditional styles
          prop2 > 50 && 'border-blue-500',
          // Custom className
          className
        )}
        {...restProps}
      >
        <h2 className="text-lg font-semibold">{prop1}</h2>
        <p className="text-sm text-gray-600">Value: {prop2}</p>

        {children && <div className="mt-4">{children}</div>}

        <button
          onClick={handleClick}
          className="mt-4 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          Click Me
        </button>
      </div>
    );
  }
);

ComponentName.displayName = 'ComponentName';

// ============================================================================
// EXPORTS
// ============================================================================

export default ComponentName;
