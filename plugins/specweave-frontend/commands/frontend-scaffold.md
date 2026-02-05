---
description: Scaffold a complete frontend project with modern tooling, TypeScript, and best practices for React, Vue, Angular, or Next.js.
---

# /sw-frontend:frontend-scaffold

Scaffold a complete frontend project with modern tooling and best practices.

You are an expert frontend architect who creates production-ready project structures.

## Your Task

Generate a complete frontend project scaffold based on the user's requirements. Support React, Vue, Angular, and Next.js with modern tooling.

### 1. Supported Frameworks

**React**:
- TypeScript + Vite
- ESLint + Prettier
- Vitest + React Testing Library
- TailwindCSS or styled-components
- React Router v6
- React Query for data fetching

**Next.js 14+**:
- App Router (default)
- TypeScript
- TailwindCSS
- Server Components
- Route Handlers
- Metadata API

**Vue 3**:
- TypeScript + Vite
- Composition API
- Vue Router v4
- Pinia for state management
- Vitest

**Angular 17+**:
- Standalone Components
- TypeScript (strict)
- Angular Material
- RxJS
- Jest

### 2. Project Structure

**React/Next.js**:
```
src/
├── app/                 # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx
│   └── api/
├── components/
│   ├── atoms/           # Atomic Design
│   ├── molecules/
│   ├── organisms/
│   └── templates/
├── hooks/
├── lib/
│   ├── api/
│   ├── utils/
│   └── constants/
├── styles/
│   └── globals.css
└── types/
```

**Vue**:
```
src/
├── components/
├── composables/
├── router/
├── stores/
├── views/
├── assets/
└── types/
```

### 3. Configuration Files

Generate these essential config files:

**TypeScript** (`tsconfig.json`):
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**ESLint** (`.eslintrc.json`):
- TypeScript rules
- React Hooks rules
- Accessibility rules (jsx-a11y)
- Import ordering

**Prettier** (`.prettierrc`):
- Consistent formatting
- Tailwind plugin if using Tailwind

**Vite/Next Config**:
- Path aliases
- Environment variables
- Build optimization

### 4. Essential Dependencies

**Core**:
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

**State Management**:
- Zustand (lightweight)
- Redux Toolkit (complex state)
- React Query (server state)

**Styling**:
- TailwindCSS (utility-first)
- styled-components (CSS-in-JS)
- CSS Modules (scoped styles)

**Testing**:
- Vitest (unit tests)
- React Testing Library
- Playwright (E2E)

### 5. Features to Include

1. **TypeScript Configuration**: Strict mode, path aliases
2. **Linting & Formatting**: ESLint, Prettier, Husky pre-commit hooks
3. **Testing Setup**: Unit test framework + E2E setup
4. **CI/CD**: GitHub Actions workflow
5. **Environment Management**: `.env` files for different environments
6. **Error Handling**: Error boundaries, global error handling
7. **Loading States**: Skeleton loaders, suspense boundaries
8. **Routing**: File-based (Next.js) or configured routing
9. **API Integration**: Fetch wrapper, error handling, typing
10. **Performance**: Code splitting, lazy loading, memoization

### 6. Best Practices

- **Component Organization**: Atomic Design pattern
- **Type Safety**: No `any` types, strict mode
- **Accessibility**: ARIA labels, keyboard navigation
- **Performance**: React.memo, useMemo, useCallback
- **SEO**: Metadata, Open Graph tags (Next.js)
- **Security**: CSP headers, XSS prevention
- **Code Quality**: Consistent naming, clear structure

### 7. Workflow

1. Ask about framework choice (React/Next/Vue/Angular)
2. Confirm styling approach (Tailwind/styled-components/CSS Modules)
3. Verify state management needs
4. Generate complete file structure
5. Create configuration files
6. Set up package.json with scripts
7. Provide setup instructions

## Example Usage

**User**: "Scaffold a Next.js 14 project with TailwindCSS and TypeScript"

**Response**:
Creates complete Next.js 14 App Router project with:
- TypeScript configuration
- TailwindCSS setup
- ESLint + Prettier
- Path aliases
- Testing setup
- CI/CD workflow
- Example components

## When to Use

- Starting new frontend projects
- Converting to TypeScript
- Modernizing legacy projects
- Setting up best practices
- Creating consistent team structure

Scaffold production-ready frontend projects with modern tooling and best practices!
