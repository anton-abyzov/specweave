---
name: docusaurus
description: Expert in generating beautiful Docusaurus documentation sites from SpecWeave structure. ALWAYS use this for internal docs preview, browsing docs locally, viewing documentation in browser. Converts .specweave/docs/internal/ and .specweave/docs/public/ into beautiful, searchable sites with navigation, search, and Mermaid diagrams. Activates for preview internal docs, view docs locally, see docs in browser, browse documentation, internal docs preview, docusaurus, create docs site, generate documentation, public docs, documentation site, host docs, deploy documentation, static site generator, client documentation, engineering playbook, dual docs sites.
---

# Docusaurus Documentation Generator

Expert skill for creating production-ready Docusaurus documentation sites from SpecWeave documentation.

## 🚨 CRITICAL: Default Behavior for Internal Docs Preview

**When users ask to preview/view/browse internal docs locally:**

1. **IMMEDIATELY** invoke `/specweave-docs-preview:preview` command
2. This launches a beautiful Docusaurus site with:
   - Auto-generated navigation from folder structure
   - Search functionality
   - Mermaid diagram rendering
   - Hot reload for live editing
   - Professional theming
3. **DO NOT** use basic file serving or simple markdown rendering
4. **ALWAYS** prefer Docusaurus for the best user experience

## What This Skill Does

Converts your SpecWeave documentation (`.specweave/docs/internal/` or `.specweave/docs/public/`) into a beautiful, searchable, deployable documentation website using Docusaurus v3.

## Key Capabilities

### 1. Site Generation
- Create Docusaurus configuration from SpecWeave structure
- Auto-generate navigation from folder structure
- Convert Mermaid diagrams to Docusaurus format
- Set up search (Algolia or local)
- Configure themes and styling

### 2. Content Extraction
- Extract documentation from `.specweave/docs/public/`
- Preserve folder structure as navigation
- Handle Markdown frontmatter
- Convert SpecWeave-specific conventions
- Support versioning if needed

### 3. Deployment Configuration
- Vercel deployment setup
- Netlify deployment setup
- GitHub Pages configuration
- Custom domain setup
- CI/CD pipeline integration

### 4. Advanced Features
- Multi-version documentation
- API documentation integration
- Blog support (optional)
- Announcement bar
- Dark/light theme
- Mobile-responsive
- SEO optimization

## When to Use This Skill

Activate this skill when you need to:
- Create a public documentation website for a SpecWeave project
- Deploy client-facing documentation
- Generate hosted documentation from `.specweave/docs/public/`
- Set up searchable documentation
- Create versioned documentation

## Activation Keywords

- "create docusaurus site"
- "generate documentation website"
- "deploy public docs"
- "create documentation site"
- "docusaurus from specweave"
- "host documentation"
- "static docs site"
- "internal docs"
- "engineering playbook"
- "dual docs sites"

## Dual Documentation Sites (SpecWeave)

**SpecWeave supports TWO Docusaurus instances** for separating public and internal documentation:

### 1. Public Docs (`docs-site/`)
- **Purpose**: User-facing documentation
- **Source**: `.specweave/docs/public/`
- **Port**: 3013
- **Deployment**: ✅ spec-weave.com (public)
- **Search**: Algolia (recommended)
- **Content**: Guides, API docs, tutorials, FAQ

**Commands**:
```bash
# Start public docs
npm run docs:public
# OR
cd docs-site && npm start

# Access: http://localhost:3013
```

### 2. Internal Docs (`docs-site-internal/`)
- **Purpose**: Engineering playbook (ADRs, HLD, strategy)
- **Source**: `.specweave/docs/internal/`
- **Port**: 3015
- **Deployment**: ❌ NEVER deploy (local only)
- **Search**: Local search plugin (no Algolia)
- **Content**: Architecture, strategy, specs, delivery, operations, governance

**Commands**:
```bash
# Start internal docs
npm run docs:internal
# OR
cd docs-site-internal && npm start

# Access: http://localhost:3015
```

### Running Both Simultaneously

```bash
# Terminal 1: Public docs
npm run docs:public

# Terminal 2: Internal docs
npm run docs:internal

# Access:
# - Public: http://localhost:3013
# - Internal: http://localhost:3015
```

**Key Differences**:

| Aspect | Public Docs | Internal Docs |
|--------|-------------|---------------|
| **Directory** | `docs-site/` | `docs-site-internal/` |
| **Source** | `.specweave/docs/public/` | `.specweave/docs/internal/` |
| **Port** | 3013 | 3015 |
| **Deployment** | ✅ Deployed | ❌ Local only |
| **Search** | Algolia | Local plugin |
| **Warning** | ❌ None | ✅ Red banner |
| **Content** | User guides | Engineering docs |

**Security**: Internal docs have NO deployment config (no `vercel.json`, `netlify.toml`, or GitHub Actions workflow). This prevents accidental public deployment.

---

## Workflow

### Step 1: Analysis
```bash
# Analyze existing documentation structure
.specweave/docs/
└── public/
    ├── overview/
    │   ├── introduction.md
    │   ├── features.md
    │   └── philosophy.md
    ├── guides/
    │   └── getting-started/
    │       ├── installation.md
    │       └── quickstart.md
    └── api/
        └── README.md
```

### Step 2: Docusaurus Setup
```bash
# Create docusaurus site in ./docs-site/
npx create-docusaurus@latest docs-site classic --typescript

# Or use existing structure if present
```

### Step 3: Configuration

Generate `docusaurus.config.ts`:
```typescript
import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Project Name Documentation',
  tagline: 'Spec-Driven Development with SpecWeave',
  favicon: 'img/favicon.ico',

  url: 'https://your-domain.com',
  baseUrl: '/',

  organizationName: 'your-org',
  projectName: 'your-project',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/your-org/your-project/tree/main/',
        },
        blog: false, // Optional
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'Project Name',
      logo: {
        alt: 'Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          position: 'left',
          label: 'Documentation',
        },
        {
          href: 'https://github.com/your-org/your-project',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/guides/getting-started/installation',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Your Company`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
```

### Step 4: Sidebar Generation

Auto-generate `sidebars.ts` from `.specweave/docs/public/`:
```typescript
import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    {
      type: 'category',
      label: 'Overview',
      items: [
        'overview/introduction',
        'overview/features',
        'overview/philosophy',
      ],
    },
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'guides/getting-started/installation',
        'guides/getting-started/quickstart',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'api/overview',
      ],
    },
  ],
};

export default sidebars;
```

### Step 5: Content Copying

Copy and adapt documentation:
```bash
# Copy public docs to Docusaurus
cp -r .specweave/docs/public/* docs-site/docs/

# Update internal links
# SpecWeave: /docs/overview/introduction
# Docusaurus: /docs/overview/introduction (works!)
```

### Step 6: Mermaid Support

Add Mermaid diagram support:
```bash
npm install @docusaurus/theme-mermaid
```

Update config:
```typescript
markdown: {
  mermaid: true,
},
themes: ['@docusaurus/theme-mermaid'],
```

### Step 7: Search Setup

**Option A: Local Search (Free)**
```bash
npm install @easyops-cn/docusaurus-search-local
```

**Option B: Algolia (Recommended for public docs)**
```typescript
algolia: {
  appId: 'YOUR_APP_ID',
  apiKey: 'YOUR_SEARCH_API_KEY',
  indexName: 'YOUR_INDEX_NAME',
  contextualSearch: true,
},
```

### Step 8: Deployment

**Vercel:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "build",
  "installCommand": "npm install"
}
```

**Netlify:**
```toml
[build]
  command = "npm run build"
  publish = "build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**GitHub Pages:**
```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./do
```

## Best Practices

### 1. Frontmatter Convention

Add frontmatter to each doc:
```yaml
---
sidebar_position: 1
title: Introduction
description: Get started with SpecWeave
---
```

### 2. Navigation Structure

```
docs/
├── overview/           # High-level concepts
├── guides/             # How-to guides
│   ├── getting-started/
│   ├── features/
│   └── advanced/
├── api/                # API reference
└── resources/          # Additional resources
```

### 3. Versioning (Optional)

For mature projects:
```bash
npm run docusaurus docs:version 1.0.0
```

Creates:
```
versions.json
versioned_docs/
  └── version-1.0.0/
versioned_sidebars/
  └── version-1.0.0-sidebars.json
```

### 4. Custom CSS

Customize theme in `src/css/custom.css`:
```css
:root {
  --ifm-color-primary: #2e8555;
  --ifm-code-font-size: 95%;
}

[data-theme='dark'] {
  --ifm-color-primary: #25c2a0;
}
```

### 5. SEO Optimization

```typescript
themeConfig: {
  metadata: [
    {name: 'keywords', content: 'specweave, documentation, ai, development'},
    {name: 'twitter:card', content: 'summary_large_image'},
  ],
  image: 'img/social-card.png',
}
```

## SpecWeave-Specific Handling

### 1. Increment References

Convert increment references:
```markdown
<!-- SpecWeave -->
See increment 0001-feature for details

<!-- Docusaurus -->
See [Increment 0001](https://github.com/org/repo/tree/main/.specweave/increments/0001-feature)
```

### 2. Internal Documentation Links

Hide internal docs references:
```markdown
<!-- Remove or convert these -->
See [Internal Architecture](../../internal/architecture/system-design.md)

<!-- To -->
<!-- Internal reference removed for public docs -->
```

### 3. Test Cases

Convert test case references to plain text:
```markdown
<!-- SpecWeave -->
Test Case: TC-0001

<!-- Docusaurus -->
**Test Coverage**: See GitHub test suite
```

## Example: Full Setup Script

```bash
#!/bin/bash
# setup-docusaurus.sh

echo "Setting up Docusaurus for SpecWeave documentation..."

# Create Docusaurus site
npx create-docusaurus@latest docs-site classic --typescript
cd docs-site

# Install dependencies
npm install @docusaurus/theme-mermaid
npm install @easyops-cn/docusaurus-search-local

# Copy public docs
cp -r ../.specweave/docs/public/* docs/

# Generate configuration
# (Use the skill to generate config files)

echo "Docusaurus setup complete!"
echo "Run 'npm start' in docs-site/ to preview"
echo "Run 'npm run build' to build for production"
```

## Validation Checklist

Before deployment, verify:

- [ ] All pages render correctly
- [ ] Navigation works (sidebar, breadcrumbs)
- [ ] Search functionality works
- [ ] Mermaid diagrams render
- [ ] Links are valid (no 404s)
- [ ] Mobile responsive
- [ ] Dark mode works
- [ ] SEO metadata present
- [ ] Custom domain configured (if applicable)
- [ ] CI/CD pipeline set up
- [ ] Analytics integrated (optional)

## Common Issues & Solutions

### Issue: Mermaid diagrams not rendering
**Solution**: Ensure `@docusaurus/theme-mermaid` installed and configured

### Issue: Search not working
**Solution**: Rebuild search index or check Algolia config

### Issue: Links broken after deployment
**Solution**: Check `baseUrl` in config matches deployment path

### Issue: Images not loading
**Solution**: Place images in `static/img/` and reference as `/img/name.png`

## Advanced: Multi-Project Documentation

For agencies managing multiple client projects:

```typescript
// Multi-repo support
const config: Config = {
  plugins: [
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'client-a',
        path: 'client-a-docs',
        routeBasePath: 'client-a',
      },
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'client-b',
        path: 'client-b-docs',
        routeBasePath: 'client-b',
      },
    ],
  ],
};
```

## Output

After running this skill, you'll have:

1. ✅ `docs-site/` directory with Docusaurus
2. ✅ Configuration files (`docusaurus.config.ts`, `sidebars.ts`)
3. ✅ Converted documentation from `.specweave/docs/public/`
4. ✅ Deployment configuration (Vercel/Netlify/GitHub Pages)
5. ✅ Search functionality (local or Algolia)
6. ✅ Mermaid diagram support
7. ✅ Ready to deploy with `npm run build`

## Related Skills

- **docs-writer**: For creating documentation content
- **diagrams-architect**: For creating Mermaid diagrams
- **design-system-architect**: For custom theming

## References

- [Docusaurus Documentation](https://docusaurus.io/)
- [Docusaurus Deployment](https://docusaurus.io/docs/deployment)
- [Mermaid Plugin](https://docusaurus.io/docs/markdown-features/diagrams)
- [Algolia DocSearch](https://docsearch.algolia.com/)

---

**Pro Tip**: Run `npm start` during development for hot-reload preview. Your docs will be accessible at `http://localhost:3000`.
