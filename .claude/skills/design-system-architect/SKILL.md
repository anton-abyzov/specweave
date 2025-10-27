---
name: design-system-architect
description: Expert guide for creating design systems using Atomic Design methodology. Defines design tokens (colors, typography, spacing, shadows, borders), component hierarchy (atoms/molecules/organisms), and ensures reusability. Activates for design system, atomic design, design tokens, reusable components, component library, design patterns.
---

# Design System Architect Skill

This skill helps you build scalable, reusable design systems following Atomic Design methodology.

## Design Token Categories

### 1. Colors

**Structure**: Primary (50-900 shades), Secondary, Semantic (success/warning/error/info), Neutral (gray)

**Naming**: `color-{category}-{shade}` (e.g., `color-primary-500`)

**Best Practices**:
- Use HSL for easier theme switching
- Ensure 4.5:1 contrast for text
- Provide dark mode alternatives

### 2. Typography

**Structure**: Font families, sizes (6 headings + 2 body), weights (300-900), line heights

**Naming**: `font-{property}-{variant}` (e.g., `font-size-heading1`)

**Type Scale**: Use 1.25 modular ratio (heading1: 2.25rem, heading2: 1.875rem, etc.)

### 3. Spacing

**Structure**: 4px/8px base scale (4, 8, 16, 24, 32, 48, 64, 96, 128)

**Naming**: `spacing-{value}` (e.g., `spacing-16`)

### 4. Shadows

**Structure**: Elevation levels (sm, md, lg, xl, 2xl)

**Values**: sm: 0 1px 2px, md: 0 4px 6px, lg: 0 10px 15px, xl: 0 20px 25px, 2xl: 0 25px 50px

### 5. Borders

**Structure**: Radius (sm, md, lg, full), Width (1px, 2px, 4px)

## Atomic Design Hierarchy

### Atoms (Smallest Components)

Typography, Buttons, Inputs, Icons, Badges, Avatars

**Guidelines**: Single responsibility, highly reusable, minimal props, no business logic

### Molecules (Combinations of Atoms)

FormField (Input + Label + Error), Card, NavItem, Dropdown, Modal

**Guidelines**: Compose atoms, single purpose, reusable, basic interaction logic

### Organisms (Complete UI Sections)

Navigation, Hero, Form, DataTable, Dashboard

**Guidelines**: Compose molecules/atoms, complex interactions, context-specific, business logic allowed

## Component Checklist

For each component, ensure:

✅ **Variants**: Default, hover, active, disabled, error states
✅ **Sizes**: sm, md, lg (minimum)
✅ **Accessibility**: ARIA labels, keyboard navigation, focus indicators, color contrast
✅ **Responsiveness**: Mobile-first, breakpoint handling, touch targets (44x44px min)
✅ **Documentation**: Description, usage guidelines, props documentation, examples

## Design System Template

```
design-system/
├── tokens/ (colors, typography, spacing, shadows, borders)
├── atoms/ (Button, Input, Typography, etc.)
├── molecules/ (FormField, Card, etc.)
├── organisms/ (Navigation, Hero, etc.)
└── documentation/ (overview, getting-started, components)
```

## Usage Guide

1. **Start with Tokens**: Define all design tokens, create light/dark variants, export as tokens.json
2. **Build Atoms**: Create smallest components, use tokens only, document variants
3. **Compose Molecules**: Combine atoms, add interaction logic, ensure reusability
4. **Assemble Organisms**: Build complex sections, use molecules/atoms, add business logic
5. **Document Everything**: Usage examples, props documentation, accessibility notes

## Integration with figma-designer

This skill guides the `figma-designer` agent in Advanced Mode:
1. Define tokens first
2. Create atoms with variants
3. Build molecules
4. Compose organisms
5. Export design system

## Test Cases

See `test-cases/` for validation scenarios.
