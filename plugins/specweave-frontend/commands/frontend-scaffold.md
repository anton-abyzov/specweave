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

### 6. Demo-Ready Presentation (MANDATORY)

Every scaffolded project MUST be demoable immediately after setup. No broken visuals, no missing data.

**Data Formatting**:
- ALWAYS use `Intl.NumberFormat` for prices/currencies — NEVER display raw numbers that could show `$NaN`, `$undefined`, or `$null`
- Create a `formatPrice()` utility in `lib/utils` that handles edge cases:
```typescript
export function formatPrice(price: number | null | undefined, currency = 'USD', locale = 'en-US'): string {
  if (price == null || isNaN(price)) return 'Price unavailable';
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(price / 100);
}
```
- Apply the same defensive pattern to all displayed data — dates, percentages, counts

**Placeholder Images**:
- NEVER show "No image" text boxes or broken image icons. Use one of these approaches:
  1. **Unsplash** (free, high-quality): `https://images.unsplash.com/photo-{id}?w=600&h=400&fit=crop`
  2. **Picsum** (free, random): `https://picsum.photos/seed/{slug}/600/400`
  3. **AI-generated**: Invoke `/sw-media:image` to generate custom product/hero images
  4. **SVG placeholders**: Use tasteful gradient SVGs with subtle icons (not gray boxes)
- For e-commerce: provide 4-6 realistic product image URLs in seed data
- For dashboards: use chart/graph placeholder components with realistic mock data
- For landing pages: use hero images that match the brand aesthetic

**Seed Data Requirements**:
- Include a `lib/mock-data.ts` with realistic, complete seed data
- Every product must have: name, price (valid number), image URL, description
- Every user profile must have: name, avatar URL, email
- Use diverse, realistic names and data (not "Test User 1", "Product A")

**Loading & Error States**:
- Skeleton loaders with shimmer animation (not spinner-only)
- Error states must show helpful messages with retry actions
- Empty states must be visually designed, not just "No items found" text

### 7. Best Practices

- **Component Organization**: Atomic Design pattern
- **Type Safety**: No `any` types, strict mode
- **Accessibility**: ARIA labels, keyboard navigation
- **Performance**: React.memo, useMemo, useCallback
- **SEO**: Metadata, Open Graph tags (Next.js)
- **Security**: CSP headers, XSS prevention
- **Code Quality**: Consistent naming, clear structure

### 8. Workflow

1. Ask about framework choice (React/Next/Vue/Angular)
2. Confirm styling approach (Tailwind/styled-components/CSS Modules)
3. Verify state management needs
4. Generate complete file structure with mock data and placeholder images
5. Create configuration files
6. Set up package.json with scripts
7. Verify all pages render without NaN/undefined/broken images
8. Provide setup instructions

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
