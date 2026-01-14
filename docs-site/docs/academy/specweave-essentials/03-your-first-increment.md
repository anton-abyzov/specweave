---
sidebar_position: 4
slug: 03-your-first-increment
title: "Lesson 3: Your First Increment"
description: "Build a complete feature from start to finish"
---

# Lesson 3: Your First Increment

**Time**: 45 minutes
**Goal**: Complete a full [increment](/docs/glossary/terms/increments) cycle

---

## What We're Building

A **Dark Mode Toggle** — simple but complete:
- Toggle switch in settings
- Theme persists across sessions
- System preference detection

---

## Step 1: Create the Increment

```bash
/sw:increment "Add dark mode toggle"
```

### What Happens

SpecWeave orchestrates three agents:

```
PM Agent → spec.md (requirements)
Architect Agent → plan.md (design)
Tech Lead Agent → tasks.md (implementation)
```

You'll see output like:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATING INCREMENT: 0001-dark-mode-toggle
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PM Agent: ✓ 2 user stories, 6 acceptance criteria
Architect Agent: ✓ ThemeProvider design
Tech Lead Agent: ✓ 5 tasks created

Location: .specweave/increments/0001-dark-mode-toggle/
```

---

## Step 2: Review the Generated Specs

**Always review before implementing!**

```bash
cat .specweave/increments/0001-dark-mode-toggle/spec.md
```

You should see something like:

```markdown
---
increment: 0001-dark-mode-toggle
status: planning
---

# Dark Mode Toggle Feature

## User Stories

### US-001: Manual Theme Toggle

**As a** user,
**I want** to toggle between light and dark mode,
**So that** I can choose my preferred viewing experience.

#### Acceptance Criteria

- **AC-US1-01**: Toggle visible in settings
- **AC-US1-02**: Theme changes immediately on toggle
- **AC-US1-03**: Theme persists across refreshes
- **AC-US1-04**: Theme persists across sessions

### US-002: System Preference Detection

**As a** user with OS dark mode,
**I want** the app to detect my system preference,
**So that** it matches my device automatically.

#### Acceptance Criteria

- **AC-US2-01**: Detects system preference on first visit
- **AC-US2-02**: Manual toggle overrides system preference
```

:::tip Want changes?
Just tell Claude: "Add AC-US1-05 for animated transitions"
:::

---

## Step 3: Execute the Tasks

```bash
/sw:do
```

Watch as each task is completed:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXECUTING: 0001-dark-mode-toggle
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

T-001: Create ThemeProvider Context
├── Creating src/providers/ThemeProvider.tsx
├── Writing tests...
├── Tests: ✓ 4/4 passing
└── ✓ Complete

T-002: Implement CSS Variables
├── Creating src/styles/themes.css
└── ✓ Complete

T-003: Create ThemeToggle Component
├── Creating src/components/ThemeToggle.tsx
├── Tests: ✓ 3/3 passing
└── ✓ Complete

... (remaining tasks)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXECUTION COMPLETE: 5/5 tasks
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Step 4: Check Progress

```bash
/sw:progress
```

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INCREMENT: 0001-dark-mode-toggle
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tasks: 5/5 (100%)
Tests: 9/9 passing
Coverage: 94%

Status: Ready to close
```

---

## Step 5: Close the Increment

```bash
/sw:next
```

This runs the [quality gates](/docs/glossary/terms/acceptance-criteria):

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PM VALIDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Gate 1: Tasks ✅ (5/5 complete)
Gate 2: Tests ✅ (9/9 passing, 94% coverage)
Gate 3: Docs  ✅ (ACs checked, living docs synced)

RESULT: ✅ ALL GATES PASS

Auto-closing increment...
🎉 Increment 0001-dark-mode-toggle CLOSED!
```

---

## What Was Created

### Code Files

```
src/
├── providers/
│   └── ThemeProvider.tsx    # Theme context
├── components/
│   └── ThemeToggle.tsx      # Toggle component
└── styles/
    └── themes.css           # CSS variables

tests/
└── unit/
    ├── ThemeProvider.test.tsx
    └── ThemeToggle.test.tsx
```

### The ThemeProvider (Simplified)

```typescript
// src/providers/ThemeProvider.tsx
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
} | null>(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState<Theme>(() => {
    return localStorage.getItem('theme') as Theme || 'system';
  });

  useEffect(() => {
    const resolved = theme === 'system'
      ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    document.documentElement.setAttribute('data-theme', resolved);
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext)!;
```

### The ThemeToggle

```typescript
// src/components/ThemeToggle.tsx
import { useTheme } from '../providers/ThemeProvider';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const nextTheme = theme === 'light' ? 'dark' : 'light';

  return (
    <button onClick={() => setTheme(nextTheme)}>
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
```

---

## The Complete Workflow

You just completed a full cycle:

```
1. /sw:increment  → Created spec, plan, tasks
2. (Reviewed specs)      → Verified requirements
3. /sw:do         → Implemented all tasks
4. /sw:progress   → Checked status
5. /sw:next       → Validated and closed
```

**Total time**: ~30 minutes
**Result**: Working feature + full documentation + tests

---

## Try It Yourself

Choose a simple feature for your project:

**Easy ideas**:
- Add a "Back to top" button
- Add a loading spinner
- Add a "Copy to clipboard" button
- Add a simple notification toast

```bash
/sw:increment "Your feature here"
/sw:do
/sw:next
```

---

## Common Issues

### "Tests failing after generation"

```bash
npm test -- --verbose
# Then tell Claude to fix the specific errors
```

### "Spec doesn't match my needs"

```
"Update spec.md: change AC-US1-03 to require 500ms transition"
```

### "Want to add a task"

```
"Add T-006 to tasks.md: Write E2E test for theme toggle"
```

---

## Glossary Terms Used

- **[Increment](/docs/glossary/terms/increments)** — A unit of work
- **[Acceptance Criteria](/docs/glossary/terms/acceptance-criteria)** — Testable success conditions
- **[AC-ID](/docs/glossary/terms/ac-id)** — Acceptance criteria identifier
- **[Living Docs](/docs/glossary/terms/living-docs)** — Auto-synced documentation

---

## Key Takeaways

1. **One command** creates all specs: `/sw:increment`
2. **Review** before implementing
3. **Execute** with `/sw:do`
4. **Close** with `/sw:next` (validates quality gates)
5. **Everything documented** automatically

---

## What's Next?

You've completed your first increment! Next, master the `:next` command — your workflow compass.

**:next** → [Lesson 4: The :next Command](./04-the-next-command)
