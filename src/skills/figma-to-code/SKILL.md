---
name: figma-to-code
description: Converts Figma designs to production-ready code (React/Angular). Generates design tokens, components, and TypeScript interfaces from Figma files. Parses component hierarchy, maps properties to props, generates TypeScript types. Activates for figma to code, convert figma to react, figma to angular, implement design, code generation.
---

# Figma to Code Skill

This skill converts Figma designs to production-ready code (React/Angular).

## Supported Frameworks

- React (TypeScript)
- Angular (Standalone Components)
- Vue (Composition API) - coming soon
- Svelte - coming soon

## Conversion Process

### 1. Parse Figma Data

**Input**: Figma file metadata (from figma-mcp-connector)

**Extract**:
- Variables → Design tokens
- Components → Component hierarchy
- Styles → CSS/styling objects
- Properties → Component props

### 2. Generate Design Tokens

**For each token category**:

**Colors**:
```typescript
// Figma: color/primary/500 = #3b82f6
// → CSS: --color-primary-500: #3b82f6;
// → Tailwind: colors: { primary: { 500: '#3b82f6' } }
// → TypeScript: export const colors = { primary: { 500: '#3b82f6' } };
```

**Typography**:
```typescript
// Figma: Heading 1 (36px, Bold, 1.2 line height)
// → CSS: --font-size-heading1: 2.25rem; --line-height-heading1: 1.2; --font-weight-heading1: 700;
// → TypeScript: export const typography = { heading1: { fontSize: '2.25rem', lineHeight: '1.2', fontWeight: '700' } };
```

### 3. Generate Components

**Mapping**:

| Figma | React | Angular |
|-------|-------|---------|
| Component | Component | Component |
| Variant | Prop value | Input |
| Property | Prop | Input |
| Boolean | boolean prop | boolean Input |
| Text | children/prop | Content/Input |
| Instance | Component usage | Component usage |

**Example**: Figma Button → React ButtonProps (variant, size, disabled, children)

### 4. Generate Styles

**CSS Modules**:
```css
.button { @apply rounded-md font-medium transition-colors; }
.primary { @apply bg-primary-500 text-white hover:bg-primary-600; }
```

**Tailwind**: Utility-first classes
```typescript
const variantStyles = { primary: 'bg-primary-500 text-white hover:bg-primary-600' };
```

### 5. Generate TypeScript Interfaces

**Export all types**:
```typescript
export type ButtonVariant = 'primary' | 'secondary' | 'text';
export type ButtonSize = 'sm' | 'md' | 'lg';
export interface ButtonProps { variant?: ButtonVariant; size?: ButtonSize; ... }
```

## Layout Conversion

### Auto Layout → Flexbox/Grid

**Figma Auto Layout**: Direction, spacing, padding, alignment
**→ CSS**: `display: flex; flex-direction: row; gap: 1rem; padding: 1.5rem; align-items: center;`
**→ Tailwind**: `flex flex-row gap-4 p-6 items-center`

### Constraints → Responsive Design

**Figma Constraints**: Left + Right → `w-full`, Top + Bottom → `h-full`, Center → `mx-auto`

## Best Practices

1. **Use Design Tokens**: Never hardcode values, reference tokens, support theme switching
2. **Type Safety**: Generate TypeScript interfaces, export all types, use strict mode
3. **Accessibility**: Add ARIA labels, support keyboard navigation, ensure color contrast
4. **Component Structure**: One component per file, co-locate styles/types, export from index.ts
5. **Documentation**: JSDoc comments, usage examples, props documentation

## Output Structure

```
src/
├── design-tokens/ (tokens.ts, theme.css, types.ts)
├── components/
│   ├── atoms/ (Button/, Input/, ...)
│   ├── molecules/ (FormField/, Card/, ...)
│   └── organisms/ (Navigation/, Hero/, ...)
└── types/ (design-system.ts)
```

## Integration with figma-implementer

This skill is used by the `figma-implementer` agent to:
1. Parse Figma component data
2. Generate design token files
3. Create component scaffolds
4. Map Figma properties to props
5. Generate TypeScript interfaces

## Test Cases

See `test-cases/` for validation scenarios.
