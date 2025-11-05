---
id: frontend-category
title: Frontend Development
sidebar_label: Frontend Development
---

# Frontend Development

Understanding client-side application development, UI frameworks, and user experiences.

---

## Overview

Frontend development terms cover client-side logic, UI frameworks, state management, and user interface implementation. These concepts enable teams to build responsive, accessible, performant web applications that deliver excellent user experiences.

## Core Concepts

### Modern Frameworks

**[React](/docs/glossary/terms/react)**
- Component-based UI library
- Virtual DOM for performance
- Declarative programming model
- Most popular frontend framework
- SpecWeave plugin: `specweave-frontend` (planned)

**[Next.js](/docs/glossary/terms/nextjs)**
- React framework for production
- Features: SSR, SSG, API routes, file-based routing
- Best for: SEO-critical apps, full-stack React
- SpecWeave docs site uses Next.js (Docusaurus)

**[Angular](/docs/glossary/terms/angular)**
- Full-featured framework by Google
- TypeScript-first, opinionated structure
- Best for: enterprise applications, large teams
- When to use: need full framework, TypeScript required

**Vue.js**
- Progressive JavaScript framework
- Easier learning curve than React/Angular
- Best for: smaller projects, rapid development
- When to use: less complex apps, smaller teams

### Rendering Strategies

**[SPA (Single Page Application)](/docs/glossary/terms/spa)**
- Client-side rendering only
- All routing happens in browser
- Fast navigation after initial load
- Trade-off: SEO challenges, slow initial load

**[SSR (Server-Side Rendering)](/docs/glossary/terms/ssr)**
- HTML rendered on server for each request
- Benefits: SEO, fast initial load
- Trade-off: server load, higher complexity
- Tools: Next.js, Remix, SvelteKit

**[SSG (Static Site Generation)](/docs/glossary/terms/ssg)**
- HTML generated at build time
- Benefits: fastest performance, cheapest hosting
- Best for: blogs, documentation, marketing sites
- SpecWeave docs site uses SSG (Docusaurus)

### State Management

**[Redux](/docs/glossary/terms/redux)**
- Predictable state container
- Centralized state, time-travel debugging
- Best for: complex state, multiple components
- Trade-off: boilerplate, learning curve

**[Context API](/docs/glossary/terms/context-api)**
- React's built-in state management
- Simpler than Redux for small apps
- Best for: simple global state, theme, auth
- When to use: small/medium apps

**[Zustand](/docs/glossary/terms/zustand)**
- Minimal state management library
- Less boilerplate than Redux
- Best for: medium apps, want simplicity
- When to use: Redux too complex, Context too simple

### Styling Approaches

**[CSS Modules](/docs/glossary/terms/css-modules)**
- Scoped CSS by default
- Prevents naming conflicts
- Works with any framework
- Best for: traditional CSS workflow

**[Tailwind CSS](/docs/glossary/terms/tailwind)**
- Utility-first CSS framework
- Fast development, consistent design
- Trade-off: HTML classes verbose
- SpecWeave docs site uses Tailwind

**[Styled Components](/docs/glossary/terms/styled-components)**
- CSS-in-JS solution
- Component-scoped styles
- Dynamic styling with props
- Best for: React apps, complex theming

---

## When to Use These Terms

| Term | Use When | Don't Use When |
|------|----------|----------------|
| **React** | Component reusability, large ecosystem | Simple websites, SEO-critical |
| **Next.js** | SEO important, need SSR/SSG | Simple SPA, no SEO requirements |
| **SPA** | App-like experience, no SEO needs | Content-heavy sites, SEO critical |
| **SSR** | SEO + dynamic content | Static content, no server available |
| **SSG** | Static content, blogs, docs | Frequently changing data |
| **Redux** | Complex state, multiple components | Simple apps, small state |
| **Tailwind** | Rapid development, consistent design | Custom design system, minimal CSS |

---

## Real-World Examples

### Building a SaaS Dashboard

**Phase 1: MVP (0-3 months)** - Simple SPA

```tsx
// Simple React SPA with Context API
import { createContext, useContext, useState } from 'react';

// Global state with Context API
const AuthContext = createContext(null);

function App() {
  const [user, setUser] = useState(null);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      <Dashboard />
    </AuthContext.Provider>
  );
}

function Dashboard() {
  const { user } = useContext(AuthContext);

  if (!user) return <Login />;

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <UserStats userId={user.id} />
      <RecentActivity userId={user.id} />
    </div>
  );
}
```

**Why this works for MVP**:
- ✅ Fast development (minimal tooling)
- ✅ Simple state management (Context API)
- ✅ Good for app-like experience
- ❌ No SEO (doesn't matter for authenticated dashboard)

**Phase 2: Growth (6-12 months)** - Add State Management

```tsx
// Switch to Zustand for complex state
import create from 'zustand';

// Global store
const useStore = create((set) => ({
  user: null,
  notifications: [],
  settings: {},

  setUser: (user) => set({ user }),
  addNotification: (notification) =>
    set((state) => ({
      notifications: [...state.notifications, notification]
    })),
  updateSettings: (newSettings) =>
    set((state) => ({
      settings: { ...state.settings, ...newSettings }
    }))
}));

function Dashboard() {
  const { user, notifications } = useStore();

  return (
    <div>
      <Header user={user} />
      <NotificationBadge count={notifications.length} />
      <MainContent />
    </div>
  );
}
```

**Why upgrade**:
- ✅ Multiple components need same state
- ✅ Complex state updates
- ✅ Better performance (selective re-renders)

**Phase 3: Scale (12+ months)** - Optimize Performance

```tsx
// Add React Query for server state
import { useQuery } from '@tanstack/react-query';

function Dashboard() {
  // Server state managed by React Query
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: fetchUser
  });

  const { data: stats } = useQuery({
    queryKey: ['stats', user?.id],
    queryFn: () => fetchStats(user.id),
    enabled: !!user // Only fetch when user exists
  });

  // UI state in Zustand
  const { theme, sidebarOpen } = useStore();

  return (
    <div className={theme}>
      <Sidebar open={sidebarOpen} />
      <Main stats={stats} />
    </div>
  );
}
```

**Optimizations**:
- ✅ React Query for server state (caching, background updates)
- ✅ Code splitting (lazy load routes)
- ✅ Memoization (React.memo, useMemo)
- ✅ Virtual scrolling for large lists

### SpecWeave Frontend Increment Example

```markdown
# Increment 0020: User Dashboard UI

## Acceptance Criteria
- **AC-US1-01**: Display user profile (name, avatar, email) (P1)
- **AC-US1-02**: Show recent activity (last 10 actions) (P1)
- **AC-US1-03**: Real-time notifications (WebSocket) (P2)
- **AC-US1-04**: Responsive design (mobile + desktop) (P1)

## Architecture Decisions

**ADR-020**: Use Next.js for Dashboard
- **Rationale**: Need SSR for SEO (public profile pages), API routes
- **Alternatives**: Create React App (no SSR), Remix (newer, less mature)
- **Trade-offs**: Framework lock-in vs developer experience

**ADR-021**: Use Zustand for State Management
- **Rationale**: Simpler than Redux, more powerful than Context
- **Alternatives**: Redux (too complex), Context API (too simple)
- **Trade-offs**: Less ecosystem vs simplicity

## Component Structure

```
src/
├── components/
│   ├── Dashboard/
│   │   ├── Dashboard.tsx          # Main container
│   │   ├── UserProfile.tsx        # User info display
│   │   ├── ActivityFeed.tsx       # Recent activity
│   │   └── NotificationBadge.tsx  # Real-time notifications
│   ├── shared/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── Avatar.tsx
│   └── layout/
│       ├── Header.tsx
│       └── Sidebar.tsx
├── hooks/
│   ├── useUser.ts                 # User data hook
│   ├── useActivity.ts             # Activity hook
│   └── useWebSocket.ts            # WebSocket connection
├── store/
│   └── userStore.ts               # Zustand store
└── styles/
    └── globals.css                # Tailwind + custom styles
```

## Implementation Plan

**T-001**: Set up Next.js project
- Initialize: `npx create-next-app@latest`
- Configure Tailwind CSS
- Set up folder structure
- Add ESLint + Prettier

**T-002**: Implement Dashboard layout
- Header component (user menu, notifications)
- Sidebar component (navigation)
- Main content area (responsive grid)
- Mobile menu (hamburger)

**T-003**: Build user profile component
- Fetch user data (React Query)
- Display avatar, name, email
- Loading states, error handling
- Responsive design

**T-004**: Add real-time notifications
- WebSocket connection (useWebSocket hook)
- Notification badge (unread count)
- Toast notifications (react-hot-toast)
- Sound alerts (optional)

## Test Plan (Embedded in tasks)

**Given** authenticated user → **When** load dashboard → **Then** profile + activity displayed

**Test Cases**:
- Unit: UserProfile.tsx, ActivityFeed.tsx (80% coverage)
- Integration: Dashboard page (fetch + display) (85% coverage)
- E2E: Full user flow (Playwright) (100% critical path)
  - Login → Dashboard → View profile → Check notifications
```

---

## How SpecWeave Uses Frontend Terms

### 1. Frontend-Specific Plugins

**specweave-frontend plugin** (planned):
- React/Next.js best practices
- Component boilerplate generation
- State management patterns
- Responsive design helpers

**specweave-figma plugin** (planned):
- Design system integration
- Component generation from Figma
- Design token export

### 2. Increment Planning for Frontend Features

When creating frontend increments:

```bash
/specweave:inc "User Profile Dashboard"
```

The Architect agent:
- Suggests frontend framework (React vs Vue vs Angular)
- Recommends state management (Zustand vs Redux vs Context)
- Includes component structure
- Plans responsive design
- Suggests testing strategy (Playwright for E2E)

### 3. Living Documentation

Frontend architecture is documented in:
```
.specweave/docs/internal/
├── architecture/
│   ├── component-architecture.md  # Component design
│   ├── state-management.md        # State strategy
│   └── adr/
│       ├── 0020-use-nextjs.md
│       └── 0021-zustand-over-redux.md
├── delivery/
│   └── design-system.md           # UI component library
└── operations/
    └── performance-monitoring.md  # Frontend metrics
```

### 4. Test-Aware Planning

Frontend increments include embedded tests:
```markdown
## T-005: Implement user profile component

**Test Plan** (BDD):
- **Given** user data → **When** render UserProfile → **Then** display name + avatar

**Test Cases**:
- Unit: UserProfile.tsx (80% coverage)
- Integration: Dashboard page (85% coverage)
- E2E: Full user flow (Playwright, 100% critical path)
- Visual: Screenshot comparison (Percy/Chromatic)
```

### 5. E2E Testing with Playwright

SpecWeave mandates E2E tests for UI features:

```typescript
// tests/e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test';

test('user can view dashboard', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('input[name="email"]', 'user@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  // Dashboard loads
  await expect(page).toHaveURL('/dashboard');

  // Profile displayed
  await expect(page.locator('h1')).toContainText('Welcome, John Doe');

  // Activity feed visible
  const activityItems = page.locator('[data-testid="activity-item"]');
  await expect(activityItems).toHaveCount(10);

  // Notifications working
  await page.click('[data-testid="notification-bell"]');
  await expect(page.locator('[data-testid="notification-dropdown"]')).toBeVisible();
});
```

---

## Related Categories

- **[Architecture & Design](/docs/glossary/categories/architecture-category)** - UI architecture patterns
- **[Testing & Quality](/docs/glossary/categories/testing-category)** - E2E testing strategies
- **[Performance & Scalability](/docs/glossary/categories/performance-category)** - Frontend optimization

---

## Learn More

### Guides
- React Best Practices (coming soon)
- Next.js Full-Stack Development (coming soon)
- State Management Patterns (coming soon)

### Books
- "Learning React" by Alex Banks & Eve Porcello
- "Fullstack React" by Anthony Accomazzo
- "CSS in Depth" by Keith J. Grant
- "Refactoring UI" by Adam Wathan & Steve Schoger

### External Resources
- [React Documentation](https://react.dev/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/)
- [Patterns.dev](https://www.patterns.dev/)
- [Web.dev Performance](https://web.dev/performance/)

---

**Navigation**:
- [← Back to Glossary](/docs/glossary/)
- [Browse by Category](/docs/glossary/index-by-category)
- [Alphabetical Index](/docs/glossary/README)
