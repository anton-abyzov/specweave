# Frontend Architect Agent

## Overview

The Frontend Architect agent is a specialized AI agent designed to help with frontend architecture decisions, component design, performance optimization, and modern frontend development patterns.

## When to Use This Agent

Invoke this agent when you need:

- **Architecture Design**: Component hierarchy, folder structure, state management strategy
- **Framework Selection**: Choosing between React/Next.js, Vue/Nuxt, or Angular
- **Performance Optimization**: Code splitting, lazy loading, bundle optimization
- **Design System Implementation**: Atomic Design, component libraries, theming
- **Migration Planning**: React Pages → App Router, Vue 2 → Vue 3, JavaScript → TypeScript
- **Micro-Frontend Architecture**: Module Federation, Single-SPA, independent deployments
- **Testing Strategy**: Unit, integration, E2E testing setup for frontend
- **Build Configuration**: Vite, Webpack, Turbopack setup and optimization
- **SEO & Accessibility**: Server-side rendering, metadata, WCAG compliance

## How to Invoke

Use the Task tool with `subagent_type`:

```typescript
Task({
  subagent_type: "specweave-frontend:frontend-architect:frontend-architect",
  prompt: "Design a component architecture for a dashboard application with real-time data updates"
});
```

## Agent Capabilities

### 1. Framework Expertise

**React Ecosystem**:
- React 18+ with Concurrent features
- Next.js 14+ App Router and Server Components
- State management (Zustand, Redux Toolkit, Jotai, React Query)
- Custom Hooks patterns

**Vue Ecosystem**:
- Vue 3 Composition API
- Nuxt 3 with Nitro engine
- Pinia state management
- Composables and auto-imports

**Angular Ecosystem**:
- Angular 17+ with standalone components
- Signals for reactivity
- RxJS reactive programming
- NgRx state management

### 2. Architecture Patterns

- **Atomic Design**: Organize components by complexity (Atoms → Molecules → Organisms → Templates → Pages)
- **Compound Components**: Flexible component composition
- **Smart vs Presentational**: Separation of concerns
- **Micro-Frontends**: Module Federation, Single-SPA
- **Design Systems**: Token architecture, multi-brand support

### 3. Performance Optimization

- Code splitting strategies (route-based, component-based)
- Lazy loading and dynamic imports
- Bundle optimization (tree shaking, vendor splitting)
- Image optimization (next/image, responsive images)
- Core Web Vitals (LCP, FID, CLS)
- Virtual scrolling for large lists

### 4. Build & Tooling

- Vite for lightning-fast development
- Webpack 5 with Module Federation
- Turbopack (Next.js)
- TypeScript strict mode configuration
- ESLint + Prettier + Husky

### 5. Testing

- Vitest for unit testing
- React/Vue Testing Library
- Playwright for E2E
- MSW for API mocking
- Storybook for component development

### 6. Styling Approaches

- CSS-in-JS (styled-components, Emotion, Vanilla Extract)
- Utility-first (TailwindCSS, UnoCSS)
- CSS Modules with composition
- Modern CSS (Variables, Container Queries, Cascade Layers)

### 7. SEO & Accessibility

- Server-side rendering strategies
- Metadata API (Next.js)
- Structured data (JSON-LD)
- ARIA labels and roles
- Keyboard navigation
- WCAG AA/AAA compliance

## Common Use Cases

### 1. Scaffold New Frontend Project

**Prompt**:
```
"Set up a Next.js 14 App Router project with TypeScript, TailwindCSS, Zustand for state management, and Playwright for E2E testing"
```

**What the agent provides**:
- Project structure with best practices
- Configuration files (tsconfig, eslint, prettier)
- Base components and layouts
- Testing infrastructure setup
- Deployment pipeline configuration

### 2. Design Component Architecture

**Prompt**:
```
"Design a reusable DataTable component with sorting, filtering, pagination, and virtual scrolling for 10,000+ rows"
```

**What the agent provides**:
- Component hierarchy (Atomic Design)
- Props interface design
- State management approach
- Performance optimization strategy
- Usage examples and documentation

### 3. Optimize Performance

**Prompt**:
```
"Analyze and optimize a React dashboard application with slow initial load (5s+) and laggy interactions"
```

**What the agent provides**:
- Performance audit checklist
- Bundle size analysis approach
- Code splitting recommendations
- Lazy loading strategy
- Caching optimization
- Monitoring setup (Core Web Vitals)

### 4. Implement Design System

**Prompt**:
```
"Create a design system with support for light/dark themes, 3 brand colors, and consistent spacing/typography across 20+ components"
```

**What the agent provides**:
- Design token architecture
- Theme configuration system
- Base components (atoms, molecules)
- Storybook setup
- Documentation guidelines

### 5. Migration Strategy

**Prompt**:
```
"Plan migration from React Pages Router to App Router for a 50+ page e-commerce application"
```

**What the agent provides**:
- Incremental migration strategy
- Compatibility analysis
- Server Components adoption plan
- Data fetching migration
- Testing strategy
- Rollback plan

## Example Workflows

### Workflow 1: New Feature Development

1. **Define Requirements**: Describe the feature and constraints
2. **Architecture Design**: Agent designs component structure
3. **Implementation Plan**: Breaking down into tasks
4. **Code Scaffolding**: Generate initial component templates
5. **Testing Strategy**: Unit + integration + E2E test plan
6. **Performance Review**: Ensure Core Web Vitals targets met

### Workflow 2: Performance Optimization

1. **Current State Analysis**: Measure existing metrics
2. **Bottleneck Identification**: Bundle size, render performance
3. **Optimization Plan**: Code splitting, lazy loading, caching
4. **Implementation**: Apply optimizations
5. **Measurement**: Compare before/after metrics
6. **Monitoring**: Set up ongoing tracking

### Workflow 3: Design System Creation

1. **Audit Existing Components**: Identify patterns and inconsistencies
2. **Define Design Tokens**: Colors, typography, spacing, shadows
3. **Create Base Components**: Atoms (Button, Input, Icon)
4. **Build Composite Components**: Molecules (Form Field, Card)
5. **Document Usage**: Storybook with examples
6. **Migration Plan**: Adopt design system across codebase

## Input Format

The agent expects a clear, specific prompt describing:

1. **Context**: What are you building? What framework?
2. **Requirements**: What features/constraints?
3. **Goals**: Performance targets, accessibility needs, SEO requirements
4. **Constraints**: Team size, timeline, existing tech stack

**Good prompt**:
```
"Design a React dashboard for financial data visualization with:
- Real-time WebSocket updates
- 10+ chart types (using D3.js)
- Responsive design (mobile, tablet, desktop)
- Dark mode support
- Target LCP < 2.5s
- Accessibility WCAG AA compliant
Existing stack: Next.js 14, TypeScript, TailwindCSS"
```

**Poor prompt**:
```
"Make a dashboard"
```

## Output Format

The agent provides:

1. **Architecture Overview**: High-level structure and decisions
2. **Component Hierarchy**: Atomic Design breakdown
3. **Technology Recommendations**: Libraries, tools, patterns
4. **Implementation Plan**: Step-by-step tasks
5. **Code Examples**: Scaffolding and patterns
6. **Testing Strategy**: Unit, integration, E2E approach
7. **Performance Checklist**: Optimization targets
8. **Documentation**: Usage guidelines

## Best Practices

### 1. TypeScript First
Always use TypeScript with strict mode for type safety.

### 2. Component Composition
Prefer composition over inheritance for flexibility.

### 3. Performance Budgets
Monitor and enforce bundle size limits (e.g., < 200KB initial JS).

### 4. Accessibility
Build with a11y from the start, not as afterthought.

### 5. Testing Pyramid
More unit tests, fewer E2E tests (70% unit, 20% integration, 10% E2E).

### 6. Code Splitting
Split by routes and heavy components for faster initial load.

### 7. Progressive Enhancement
Ensure basic functionality without JavaScript.

### 8. Documentation
Document complex components in Storybook with examples.

## Integration with SpecWeave

### Use with /specweave:increment

When planning a frontend feature increment:

```bash
# 1. Plan increment
/specweave:increment "Design and implement responsive navigation with mega menu"

# 2. Generate architectural plan
Task({
  subagent_type: "specweave-frontend:frontend-architect:frontend-architect",
  prompt: "Design component architecture for responsive navigation with mega menu supporting 100+ menu items, search, and multi-level dropdowns"
});

# 3. Implement based on architectural plan
/specweave:do
```

### Use with /specweave:qa

After implementation, validate architecture decisions:

```bash
# Run quality assessment
/specweave:qa 0123

# Agent checks:
# - Component modularity
# - Performance metrics
# - Accessibility compliance
# - Code splitting effectiveness
# - Bundle size
```

## Troubleshooting

### Issue: Agent recommends outdated patterns

**Solution**: Specify framework version explicitly in prompt
```
"Using Next.js 14 App Router (NOT Pages Router), design..."
```

### Issue: Recommendations too generic

**Solution**: Provide more context about constraints and requirements
```
"For a team of 3 developers with React experience, building a B2B SaaS dashboard with 50+ pages, using Next.js 14, TypeScript, and TailwindCSS..."
```

### Issue: Performance recommendations unclear

**Solution**: Specify performance targets
```
"Target: LCP < 2.5s, FID < 100ms, CLS < 0.1, initial bundle < 200KB"
```

## Advanced Usage

### Micro-Frontend Architecture

```typescript
Task({
  subagent_type: "specweave-frontend:frontend-architect:frontend-architect",
  prompt: `Design a micro-frontend architecture for an e-commerce platform with:
    - Product catalog (team A)
    - Shopping cart (team B)
    - Checkout flow (team C)
    - User profile (team D)
    Requirements:
    - Independent deployments per team
    - Shared design system
    - Module Federation (Webpack 5)
    - Cross-team communication via events`
});
```

### Monorepo Setup

```typescript
Task({
  subagent_type: "specweave-frontend:frontend-architect:frontend-architect",
  prompt: `Set up a Turborepo monorepo with:
    - 3 Next.js applications (marketing, dashboard, admin)
    - Shared UI component library (@acme/ui)
    - Shared utilities (@acme/utils)
    - Shared TypeScript config
    - Independent versioning per package
    - Build caching and parallel execution`
});
```

## Resources

- **React Docs**: https://react.dev
- **Next.js Docs**: https://nextjs.org/docs
- **Vue Docs**: https://vuejs.org
- **Angular Docs**: https://angular.io
- **Patterns.dev**: https://patterns.dev (Modern web patterns)
- **Web.dev**: https://web.dev (Performance, accessibility)

## Version History

- **v1.0.0** (2025-01-22): Initial release with React, Vue, Angular expertise
- **v1.1.0** (TBD): Add Svelte/SvelteKit support
- **v1.2.0** (TBD): Add mobile framework support (React Native, Flutter)

## Support

For issues or questions:
- GitHub Issues: https://github.com/anton-abyzov/specweave/issues
- Discord: https://discord.gg/specweave
- Documentation: https://spec-weave.com
