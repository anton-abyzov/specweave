# Dual Docusaurus Architecture Design

**Date**: 2025-11-04
**Increment**: 0008-user-education-faq
**Purpose**: Enable separate documentation sites for internal (engineering) and public (user-facing) content

---

## Problem Statement

Currently, SpecWeave has:
- ✅ **Public docs site** (`docs-site/`) serving `.specweave/docs/public/` on port 3013, deployed to spec-weave.com
- ✅ **Internal docs** (`.specweave/docs/internal/`) with no local preview capability
- ❌ **No way to browse internal docs** in a nice UI locally

**User Need**: "I want to view my internal architecture docs (ADRs, HLD, strategy) locally in a nice UI like Docusaurus, separate from public docs"

---

## Solution Architecture

### Overview

Create **TWO independent Docusaurus instances**:

```
specweave/
├── docs-site/              # PUBLIC DOCS (existing)
│   ├── docusaurus.config.ts
│   ├── package.json
│   └── docs/ → ../.specweave/docs/public/  (symlink/config)
│
└── docs-site-internal/     # INTERNAL DOCS (new)
    ├── docusaurus.config.ts
    ├── package.json
    └── docs/ → ../.specweave/docs/internal/  (symlink/config)
```

### Key Design Decisions

| Aspect | Public Docs | Internal Docs |
|--------|-------------|---------------|
| **Directory** | `docs-site/` | `docs-site-internal/` |
| **Source** | `.specweave/docs/public/` | `.specweave/docs/internal/` |
| **Port** | 3013 (existing) | 3015 (new) |
| **Deployment** | ✅ Deployed to spec-weave.com | ❌ Local only (never deployed) |
| **Access** | 🌍 Public internet | 🔒 Local development only |
| **Search** | Algolia (public) | Local search plugin |
| **Versioning** | Yes (for releases) | No (latest only) |
| **Build** | CI/CD on push to main | Manual/on-demand |

---

## Implementation Plan

### Phase 1: Create Internal Docs Site

```bash
# 1. Create new Docusaurus instance
npx create-docusaurus@latest docs-site-internal classic --typescript

# 2. Configure for internal docs
cd docs-site-internal
```

**Key config differences** (`docusaurus.config.ts`):

```typescript
const config: Config = {
  title: 'SpecWeave Internal Docs',
  tagline: 'Engineering Playbook & Architecture',

  // NO PUBLIC DEPLOYMENT!
  url: 'http://localhost',
  baseUrl: '/',

  // Different port
  scripts: {
    "start": "docusaurus start --port 3015"
  },

  presets: [
    [
      'classic',
      {
        docs: {
          // Point to internal docs
          path: '../.specweave/docs/internal',
          routeBasePath: 'docs',

          // NO EDIT LINKS (internal only)
          editUrl: undefined,

          showLastUpdateTime: true,
        },

        // NO BLOG for internal docs
        blog: false,

        theme: {
          customCss: './src/css/custom.css',
        },
      },
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'SpecWeave Internal',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'strategySidebar',
          label: 'Strategy',
        },
        {
          type: 'docSidebar',
          sidebarId: 'architectureSidebar',
          label: 'Architecture',
        },
        {
          type: 'docSidebar',
          sidebarId: 'deliverySidebar',
          label: 'Delivery',
        },
        // ... other internal sections
      ],
    },

    // NO FOOTER LINKS (internal only)
    footer: {
      style: 'dark',
      copyright: `Internal Documentation - Not for public distribution`,
    },

    // Local search only (no Algolia)
    // TODO: Add @easyops-cn/docusaurus-search-local
  },
};
```

### Phase 2: Sidebar Configuration

Map internal docs structure to sidebar:

```typescript
// docs-site-internal/sidebars.ts
import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  // Strategy docs
  strategySidebar: [
    'strategy/README',
    {
      type: 'category',
      label: 'Product Requirements',
      items: [
        // Auto-generate from .specweave/docs/internal/strategy/
      ],
    },
  ],

  // Architecture docs
  architectureSidebar: [
    'architecture/README',
    {
      type: 'category',
      label: 'Architecture Decision Records',
      items: [
        // Auto-generate from .specweave/docs/internal/architecture/adr/
      ],
    },
    {
      type: 'category',
      label: 'Diagrams',
      items: [
        // Auto-generate from .specweave/docs/internal/architecture/diagrams/
      ],
    },
  ],

  // Delivery docs
  deliverySidebar: [
    'delivery/README',
    'delivery/branch-strategy',
    'delivery/code-review-standards',
    {
      type: 'category',
      label: 'Guides',
      items: [
        'delivery/guides/increment-lifecycle',
        'delivery/guides/tool-concept-mapping',
      ],
    },
  ],

  // Operations docs
  operationsSidebar: [
    'operations/README',
    // Auto-generate runbooks
  ],

  // Governance docs
  governanceSidebar: [
    'governance/README',
    // Auto-generate policies
  ],

  // Specs docs
  specsSidebar: [
    'specs/README',
    // Auto-generate spec files
  ],
};

export default sidebars;
```

### Phase 3: Package Management

**Separate package.json** for each site:

```json
// docs-site-internal/package.json
{
  "name": "docs-site-internal",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "docusaurus": "docusaurus",
    "start": "docusaurus start --port 3015",
    "build": "docusaurus build",
    "serve": "docusaurus serve --port 3015"
  },
  "dependencies": {
    "@docusaurus/core": "3.9.2",
    "@docusaurus/preset-classic": "3.9.2",
    "@docusaurus/theme-mermaid": "^3.9.2",
    "@easyops-cn/docusaurus-search-local": "^0.44.0",
    // ... other deps
  }
}
```

### Phase 4: Plugin & Skill Updates

Update `plugins/specweave-docs/skills/docusaurus/SKILL.md`:

**Add section**:

```markdown
## Dual Documentation Sites

SpecWeave supports TWO Docusaurus instances:

### 1. Public Docs (`docs-site/`)
- **Purpose**: User-facing documentation
- **Source**: `.specweave/docs/public/`
- **Port**: 3013
- **Deployment**: spec-weave.com (public)
- **Search**: Algolia
- **Commands**:
  ```bash
  cd docs-site
  npm start          # http://localhost:3013
  npm run build      # Production build
  ```

### 2. Internal Docs (`docs-site-internal/`)
- **Purpose**: Engineering playbook (ADRs, HLD, strategy)
- **Source**: `.specweave/docs/internal/`
- **Port**: 3015
- **Deployment**: ❌ NEVER deploy (local only)
- **Search**: Local search plugin
- **Commands**:
  ```bash
  cd docs-site-internal
  npm start          # http://localhost:3015
  npm run build      # Local build for validation
  ```

### Running Both Simultaneously

```bash
# Terminal 1: Public docs
cd docs-site && npm start

# Terminal 2: Internal docs
cd docs-site-internal && npm start

# Access:
# - Public: http://localhost:3013
# - Internal: http://localhost:3015
```
```

**Add commands** to `plugins/specweave-docs/`:

```bash
# commands/docs-internal-start.md
---
name: docs-internal-start
description: Start internal Docusaurus site on port 3015
---

# Start Internal Docs Site

Starts the internal documentation site for local browsing.

## Usage

```bash
/docs-internal-start
```

This will:
1. Navigate to `docs-site-internal/`
2. Run `npm start`
3. Open http://localhost:3015

## What You'll See

Internal documentation structure:
- **Strategy**: PRDs, OKRs, business rationale
- **Architecture**: ADRs, HLD, LLD, diagrams
- **Delivery**: Branch strategy, DORA metrics, CI/CD
- **Operations**: Runbooks, SLOs, incidents
- **Governance**: Security policies, compliance
- **Specs**: Feature specifications

## Commands

```bash
# Start (auto-reload)
npm start

# Build (validation)
npm run build

# Serve built site
npm run serve
```
```

### Phase 5: Integration Tests

Create test suite:

```typescript
// tests/integration/docusaurus/dual-site.test.ts
import { test, expect } from '@playwright/test';

test.describe('Dual Docusaurus Sites', () => {
  test('public docs site starts on port 3013', async ({ page }) => {
    await page.goto('http://localhost:3013');
    await expect(page.locator('h1')).toContainText('SpecWeave');

    // Check public docs content
    await page.click('text=Docs');
    await expect(page).toHaveURL(/.*\/docs\/.*/);
  });

  test('internal docs site starts on port 3015', async ({ page }) => {
    await page.goto('http://localhost:3015');
    await expect(page.locator('h1')).toContainText('SpecWeave Internal');

    // Check internal docs content
    await page.click('text=Architecture');
    await expect(page).toHaveURL(/.*\/docs\/architecture.*/);
  });

  test('public docs serve .specweave/docs/public/', async ({ page }) => {
    await page.goto('http://localhost:3013/docs/overview/introduction');

    // Verify public content
    await expect(page.locator('article')).toContainText('Introduction');
  });

  test('internal docs serve .specweave/docs/internal/', async ({ page }) => {
    await page.goto('http://localhost:3015/docs/architecture/README');

    // Verify internal content (ADRs, etc.)
    await expect(page.locator('article')).toContainText('Architecture');
  });

  test('both sites can run simultaneously', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Both should load
    await Promise.all([
      page1.goto('http://localhost:3013'),
      page2.goto('http://localhost:3015'),
    ]);

    // Both should be functional
    await expect(page1.locator('h1')).toBeVisible();
    await expect(page2.locator('h1')).toBeVisible();

    await context1.close();
    await context2.close();
  });

  test('internal docs have local search (no Algolia)', async ({ page }) => {
    await page.goto('http://localhost:3015');

    // Check for local search input (not Algolia)
    const searchInput = page.locator('input[type="search"]');
    await expect(searchInput).toBeVisible();

    // Verify NO Algolia branding
    await expect(page.locator('text=Search by Algolia')).not.toBeVisible();
  });

  test('public docs have Algolia search', async ({ page }) => {
    await page.goto('http://localhost:3013');

    // Check for Algolia search (if configured)
    // This might be pending Algolia setup
    const searchButton = page.locator('[aria-label*="Search"]');
    await expect(searchButton).toBeVisible();
  });
});
```

**Test spec** (`tests/specs/docusaurus/TC-001-dual-sites.yaml`):

```yaml
test_case_id: TC-001
name: Dual Docusaurus Sites
description: Verify public and internal docs sites work independently and simultaneously
priority: P1
type: integration

preconditions:
  - Both Docusaurus sites installed (npm install in each)
  - Public docs site running on port 3013
  - Internal docs site running on port 3015
  - .specweave/docs/public/ has content
  - .specweave/docs/internal/ has content

steps:
  - action: Start public docs site
    command: cd docs-site && npm start
    expected: Site starts on http://localhost:3013

  - action: Start internal docs site
    command: cd docs-site-internal && npm start
    expected: Site starts on http://localhost:3015

  - action: Access public docs
    command: Open http://localhost:3013
    expected: Public documentation homepage loads

  - action: Access internal docs
    command: Open http://localhost:3015
    expected: Internal documentation homepage loads

  - action: Verify public docs content
    command: Navigate to /docs/overview/introduction
    expected: Public introduction page renders

  - action: Verify internal docs content
    command: Navigate to /docs/architecture/README
    expected: Architecture documentation renders

  - action: Test search on internal docs
    command: Use local search
    expected: Search works without Algolia

postconditions:
  - Both sites accessible simultaneously
  - No port conflicts
  - Correct content served from each source

acceptance_criteria:
  - AC-001: Public docs serve .specweave/docs/public/
  - AC-002: Internal docs serve .specweave/docs/internal/
  - AC-003: Both sites run on different ports
  - AC-004: No content leakage between sites
  - AC-005: Search works on both (different implementations)
```

---

## .gitignore Updates

**IMPORTANT**: Internal docs site should be in `.gitignore` for user projects, but NOT for SpecWeave repo itself.

```gitignore
# For SpecWeave repo (keep both)
# (no changes - both docs-site/ and docs-site-internal/ are source-controlled)

# For user projects (template .gitignore)
# Add to src/templates/.gitignore.template:
docs-site/
docs-site-internal/
```

**Rationale**:
- SpecWeave repo: Both sites are part of the project, should be versioned
- User projects: Docusaurus sites are generated, should not be versioned (too large)

---

## Installation & Setup

### For SpecWeave Contributors

```bash
# 1. Install both doc sites
npm run install:docs

# Or manually:
cd docs-site && npm install
cd ../docs-site-internal && npm install

# 2. Start both (separate terminals)
cd docs-site && npm start          # Port 3013
cd docs-site-internal && npm start  # Port 3015
```

### For SpecWeave Users

```bash
# 1. Initialize SpecWeave (creates .specweave/ structure)
npx specweave init

# 2. Install docs plugin
/plugin install specweave-docs

# 3. Generate doc sites (optional)
/docs-generate-internal  # Creates docs-site-internal/
/docs-generate-public    # Creates docs-site/

# 4. Start as needed
cd docs-site-internal && npm start
```

---

## NPM Scripts

Add to root `package.json`:

```json
{
  "scripts": {
    "docs:public": "cd docs-site && npm start",
    "docs:internal": "cd docs-site-internal && npm start",
    "docs:build:public": "cd docs-site && npm run build",
    "docs:build:internal": "cd docs-site-internal && npm run build",
    "docs:install": "cd docs-site && npm install && cd ../docs-site-internal && npm install",
    "docs:both": "concurrently \"npm run docs:public\" \"npm run docs:internal\""
  },
  "devDependencies": {
    "concurrently": "^9.1.0"
  }
}
```

**Usage**:

```bash
# Start public docs
npm run docs:public

# Start internal docs
npm run docs:internal

# Start both simultaneously
npm run docs:both

# Build both for validation
npm run docs:build:public && npm run docs:build:internal
```

---

## Security Considerations

### Internal Docs Protection

**CRITICAL**: Internal docs MUST NOT be deployed publicly!

**Enforcement**:

1. **No deployment config** in `docs-site-internal/`:
   - ❌ No `vercel.json`
   - ❌ No `netlify.toml`
   - ❌ No `.github/workflows/deploy.yml`

2. **Git pre-commit hook** (optional):
   ```bash
   # .git/hooks/pre-commit
   if git diff --cached --name-only | grep -q "docs-site-internal.*\.yml"; then
     echo "❌ ERROR: Attempting to commit deployment config for internal docs!"
     echo "Internal docs must NEVER be deployed."
     exit 1
   fi
   ```

3. **CI/CD guard** (GitHub Actions):
   ```yaml
   # .github/workflows/test.yml
   - name: Verify no internal docs deployment
     run: |
       if [ -f "docs-site-internal/vercel.json" ]; then
         echo "❌ Internal docs deployment config detected!"
         exit 1
       fi
   ```

4. **Documentation warning**:
   ```typescript
   // docs-site-internal/docusaurus.config.ts
   const config: Config = {
     // ⚠️ WARNING: This is the INTERNAL docs site.
     // It contains proprietary information and MUST NOT be deployed.
     // Only run locally for development.

     title: 'SpecWeave Internal Docs (DO NOT DEPLOY)',
     // ...
   };
   ```

---

## Benefits

### For SpecWeave Contributors

✅ **Local browsing of internal docs** - View ADRs, HLD, strategy docs in nice UI
✅ **Searchable architecture** - Find ADRs, design decisions quickly
✅ **Mermaid diagram rendering** - See system architecture diagrams
✅ **Separate concerns** - Public vs internal content clearly separated
✅ **Better onboarding** - New contributors can browse engineering playbook

### For SpecWeave Users

✅ **Separate public docs** - Deploy user-facing docs to custom domain
✅ **Internal knowledge base** - Browse team's architecture decisions locally
✅ **No content leakage** - Internal docs never accidentally deployed
✅ **Flexible deployment** - Public docs can be deployed anywhere

---

## Migration Path

### Existing SpecWeave Repo

```bash
# 1. Create internal docs site
npx create-docusaurus@latest docs-site-internal classic --typescript

# 2. Configure (see Phase 1 above)
vim docs-site-internal/docusaurus.config.ts
vim docs-site-internal/sidebars.ts

# 3. Install dependencies
cd docs-site-internal && npm install

# 4. Test locally
npm start  # Should open http://localhost:3015

# 5. Update plugin skill
vim plugins/specweave-docs/skills/docusaurus/SKILL.md

# 6. Add integration tests
vim tests/integration/docusaurus/dual-site.test.ts

# 7. Update CLAUDE.md
vim CLAUDE.md  # Document dual docs setup
```

### User Projects (Future)

```bash
# When user runs: npx specweave init
# Template should include:
.specweave/
├── docs/
│   ├── internal/  # Created, populated with examples
│   └── public/    # Created, populated with examples

# Then user can optionally:
/docs-generate-internal  # Creates docs-site-internal/
```

---

## Open Questions

1. **Auto-sidebar generation**: Should we auto-generate sidebars from `.specweave/docs/internal/` structure?
   - **Pro**: Less manual config
   - **Con**: Less control over ordering
   - **Decision**: TBD (start manual, add auto-generation later)

2. **Markdown frontmatter**: Should internal docs require frontmatter?
   - **Pro**: Better control over sidebar position, title
   - **Con**: Extra work for contributors
   - **Decision**: Optional (use filename as fallback)

3. **Shared components**: Should both sites share React components?
   - **Pro**: DRY, consistency
   - **Con**: Coupling between sites
   - **Decision**: NO - keep fully independent

4. **Search indexing**: Should internal docs use same search as public?
   - **Pro**: Unified search experience
   - **Con**: Internal content in public search index
   - **Decision**: NO - separate implementations

---

## Timeline

| Phase | Tasks | Estimate |
|-------|-------|----------|
| **Phase 1** | Create internal docs site | 2 hours |
| **Phase 2** | Configure sidebars | 1 hour |
| **Phase 3** | Package management | 30 mins |
| **Phase 4** | Update plugin/skill | 1 hour |
| **Phase 5** | Integration tests | 2 hours |
| **Total** | | **6.5 hours** |

---

## Success Criteria

- ✅ Both Docusaurus sites run independently
- ✅ Public docs on port 3013, internal on 3015
- ✅ No port conflicts when both running
- ✅ Correct content served from each source
- ✅ Search works on both (different implementations)
- ✅ Integration tests pass (dual-site.test.ts)
- ✅ Documentation updated (CLAUDE.md, plugin skill)
- ✅ No internal content in public site
- ✅ No deployment config for internal site

---

## References

- [Docusaurus Multi-Instance](https://docusaurus.io/docs/advanced/multi-instance)
- [Docusaurus Configuration](https://docusaurus.io/docs/api/docusaurus-config)
- [Local Search Plugin](https://github.com/easyops-cn/docusaurus-search-local)
- [SpecWeave Internal Docs](.specweave/docs/internal/README.md)

---

**Status**: ✅ Design Complete, Ready for Implementation
**Next Step**: Phase 1 - Create internal docs site
