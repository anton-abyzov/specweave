# Documentation Preview Architecture

**Feature**: Local documentation preview with Docusaurus
**Increment**: 0013-v0.8.0-stabilization
**Date**: 2025-11-06
**Status**: Implementation

## Overview

Enable users to preview their SpecWeave documentation in a beautiful UI (Docusaurus) with automatic setup after first increment completion.

## Problem Statement

**Current State**:
- Users complete increments and generate docs in `.specweave/docs/`
- Documentation is markdown files (raw, hard to browse)
- No easy way to see the full documentation holistically
- Must navigate files manually in editor

**User Pain Points**:
- "How do I see what I've built?"
- "Can I preview my architecture docs?"
- "I want to browse specs without opening 10 files"

## Solution

**Docusaurus Local Preview**:
- Auto-suggest after first increment completion
- One-click setup and launch
- Auto-generates sidebar from folder structure
- Full-text search, mobile-responsive
- Mermaid diagram support (built into Docusaurus)

## Architecture

### Component Structure

```
plugins/specweave-docs-preview/          # Plugin root
├── .claude-plugin/
│   └── plugin.json                      # Claude native manifest
├── skills/
│   └── docs-preview/
│       └── SKILL.md                     # Auto-activating skill
├── commands/
│   ├── docs-preview.md                  # /specweave:docs preview
│   ├── docs-build.md                    # /specweave:docs build
│   └── docs-deploy.md                   # /specweave:docs deploy
└── lib/
    ├── docusaurus-setup.ts              # Installation & config
    ├── sidebar-generator.ts             # Auto-generate from folders
    └── server-launcher.ts               # Dev server management

src/utils/docs-preview/                  # Core utilities
├── docusaurus-config-generator.ts       # Generate docusaurus.config.js
├── sidebar-builder.ts                   # Build sidebar from .specweave/docs/
├── package-installer.ts                 # npm install handling
└── server-manager.ts                    # Port management, browser launch

.specweave/
├── docs-site/                           # Docusaurus site (gitignored)
│   ├── docusaurus.config.js             # Auto-generated config
│   ├── sidebars.js                      # Auto-generated sidebar
│   ├── src/
│   │   └── pages/                       # Landing page
│   ├── static/
│   └── package.json                     # Docusaurus dependencies
└── config.json                          # Add docs preview settings
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│  TRIGGER: First Increment Complete                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Hook: post-increment-completion.sh                         │
│  - Detects: count_completed_increments() == 1               │
│  - Prompts: "Preview docs in Docusaurus?"                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                  [YES]│[NO]
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  PHASE 1: Installation                                      │
│  - Check Node.js version (18+)                              │
│  - npm install docusaurus packages                          │
│  - Generate docusaurus.config.js                            │
│  - Generate sidebars.js from .specweave/docs/ structure     │
│  - Create landing page                                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  PHASE 2: Launch                                            │
│  - Find available port (3000, 3001, 3002, ...)              │
│  - Start Docusaurus dev server                              │
│  - Open browser to http://localhost:{port}                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  USER: Browses Documentation                                │
│  - Sidebar shows all folders (strategy, specs, architecture)│
│  - Search works across all docs                             │
│  - Mermaid diagrams rendered                                │
│  - Mobile-responsive                                        │
└─────────────────────────────────────────────────────────────┘
```

### Configuration

**`.specweave/config.json`** (new section):

```json
{
  "documentation": {
    "preview": {
      "enabled": true,
      "autoInstall": true,
      "port": 3000,
      "openBrowser": true,
      "theme": "default",
      "excludeFolders": [
        "legacy",
        "node_modules"
      ]
    }
  }
}
```

**Schema** (`src/core/schemas/specweave-config.schema.json`):

```json
{
  "documentation": {
    "type": "object",
    "properties": {
      "preview": {
        "type": "object",
        "properties": {
          "enabled": { "type": "boolean", "default": true },
          "autoInstall": { "type": "boolean", "default": true },
          "port": { "type": "number", "default": 3000, "minimum": 1024, "maximum": 65535 },
          "openBrowser": { "type": "boolean", "default": true },
          "theme": { "type": "string", "enum": ["default", "classic", "dark"], "default": "default" },
          "excludeFolders": { "type": "array", "items": { "type": "string" }, "default": ["legacy", "node_modules"] }
        }
      }
    }
  }
}
```

### Sidebar Auto-Generation

**Input**: `.specweave/docs/internal/` folder structure

```
.specweave/docs/internal/
├── strategy/
│   ├── prd-001-core.md
│   └── okr-2025-q4.md
├── specs/
│   ├── spec-001-core-framework.md
│   └── spec-002-plugin-architecture.md
├── architecture/
│   ├── hld-system.md
│   ├── adr/
│   │   ├── 0001-postgres.md
│   │   └── 0002-redis.md
│   └── diagrams/
│       └── c4-system-context.md
├── delivery/
│   ├── roadmap-2025.md
│   └── dora-metrics.md
├── operations/
│   └── runbook-api.md
└── governance/
    └── security-policy.md
```

**Output**: `sidebars.js`

```javascript
module.exports = {
  docs: [
    {
      type: 'category',
      label: 'Strategy',
      items: [
        'strategy/prd-001-core',
        'strategy/okr-2025-q4'
      ]
    },
    {
      type: 'category',
      label: 'Specs',
      items: [
        'specs/spec-001-core-framework',
        'specs/spec-002-plugin-architecture'
      ]
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/hld-system',
        {
          type: 'category',
          label: 'ADRs',
          items: [
            'architecture/adr/0001-postgres',
            'architecture/adr/0002-redis'
          ]
        },
        {
          type: 'category',
          label: 'Diagrams',
          items: ['architecture/diagrams/c4-system-context']
        }
      ]
    },
    {
      type: 'category',
      label: 'Delivery',
      items: [
        'delivery/roadmap-2025',
        'delivery/dora-metrics'
      ]
    },
    {
      type: 'category',
      label: 'Operations',
      items: ['operations/runbook-api']
    },
    {
      type: 'category',
      label: 'Governance',
      items: ['governance/security-policy']
    }
  ]
};
```

### Docusaurus Config

**`docusaurus.config.js`** (auto-generated):

```javascript
module.exports = {
  title: 'SpecWeave Documentation',
  tagline: 'Spec-Driven Development Framework',
  favicon: 'img/favicon.ico',
  url: 'http://localhost',
  baseUrl: '/',
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',
  i18n: {
    defaultLocale: 'en',
    locales: ['en']
  },
  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          path: '../docs/internal',
          sidebarPath: require.resolve('./sidebars.js')
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css')
        }
      }
    ]
  ],
  themeConfig: {
    navbar: {
      title: 'SpecWeave',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          position: 'left',
          label: 'Documentation'
        }
      ]
    },
    prism: {
      theme: require('prism-react-renderer/themes/github'),
      darkTheme: require('prism-react-renderer/themes/dracula')
    },
    algolia: false // Future: Add search
  },
  markdown: {
    mermaid: true
  },
  themes: ['@docusaurus/theme-mermaid']
};
```

## Implementation Plan

### Phase 1: Core Utilities

**T-001**: Create TypeScript utilities
- File: `src/utils/docs-preview/docusaurus-setup.ts`
- Functions:
  - `checkNodeVersion()`: Verify Node.js 18+
  - `installDocusaurus()`: npm install packages
  - `generateConfig()`: Create docusaurus.config.js
  - `generateSidebar()`: Build sidebars.js from folder scan
  - `setupDocsPreview()`: Orchestrate full setup

**T-002**: Create sidebar generator
- File: `src/utils/docs-preview/sidebar-builder.ts`
- Functions:
  - `scanDocsFolder()`: Recursively scan .specweave/docs/internal/
  - `buildSidebarItem()`: Create sidebar item (category or doc)
  - `sortByPriority()`: Sort folders (strategy first, governance last)
  - `excludeFolders()`: Skip legacy, node_modules, etc.

**T-003**: Create server manager
- File: `src/utils/docs-preview/server-manager.ts`
- Functions:
  - `findAvailablePort()`: Check ports 3000-3010
  - `startDevServer()`: Spawn Docusaurus dev server
  - `openBrowser()`: Open default browser
  - `stopServer()`: Graceful shutdown

### Phase 2: Plugin Structure

**T-004**: Create plugin manifest
- File: `plugins/specweave-docs-preview/.claude-plugin/plugin.json`
- Content:
  ```json
  {
    "name": "specweave-docs-preview",
    "description": "Local documentation preview with Docusaurus. Activates for: docs, preview, documentation, browse docs, show docs",
    "version": "1.0.0",
    "author": { "name": "Anton Abyzov" }
  }
  ```

**T-005**: Create docs-preview skill
- File: `plugins/specweave-docs-preview/skills/docs-preview/SKILL.md`
- Triggers: "docs", "preview", "documentation", "browse docs"
- Purpose: Auto-activate when user wants to preview docs

**T-006**: Create commands
- Files:
  - `plugins/specweave-docs-preview/commands/docs-preview.md`
  - `plugins/specweave-docs-preview/commands/docs-build.md`
  - `plugins/specweave-docs-preview/commands/docs-deploy.md`

### Phase 3: Hook Integration

**T-007**: Update post-increment-completion hook
- File: `plugins/specweave/hooks/post-increment-completion.sh`
- Logic:
  ```bash
  # Check if this is the first completed increment
  if [ $(count_completed_increments) -eq 1 ]; then
    echo "🎉 First increment complete!"
    echo ""
    echo "Would you like to preview your documentation in a beautiful UI?"
    echo ""
    echo "1) Yes, install and launch Docusaurus (recommended)"
    echo "2) No, I'll review markdown manually"
    echo "3) Remind me later"

    read -p "Choice [1]: " choice
    case $choice in
      1|"")
        echo "📦 Installing Docusaurus..."
        node dist/utils/docs-preview/setup-cli.js
        ;;
      2)
        echo "✅ You can always preview later with /specweave:docs preview"
        ;;
      3)
        echo "💡 Run /specweave:docs preview anytime"
        ;;
    esac
  fi
  ```

### Phase 4: Configuration

**T-008**: Update config schema
- File: `src/core/schemas/specweave-config.schema.json`
- Add `documentation.preview` section

**T-009**: Update ConfigManager
- File: `src/core/config-manager.ts`
- Add validation for docs preview settings

### Phase 5: Tests

**T-010**: Unit tests
- File: `tests/unit/docs-preview/sidebar-builder.test.ts`
- Test sidebar generation from folder structure
- Test exclusion logic (legacy, node_modules)
- Test sorting (strategy first, governance last)

**T-011**: Integration tests
- File: `tests/integration/docs-preview/full-setup.test.ts`
- Test complete setup workflow
- Test server launch and shutdown
- Test browser opening

**T-012**: E2E tests
- File: `tests/e2e/docs-preview.spec.ts`
- Test /specweave:docs preview command
- Verify server starts on available port
- Verify docs are accessible in browser

### Phase 6: Documentation

**T-013**: Update CLAUDE.md
- Add docs preview section
- Document commands and workflow

**T-014**: Create user guide
- File: `.specweave/docs/public/guides/docs-preview.md`
- Explain how to use docs preview
- Troubleshooting section

**T-015**: Update marketplace
- Add plugin to `.claude-plugin/marketplace.json`

## Success Metrics

**Functionality**:
- ✅ First increment completion triggers docs preview prompt
- ✅ One-click setup completes in <30 seconds
- ✅ Server launches on available port (3000-3010)
- ✅ Browser opens automatically
- ✅ Sidebar shows all documentation folders
- ✅ Search works (future: Algolia integration)
- ✅ Mermaid diagrams render correctly

**Performance**:
- ✅ Setup time <30 seconds
- ✅ Page load time <2 seconds
- ✅ Search response time <500ms (future)

**Quality**:
- ✅ 85%+ test coverage
- ✅ Works on macOS, Linux, Windows
- ✅ Graceful error handling (Node.js version, port conflicts)

## Edge Cases

| Edge Case | Solution |
|-----------|----------|
| No Node.js | Display error: "Node.js 18+ required. Install from nodejs.org" |
| Port 3000 taken | Try 3001, 3002, ..., 3010. If all taken, error with manual port |
| Install fails | Graceful fallback: "Preview unavailable. Markdown files in .specweave/docs/" |
| Windows paths | Use cross-platform path handling (path.join, path.resolve) |
| Large projects | Stream npm install output, show progress spinner |
| No docs yet | Skip prompt (only trigger after first increment) |

## Security Considerations

**npm Packages**:
- ✅ Install Docusaurus from official npm registry
- ✅ Verify package integrity (npm audit)
- ✅ Pin versions to avoid supply chain attacks

**Local Server**:
- ✅ Only listen on localhost (not 0.0.0.0)
- ✅ No external access
- ✅ No authentication needed (local only)

**File Access**:
- ✅ Only read .specweave/docs/ (no write access)
- ✅ Exclude sensitive folders (legacy with credentials)

## Future Enhancements

1. **Versioned Docs** - Track docs across increments (v0.1.0, v0.2.0)
2. **Custom Themes** - Company branding
3. **PDF Export** - Generate PDF for offline reading
4. **External Integration** - Push to Confluence, Notion
5. **Analytics** - Track which docs are viewed most
6. **Search** - Algolia integration
7. **Multi-Language** - i18n support

## Dependencies

**NPM Packages**:
```json
{
  "devDependencies": {
    "@docusaurus/core": "^3.0.0",
    "@docusaurus/preset-classic": "^3.0.0",
    "@docusaurus/theme-mermaid": "^3.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
```

**System Requirements**:
- Node.js 18+
- npm 9+
- 100MB disk space (Docusaurus + dependencies)

## Commands Reference

```bash
# Preview docs (launch local server)
/specweave:docs preview

# Build static site (for deployment)
/specweave:docs build

# Deploy to GitHub Pages (future)
/specweave:docs deploy

# Stop running server
/specweave:docs stop

# Configure docs settings
/specweave:docs config
```

## Rollout Plan

1. ✅ Implement core utilities (docusaurus-setup, sidebar-builder)
2. ✅ Create plugin structure (manifest, skills, commands)
3. ✅ Integrate with hook (post-increment-completion)
4. ✅ Add configuration (schema, validation)
5. ✅ Write tests (unit, integration, E2E)
6. ✅ Update documentation (CLAUDE.md, user guide)
7. ✅ Add to marketplace
8. ✅ Test end-to-end flow
9. ✅ Ship with v0.8.0

## Conclusion

This feature transforms SpecWeave documentation from "raw markdown files" to "beautiful, searchable, browsable UI" with minimal user effort. After the first increment, users get a "wow moment" seeing their work in a professional documentation site.

**Key Insight**: This isn't about replacing markdown - it's about making documentation accessible and delightful to browse.
