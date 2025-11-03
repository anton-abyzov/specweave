---
name: figma-to-code
description: Design-to-code workflow patterns for Figma. Assumes Figma MCP server provides design data. Converts design tokens to CSS/TypeScript, scaffolds components following Atomic Design, generates tests, and integrates with SpecWeave living docs. Activates for figma to code, implement design, convert figma to react, design tokens, component generation, figma url.
---

# Figma to Code - Workflow Patterns

This skill provides workflow patterns for converting Figma designs to production-ready code.

**IMPORTANT**: This skill assumes the Figma MCP server is configured and providing design data. It does NOT fetch Figma data directly - that's handled by the MCP layer.

---

## Prerequisites

Before using this skill, ensure:

1. **Figma MCP Server is connected**:
   - Desktop: `http://127.0.0.1:3845/mcp` (Figma Desktop app)
   - OR Remote: `https://mcp.figma.com/mcp`

2. **Figma Access Token is set**:
   - Environment variable: `FIGMA_PERSONAL_ACCESS_TOKEN`
   - Get token from: Figma → Settings → Personal access tokens

3. **User provides Figma URL or file key**:
   - Full URL: `https://figma.com/file/ABC123/Design-System`
   - Or file key: `ABC123`

**Note**: If MCP is not configured, guide the user to enable it (see ARCHITECTURE.md).

---

## Supported Frameworks

- **React** (TypeScript + CSS Modules or Tailwind)
- **Angular** (Standalone Components + SCSS)
- **Vue** (Composition API + Scoped Styles)
- **Svelte** (TypeScript + Scoped Styles)

---

## Workflow Patterns

### Pattern 1: Extract Design Tokens

**When to use**: User wants to create/update design system tokens from Figma variables.

**Steps**:

1. **Use MCP to get Figma file data**:
   - MCP tool: `get-file(fileKey)`
   - Claude Code handles this automatically

2. **Extract Variables** → Map to token structure:

   **Colors**:
   ```typescript
   // Figma variable: color/primary/500 = #3b82f6
   // → CSS custom property:
   :root {
     --color-primary-500: #3b82f6;
   }

   // → TypeScript token:
   export const colors = {
     primary: {
       500: '#3b82f6'
     }
   };

   // → Tailwind config:
   theme: {
     extend: {
       colors: {
         primary: {
           500: '#3b82f6'
         }
       }
     }
   }
   ```

   **Typography**:
   ```typescript
   // Figma text style: Heading 1
   // Properties: 36px, Bold (700), 1.2 line-height, Inter font

   // → CSS:
   :root {
     --font-size-heading1: 2.25rem;  /* 36px */
     --line-height-heading1: 1.2;
     --font-weight-heading1: 700;
     --font-family-heading1: 'Inter', sans-serif;
   }

   // → TypeScript:
   export const typography = {
     heading1: {
       fontSize: '2.25rem',
       lineHeight: '1.2',
       fontWeight: '700',
       fontFamily: 'Inter, sans-serif'
     }
   };
   ```

   **Spacing**:
   ```typescript
   // Use 4px/8px grid system
   // Figma spacing values → Token scale

   :root {
     --spacing-1: 0.25rem;  /* 4px */
     --spacing-2: 0.5rem;   /* 8px */
     --spacing-3: 0.75rem;  /* 12px */
     --spacing-4: 1rem;     /* 16px */
     --spacing-6: 1.5rem;   /* 24px */
     --spacing-8: 2rem;     /* 32px */
     --spacing-12: 3rem;    /* 48px */
     --spacing-16: 4rem;    /* 64px */
   }
   ```

3. **Generate Token Files**:

   ```
   src/design-tokens/
   ├── theme.css              # CSS custom properties
   ├── tokens.ts              # TypeScript tokens
   ├── tailwind.config.ts     # Tailwind theme (if using Tailwind)
   └── types.ts               # TypeScript type definitions
   ```

4. **Update Living Docs**:
   - Document token naming conventions
   - Record design decisions (why these values?)
   - Link to Figma source of truth

---

### Pattern 2: Generate Component from Frame

**When to use**: User wants to convert a Figma component to code.

**Steps**:

1. **Analyze Figma Component Structure**:
   - Extract variants (e.g., Button: primary, secondary, text)
   - Extract properties (e.g., size: sm, md, lg)
   - Extract layout (Auto Layout → Flexbox/Grid)
   - Extract styles (fill, stroke, effects → CSS)

2. **Map to Component Props**:

   | Figma Property | React Prop | Angular Input | TypeScript Type |
   |----------------|------------|---------------|-----------------|
   | Variant | `variant` | `@Input() variant` | `'primary' \| 'secondary' \| 'text'` |
   | Boolean Property | `disabled` | `@Input() disabled` | `boolean` |
   | Text Content | `children` | `<ng-content>` | `ReactNode` |
   | Instance Swap | Component composition | Component usage | Component type |

3. **Generate Component Files**:

   **React Example** (Button component):

   ```typescript
   // src/components/atoms/Button/Button.tsx
   import React from 'react';
   import styles from './Button.module.css';

   export type ButtonVariant = 'primary' | 'secondary' | 'text';
   export type ButtonSize = 'sm' | 'md' | 'lg';

   export interface ButtonProps {
     variant?: ButtonVariant;
     size?: ButtonSize;
     disabled?: boolean;
     children: React.ReactNode;
     onClick?: () => void;
   }

   export const Button: React.FC<ButtonProps> = ({
     variant = 'primary',
     size = 'md',
     disabled = false,
     children,
     onClick
   }) => {
     return (
       <button
         className={`${styles.button} ${styles[variant]} ${styles[size]}`}
         disabled={disabled}
         onClick={onClick}
       >
         {children}
       </button>
     );
   };
   ```

   ```css
   /* src/components/atoms/Button/Button.module.css */
   .button {
     /* Base styles from Figma */
     font-family: var(--font-family-body);
     font-weight: var(--font-weight-medium);
     border-radius: var(--border-radius-md);
     transition: all 0.2s ease-in-out;
     cursor: pointer;
     border: none;
   }

   .primary {
     background-color: var(--color-primary-500);
     color: var(--color-white);
   }

   .primary:hover:not(:disabled) {
     background-color: var(--color-primary-600);
   }

   .sm {
     padding: var(--spacing-2) var(--spacing-4);
     font-size: var(--font-size-sm);
   }

   .md {
     padding: var(--spacing-3) var(--spacing-6);
     font-size: var(--font-size-base);
   }

   .lg {
     padding: var(--spacing-4) var(--spacing-8);
     font-size: var(--font-size-lg);
   }

   .button:disabled {
     opacity: 0.5;
     cursor: not-allowed;
   }
   ```

   ```typescript
   // src/components/atoms/Button/Button.test.tsx
   import { render, screen, fireEvent } from '@testing-library/react';
   import { Button } from './Button';

   describe('Button', () => {
     it('renders children', () => {
       render(<Button>Click me</Button>);
       expect(screen.getByText('Click me')).toBeInTheDocument();
     });

     it('calls onClick when clicked', () => {
       const handleClick = jest.fn();
       render(<Button onClick={handleClick}>Click me</Button>);
       fireEvent.click(screen.getByText('Click me'));
       expect(handleClick).toHaveBeenCalledTimes(1);
     });

     it('is disabled when disabled prop is true', () => {
       render(<Button disabled>Click me</Button>);
       expect(screen.getByText('Click me')).toBeDisabled();
     });

     it('applies variant class', () => {
       const { container } = render(<Button variant="secondary">Click me</Button>);
       expect(container.firstChild).toHaveClass('secondary');
     });
   });
   ```

   ```typescript
   // src/components/atoms/Button/index.ts
   export { Button } from './Button';
   export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';
   ```

4. **File Structure** (Atomic Design):

   ```
   src/components/
   ├── atoms/              # Basic building blocks
   │   ├── Button/
   │   ├── Input/
   │   ├── Label/
   │   └── Icon/
   ├── molecules/          # Simple combinations
   │   ├── FormField/
   │   ├── Card/
   │   └── MenuItem/
   └── organisms/          # Complex components
       ├── Navigation/
       ├── Hero/
       └── Form/
   ```

---

### Pattern 3: Convert Layout (Auto Layout → Flexbox/Grid)

**When to use**: Converting Figma frames with Auto Layout to CSS.

**Mapping Rules**:

| Figma Auto Layout | CSS Flexbox | Tailwind Classes |
|-------------------|-------------|------------------|
| Direction: Horizontal | `flex-direction: row` | `flex flex-row` |
| Direction: Vertical | `flex-direction: column` | `flex flex-col` |
| Spacing: 16px | `gap: 1rem` | `gap-4` |
| Padding: 24px | `padding: 1.5rem` | `p-6` |
| Align: Center | `align-items: center` | `items-center` |
| Justify: Space Between | `justify-content: space-between` | `justify-between` |

**Example**:

```typescript
// Figma: Auto Layout (Horizontal, gap=16, padding=24, align=center)

// → CSS:
.container {
  display: flex;
  flex-direction: row;
  gap: 1rem;
  padding: 1.5rem;
  align-items: center;
}

// → Tailwind:
<div className="flex flex-row gap-4 p-6 items-center">
  {/* content */}
</div>
```

---

### Pattern 4: Responsive Design (Constraints → Media Queries)

**When to use**: Converting Figma constraints to responsive CSS.

**Mapping**:

| Figma Constraint | CSS | Tailwind |
|------------------|-----|----------|
| Left + Right | `width: 100%` | `w-full` |
| Top + Bottom | `height: 100%` | `h-full` |
| Center | `margin: 0 auto` | `mx-auto` |
| Scale | `max-width: 100%; height: auto` | `max-w-full h-auto` |

**Responsive Breakpoints**:

```css
/* Mobile-first approach */
.component {
  /* Mobile styles (default) */
  width: 100%;
  padding: var(--spacing-4);
}

@media (min-width: 768px) {
  /* Tablet */
  .component {
    width: 50%;
    padding: var(--spacing-6);
  }
}

@media (min-width: 1024px) {
  /* Desktop */
  .component {
    max-width: 1200px;
    padding: var(--spacing-8);
    margin: 0 auto;
  }
}
```

---

## Best Practices

### 1. Use Design Tokens (Never Hardcode)

**❌ Wrong**:
```css
.button {
  background-color: #3b82f6;
  padding: 12px 24px;
  font-size: 16px;
}
```

**✅ Right**:
```css
.button {
  background-color: var(--color-primary-500);
  padding: var(--spacing-3) var(--spacing-6);
  font-size: var(--font-size-base);
}
```

**Why**: Enables theming, maintainability, consistency.

### 2. Type Safety (Generate TypeScript Interfaces)

**Always export types**:
```typescript
export type ButtonVariant = 'primary' | 'secondary' | 'text';
export type ButtonSize = 'sm' | 'md' | 'lg';
export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  children: ReactNode;
}
```

### 3. Accessibility (ARIA + Keyboard)

**Add ARIA labels**:
```typescript
<button
  aria-label="Close dialog"
  aria-disabled={disabled}
  onClick={onClick}
>
  {children}
</button>
```

**Support keyboard navigation**:
- All interactive elements focusable
- Tab order logical
- Enter/Space trigger actions

### 4. Component Structure (Co-locate Files)

**One component per folder**:
```
Button/
├── Button.tsx           # Component implementation
├── Button.module.css    # Styles
├── Button.test.tsx      # Tests
├── Button.stories.tsx   # Storybook (optional)
└── index.ts             # Public exports
```

### 5. Documentation (JSDoc + Usage Examples)

```typescript
/**
 * Button component with variants and sizes.
 *
 * @example
 * ```tsx
 * <Button variant="primary" size="md" onClick={handleClick}>
 *   Click me
 * </Button>
 * ```
 */
export const Button: React.FC<ButtonProps> = ({ ... }) => { ... };
```

---

## SpecWeave Integration

### Living Docs

After generating components, update living docs:

```markdown
# Component Library

## Button

**Source**: [Figma Button](https://figma.com/file/ABC123/Button)
**Status**: Implemented (2025-11-02)
**Location**: `src/components/atoms/Button/`

**Variants**:
- Primary: Main CTA actions
- Secondary: Secondary actions
- Text: Tertiary/subtle actions

**Design Decisions**:
- Rounded corners (8px) for friendly feel
- 2:1 padding ratio (horizontal:vertical) for better click targets
- Disabled state at 50% opacity (WCAG compliant)

**Implementation Notes**:
- Uses CSS Modules for scoping
- TypeScript for type safety
- React Testing Library for tests
```

### Increment Tracking

Track component implementation progress:

```yaml
# .specweave/increments/0006-design-system/tasks.md

- [x] T-001: Extract design tokens
- [x] T-002: Generate Button component
- [ ] T-003: Generate Input component
- [ ] T-004: Generate Card component
- [ ] T-005: Visual regression tests
```

### Test Generation

Generate test scaffolds:

```typescript
// Button.test.tsx (generated)
describe('Button', () => {
  it('matches Figma snapshot', () => {
    // Visual regression test
    const { container } = render(<Button>Text</Button>);
    expect(container).toMatchSnapshot();
  });

  it('handles all variants', () => {
    const variants: ButtonVariant[] = ['primary', 'secondary', 'text'];
    variants.forEach(variant => {
      render(<Button variant={variant}>Test</Button>);
      // Assert variant class applied
    });
  });
});
```

---

## Common Workflows

### Workflow 1: Bootstrap Design System

**User Request**: "Create a design system from this Figma file"

**Steps**:
1. Extract design tokens (colors, typography, spacing, shadows)
2. Generate token files (CSS + TypeScript)
3. Set up Tailwind config (if using Tailwind)
4. Create folder structure (atoms/molecules/organisms)
5. Generate Storybook setup (optional)
6. Update living docs with design decisions

### Workflow 2: Implement Single Component

**User Request**: "Implement this Button component from Figma"

**Steps**:
1. Analyze component (variants, properties, states)
2. Generate TypeScript interfaces
3. Scaffold component files (tsx, css, test)
4. Implement layout (Auto Layout → Flexbox)
5. Apply styles (tokens, not hardcoded values)
6. Generate test cases
7. Update component documentation

### Workflow 3: Update Existing Component

**User Request**: "Update Button to match latest Figma designs"

**Steps**:
1. Compare current code vs. Figma
2. Identify changes (new variants, style updates, prop changes)
3. Update TypeScript interfaces (if props changed)
4. Update styles (preserve custom properties usage)
5. Update tests (if behavior changed)
6. Document breaking changes (if any)

---

## Limitations

### What This Skill Does NOT Do

1. **❌ Fetch Figma data directly**
   - MCP handles this
   - Skill assumes data is provided

2. **❌ Handle authentication**
   - MCP server handles token auth
   - Skill doesn't touch credentials

3. **❌ Make design decisions**
   - Skill applies conventions, doesn't invent designs
   - Always defer to Figma as source of truth

4. **❌ Generate perfect pixel-perfect code**
   - Provides scaffold, human review needed
   - Some manual refinement expected

### When to Ask for Help

If MCP server is not connected:
> "I need Figma MCP server to be configured first. Please enable it in the Figma Desktop app or set up the remote server. See ARCHITECTURE.md for instructions."

If Figma URL is invalid:
> "This doesn't look like a valid Figma URL. Please provide a URL like: https://figma.com/file/ABC123/Design-Name"

If rate limits hit:
> "Figma API rate limit reached. Free accounts: 6 calls/month. Paid plans: Tier 1 limits. Try again later or upgrade your Figma plan."

---

## Test Cases

See `test-cases/` directory for validation scenarios:

1. **test-1-token-generation.yaml** - Extract design tokens
2. **test-2-component-generation.yaml** - Generate React component
3. **test-3-typescript-generation.yaml** - Generate TypeScript types

---

## References

- [Figma MCP Server Guide](https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server)
- [Figma Variables Documentation](https://help.figma.com/hc/en-us/articles/15339657135383-Guide-to-variables-in-Figma)
- [Atomic Design Methodology](https://atomicdesign.bradfrost.com/)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [Tailwind CSS](https://tailwindcss.com/)

---

**Last Updated**: 2025-11-02
**Status**: MCP-first workflow patterns
