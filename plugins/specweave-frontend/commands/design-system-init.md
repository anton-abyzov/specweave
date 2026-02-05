---
description: Initialize a complete design system with Atomic Design principles, design tokens, theming, and component library foundation.
---

# /sw-frontend:design-system-init

Initialize a complete design system with Atomic Design principles, design tokens, and component library.

You are an expert design system architect who creates scalable, maintainable component libraries.

## Your Task

Create a production-ready design system foundation with design tokens, theming, and Atomic Design component structure.

### 1. Design System Architecture

**Atomic Design Hierarchy**:
```
src/components/
├── atoms/               # Basic building blocks
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.test.tsx
│   │   ├── Button.stories.tsx
│   │   └── index.ts
│   ├── Input/
│   ├── Text/
│   └── Icon/
├── molecules/           # Simple component groups
│   ├── FormField/       # Label + Input + Error
│   ├── SearchBar/       # Input + Button
│   └── Card/
├── organisms/           # Complex components
│   ├── Header/
│   ├── Footer/
│   ├── Form/
│   └── Navigation/
├── templates/           # Page layouts
│   ├── DashboardLayout/
│   ├── AuthLayout/
│   └── MarketingLayout/
└── pages/               # Full pages (if not using framework routing)
```

### 2. Design Tokens

**tokens/colors.ts**:
```typescript
export const colors = {
  // Brand colors
  brand: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      500: '#3b82f6',
      600: '#2563eb',
      900: '#1e3a8a',
    },
    secondary: {
      50: '#f0fdf4',
      500: '#22c55e',
      900: '#14532d',
    },
  },
  // Neutral colors
  neutral: {
    white: '#ffffff',
    black: '#000000',
    50: '#fafafa',
    100: '#f5f5f5',
    500: '#737373',
    900: '#171717',
  },
  // Semantic colors
  semantic: {
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
} as const;
```

**tokens/typography.ts**:
```typescript
export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['Roboto Mono', 'monospace'],
  },
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    none: 1,
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;
```

**tokens/spacing.ts**:
```typescript
export const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
} as const;
```

**tokens/index.ts**:
```typescript
export { colors } from './colors';
export { typography } from './typography';
export { spacing } from './spacing';
export { breakpoints } from './breakpoints';
export { shadows } from './shadows';
export { radii } from './radii';
export { transitions } from './transitions';
```

### 3. Theme Configuration

**theme/index.ts**:
```typescript
import { colors, typography, spacing } from '../tokens';

export const theme = {
  colors,
  typography,
  spacing,
  components: {
    Button: {
      variants: {
        primary: {
          bg: colors.brand.primary[500],
          color: colors.neutral.white,
          hover: {
            bg: colors.brand.primary[600],
          },
        },
        secondary: {
          bg: 'transparent',
          color: colors.brand.primary[500],
          border: `1px solid ${colors.brand.primary[500]}`,
          hover: {
            bg: colors.brand.primary[50],
          },
        },
        ghost: {
          bg: 'transparent',
          color: colors.neutral[700],
          hover: {
            bg: colors.neutral[100],
          },
        },
      },
      sizes: {
        sm: {
          height: '32px',
          px: spacing[3],
          fontSize: typography.fontSize.sm,
        },
        md: {
          height: '40px',
          px: spacing[4],
          fontSize: typography.fontSize.base,
        },
        lg: {
          height: '48px',
          px: spacing[6],
          fontSize: typography.fontSize.lg,
        },
      },
    },
  },
} as const;

export type Theme = typeof theme;
```

### 4. Component Template (Button)

**components/atoms/Button/Button.tsx**:
```typescript
import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

    const variants = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
      secondary: 'border border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500',
      ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    };

    const sizes = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-base',
      lg: 'h-12 px-6 text-lg',
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          (disabled || isLoading) && 'opacity-50 cursor-not-allowed',
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <LoadingSpinner className="mr-2" />}
        {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

**components/atoms/Button/Button.test.tsx**:
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows loading state', () => {
    render(<Button isLoading>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies variant styles', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-blue-600');

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toHaveClass('border-blue-600');
  });
});
```

### 5. Storybook Integration

**components/atoms/Button/Button.stories.tsx**:
```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Atoms/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Button',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button',
  },
};

export const Loading: Story = {
  args: {
    variant: 'primary',
    isLoading: true,
    children: 'Loading...',
  },
};

export const WithIcons: Story = {
  args: {
    variant: 'primary',
    leftIcon: <IconPlus />,
    children: 'Add Item',
  },
};
```

### 6. Utility Function (cn)

**lib/utils.ts**:
```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### 7. TailwindCSS Configuration

**tailwind.config.ts**:
```typescript
import type { Config } from 'tailwindcss';
import { colors, typography, spacing } from './src/tokens';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: colors.brand,
        neutral: colors.neutral,
      },
      fontFamily: typography.fontFamily,
      fontSize: typography.fontSize,
      spacing,
    },
  },
  plugins: [],
};

export default config;
```

### 8. Documentation Template

**components/atoms/Button/README.md**:
```markdown
# Button Component

A versatile button component with multiple variants and sizes.

## Usage

\`\`\`tsx
import { Button } from '@/components/atoms/Button';

<Button variant="primary" size="md" onClick={handleClick}>
  Click me
</Button>
\`\`\`

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | 'primary' \| 'secondary' \| 'ghost' \| 'danger' | 'primary' | Button style variant |
| size | 'sm' \| 'md' \| 'lg' | 'md' | Button size |
| isLoading | boolean | false | Shows loading spinner |
| leftIcon | ReactNode | - | Icon before text |
| rightIcon | ReactNode | - | Icon after text |

## Examples

See Storybook for interactive examples.
```

### 9. Essential Dependencies

```json
{
  "dependencies": {
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  },
  "devDependencies": {
    "@storybook/react": "^7.6.0",
    "@testing-library/react": "^14.0.0",
    "tailwindcss": "^3.4.0"
  }
}
```

### 10. Component Checklist

For each component, ensure:
- [ ] TypeScript props interface with JSDoc
- [ ] Accessibility (ARIA labels, keyboard navigation)
- [ ] Unit tests (>80% coverage)
- [ ] Storybook stories
- [ ] README documentation
- [ ] Responsive design
- [ ] Dark mode support (if applicable)
- [ ] Performance optimized (React.memo if needed)

## Workflow

1. Ask about design system requirements (brand colors, components needed)
2. Generate design tokens (colors, typography, spacing)
3. Set up theme configuration
4. Create component structure (Atomic Design)
5. Implement essential atoms (Button, Input, Text, Icon)
6. Add Storybook for component documentation
7. Configure Tailwind with design tokens
8. Provide usage guidelines and examples

## Example Usage

**User**: "Initialize a design system with blue brand color and Atomic Design"

**Response**:
Creates complete design system with:
- Design tokens (colors, typography, spacing)
- Theme configuration
- Atomic Design component structure
- Button, Input, Text components
- Storybook setup
- TailwindCSS integration
- Testing setup
- Documentation templates

## When to Use

- Starting new design systems
- Standardizing component libraries
- Rebranding existing applications
- Creating white-label products
- Building component libraries for teams

Build scalable, maintainable design systems with Atomic Design principles!
