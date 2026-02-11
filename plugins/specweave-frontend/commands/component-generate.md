---
description: Generate React/Vue/Angular components with tests, Storybook stories, and documentation following Atomic Design principles.
---

# /sw-frontend:component-generate

Generate React/Vue/Angular components with tests, stories, and documentation following Atomic Design principles.

You are an expert frontend developer who creates well-structured, tested, and documented components.

## Your Task

Generate production-ready components with complete test coverage, Storybook stories, and documentation.

### 1. Component Types

**Atomic Design Levels**:
- **Atoms**: Basic UI elements (Button, Input, Icon, Text, Badge)
- **Molecules**: Simple component combinations (FormField, SearchBar, Card)
- **Organisms**: Complex components (Header, Form, DataTable, Modal)
- **Templates**: Page layouts (DashboardLayout, AuthLayout)

### 2. React Component Template

**TypeScript with Props Interface**:
```typescript
import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps {
  /**
   * Card title
   */
  title?: string;
  /**
   * Card content
   */
  children: React.ReactNode;
  /**
   * Card variant style
   */
  variant?: 'default' | 'outlined' | 'elevated';
  /**
   * Optional footer content
   */
  footer?: React.ReactNode;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Click handler
   */
  onClick?: () => void;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ title, children, variant = 'default', footer, className, onClick }, ref) => {
    const baseStyles = 'rounded-lg p-6 transition-all';

    const variants = {
      default: 'bg-white border border-gray-200',
      outlined: 'bg-transparent border-2 border-gray-300',
      elevated: 'bg-white shadow-lg hover:shadow-xl',
    };

    return (
      <div
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          onClick && 'cursor-pointer hover:border-blue-500',
          className
        )}
        onClick={onClick}
      >
        {title && (
          <h3 className="text-lg font-semibold mb-4 text-gray-900">{title}</h3>
        )}
        <div className="text-gray-700">{children}</div>
        {footer && (
          <div className="mt-4 pt-4 border-t border-gray-200">{footer}</div>
        )}
      </div>
    );
  }
);

Card.displayName = 'Card';
```

### 3. Component Test Template

**Comprehensive Testing**:
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  describe('Rendering', () => {
    it('renders children correctly', () => {
      render(<Card>Test content</Card>);
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('renders title when provided', () => {
      render(<Card title="Test Title">Content</Card>);
      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    it('renders footer when provided', () => {
      render(
        <Card footer={<button>Action</button>}>
          Content
        </Card>
      );
      expect(screen.getByText('Action')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('applies default variant styles', () => {
      const { container } = render(<Card>Content</Card>);
      expect(container.firstChild).toHaveClass('bg-white', 'border-gray-200');
    });

    it('applies outlined variant styles', () => {
      const { container } = render(<Card variant="outlined">Content</Card>);
      expect(container.firstChild).toHaveClass('border-2');
    });

    it('applies elevated variant styles', () => {
      const { container } = render(<Card variant="elevated">Content</Card>);
      expect(container.firstChild).toHaveClass('shadow-lg');
    });
  });

  describe('Interactions', () => {
    it('handles click events', () => {
      const onClick = vi.fn();
      render(<Card onClick={onClick}>Content</Card>);
      fireEvent.click(screen.getByText('Content'));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('applies hover styles when clickable', () => {
      const { container } = render(<Card onClick={() => {}}>Content</Card>);
      expect(container.firstChild).toHaveClass('cursor-pointer');
    });
  });

  describe('Accessibility', () => {
    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<Card ref={ref}>Content</Card>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });
});
```

### 4. Storybook Stories Template

**Interactive Documentation**:
```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { Card } from './Card';

const meta: Meta<typeof Card> = {
  title: 'Molecules/Card',
  component: Card,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'outlined', 'elevated'],
      description: 'Visual variant of the card',
    },
    onClick: {
      action: 'clicked',
    },
  },
  decorators: [
    (Story) => (
      <div className="p-8 bg-gray-50">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  args: {
    children: 'This is a default card with some content.',
  },
};

export const WithTitle: Story = {
  args: {
    title: 'Card Title',
    children: 'Card content goes here with a title above.',
  },
};

export const WithFooter: Story = {
  args: {
    title: 'Card with Footer',
    children: 'Main content area',
    footer: <button className="text-blue-600 hover:underline">Learn more</button>,
  },
};

export const Outlined: Story = {
  args: {
    variant: 'outlined',
    title: 'Outlined Card',
    children: 'This card has an outlined style.',
  },
};

export const Elevated: Story = {
  args: {
    variant: 'elevated',
    title: 'Elevated Card',
    children: 'This card has a shadow elevation effect.',
  },
};

export const Clickable: Story = {
  args: {
    title: 'Clickable Card',
    children: 'Click me to trigger an action!',
    onClick: () => alert('Card clicked!'),
  },
};

export const Complex: Story = {
  args: {
    title: 'User Profile',
    variant: 'elevated',
    children: (
      <div className="space-y-2">
        <p className="text-sm text-gray-600">John Doe</p>
        <p className="text-xs text-gray-500">john.doe@example.com</p>
        <div className="flex gap-2 mt-4">
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Admin</span>
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Active</span>
        </div>
      </div>
    ),
    footer: (
      <button className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
        View Profile
      </button>
    ),
  },
};
```

### 5. Vue 3 Component Template (Composition API)

```vue
<script setup lang="ts">
import { computed } from 'vue';

export interface CardProps {
  title?: string;
  variant?: 'default' | 'outlined' | 'elevated';
  footer?: boolean;
}

const props = withDefaults(defineProps<CardProps>(), {
  variant: 'default',
  footer: false,
});

const emit = defineEmits<{
  click: [];
}>();

const cardClasses = computed(() => {
  const base = 'rounded-lg p-6 transition-all';
  const variants = {
    default: 'bg-white border border-gray-200',
    outlined: 'bg-transparent border-2 border-gray-300',
    elevated: 'bg-white shadow-lg hover:shadow-xl',
  };
  return `${base} ${variants[props.variant]}`;
});

const handleClick = () => {
  emit('click');
};
</script>

<template>
  <div :class="cardClasses" @click="handleClick">
    <h3 v-if="title" class="text-lg font-semibold mb-4 text-gray-900">
      {{ title }}
    </h3>
    <div class="text-gray-700">
      <slot />
    </div>
    <div v-if="footer || $slots.footer" class="mt-4 pt-4 border-t border-gray-200">
      <slot name="footer" />
    </div>
  </div>
</template>
```

### 6. Angular Component Template

**TypeScript**:
```typescript
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export type CardVariant = 'default' | 'outlined' | 'elevated';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.css'],
})
export class CardComponent {
  @Input() title?: string;
  @Input() variant: CardVariant = 'default';
  @Input() footer?: string;
  @Output() cardClick = new EventEmitter<void>();

  get cardClasses(): string {
    const base = 'rounded-lg p-6 transition-all';
    const variants = {
      default: 'bg-white border border-gray-200',
      outlined: 'bg-transparent border-2 border-gray-300',
      elevated: 'bg-white shadow-lg hover:shadow-xl',
    };
    return `${base} ${variants[this.variant]}`;
  }

  onClick(): void {
    this.cardClick.emit();
  }
}
```

**HTML**:
```html
<div [class]="cardClasses" (click)="onClick()">
  <h3 *ngIf="title" class="text-lg font-semibold mb-4 text-gray-900">
    {{ title }}
  </h3>
  <div class="text-gray-700">
    <ng-content></ng-content>
  </div>
  <div *ngIf="footer" class="mt-4 pt-4 border-t border-gray-200">
    <ng-content select="[footer]"></ng-content>
  </div>
</div>
```

### 7. Component Documentation Template

**README.md**:
```markdown
# Card Component

A versatile card container component with multiple variants and optional footer.

## Features

- Multiple visual variants (default, outlined, elevated)
- Optional title and footer sections
- Clickable with hover effects
- Fully typed with TypeScript
- Responsive and accessible
- Comprehensive test coverage

## Usage

### React
\`\`\`tsx
import { Card } from '@/components/molecules/Card';

<Card title="Welcome" variant="elevated" onClick={handleClick}>
  <p>Card content here</p>
</Card>
\`\`\`

### Vue 3
\`\`\`vue
<Card title="Welcome" variant="elevated" @click="handleClick">
  <p>Card content here</p>
  <template #footer>
    <button>Action</button>
  </template>
</Card>
\`\`\`

### Angular
\`\`\`html
<app-card title="Welcome" variant="elevated" (cardClick)="handleClick()">
  <p>Card content here</p>
  <div footer>
    <button>Action</button>
  </div>
</app-card>
\`\`\`

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| title | string | - | Optional card title |
| variant | 'default' \| 'outlined' \| 'elevated' | 'default' | Visual style variant |
| footer | ReactNode/slot | - | Optional footer content |
| onClick | function | - | Click handler |

## Examples

See Storybook for interactive examples and all variants.

## Accessibility

- Semantic HTML structure
- Keyboard navigation support
- ARIA labels where appropriate
- Color contrast compliance (WCAG AA)

## Testing

Run tests:
\`\`\`bash
npm test Card.test.tsx
\`\`\`

Coverage: 95%+ (statements, branches, functions, lines)
```

### 8. Component File Structure

```
components/{level}/{ComponentName}/
├── index.ts                 # Barrel export
├── {ComponentName}.tsx      # Component implementation
├── {ComponentName}.test.tsx # Unit tests
├── {ComponentName}.stories.tsx # Storybook stories
├── {ComponentName}.module.css  # Scoped styles (if not using Tailwind)
└── README.md                # Documentation
```

### 9. Index Export

**index.ts**:
```typescript
export { Card } from './Card';
export type { CardProps } from './Card';
```

### 10. Component Checklist

Before considering a component complete:
- [ ] TypeScript interface with JSDoc comments
- [ ] All variants implemented and tested
- [ ] Unit tests with >80% coverage
- [ ] Storybook stories for all variants with realistic data
- [ ] README documentation
- [ ] Accessibility compliance (ARIA, keyboard nav)
- [ ] Responsive design
- [ ] Error states handled (styled fallbacks, never raw undefined/NaN)
- [ ] Loading states with skeleton shimmer (if applicable)
- [ ] Dark mode support (if applicable)
- [ ] Performance optimized (React.memo, useMemo)
- [ ] Images use placeholder URLs or AI-generated assets (never "No image" boxes)
- [ ] Numeric data uses Intl.NumberFormat (prices, dates, percentages)

## Workflow

1. Ask about component requirements (type, props, variants)
2. Determine Atomic Design level (atom/molecule/organism)
3. Generate component implementation
4. Create comprehensive unit tests
5. Add Storybook stories for all variants
6. Write documentation (README)
7. Implement accessibility features
8. Add to component index for easy imports

## Example Usage

**User**: "Generate a SearchBar molecule component with input and button"

**Response**:
Creates complete SearchBar component with:
- TypeScript implementation (React/Vue/Angular)
- Props interface (query, onSearch, placeholder, etc.)
- Unit tests (rendering, interactions, validation)
- Storybook stories (default, with results, loading state)
- README documentation
- Accessibility features (ARIA labels, keyboard shortcuts)
- Responsive design

## When to Use

- Creating new UI components
- Refactoring existing components to design system
- Building component libraries
- Ensuring consistent component structure
- Improving component documentation and testing

Generate production-ready components with complete tests and documentation!
