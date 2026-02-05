---
description: Launch Docusaurus documentation server for living docs. Supports internal (default, port 3015) and public (--public, port 3016) docs. Validates docs first, auto-fixes issues, auto-setup on first run.
---

# Documentation View Command

Launch Docusaurus development server with hot reload, Mermaid diagrams, and auto-generated sidebar.

**CRITICAL**: Runs pre-flight validation to catch issues BEFORE starting the server.

## Usage

```bash
# View internal docs (default) - port 3015
/sw-docs:view

# View public docs - port 3016
/sw-docs:view --public
/sw-docs:view public
```

## Your Task

**IMPORTANT**: This command must work in ANY SpecWeave user project, not just the SpecWeave repo itself.

### Step 0: Parse Arguments

```typescript
// Determine which docs to view
const args = process.argv.slice(2);
const isPublic = args.includes('--public') || args.includes('public');

const config = isPublic
  ? {
      docsPath: '.specweave/docs/public',
      port: 3016,
      title: 'Public Documentation',
      cachePath: '.specweave/cache/docs-site-public',
      navbarTitle: 'Public Docs'
    }
  : {
      docsPath: '.specweave/docs/internal',
      port: 3015,
      title: 'Internal Documentation',
      cachePath: '.specweave/cache/docs-site',
      navbarTitle: 'Internal Docs'
    };

console.log(`\n📚 Starting ${config.title} server...\n`);
```

### Step 1: Check Prerequisites

```bash
# Verify docs exist at the selected path
ls -la ${config.docsPath}/

# If missing, inform user:
# "No documentation found at ${config.docsPath}/.
#  Run 'specweave init' first or create the folder structure."
```

### Step 1.5: CRITICAL - Run Pre-Flight Validation

**ALWAYS run validation BEFORE starting the server!**

```typescript
import { DocsValidator } from '../../../src/utils/docs-validator.js';

const validator = new DocsValidator({
  docsPath: config.docsPath,
  autoFix: true,  // Auto-fix common issues
});

console.log('\n🔍 Running pre-flight validation...\n');
const result = await validator.validate();

// Show summary
console.log(DocsValidator.formatResult(result));

// If errors remain after auto-fix, STOP and report
if (!result.valid) {
  console.log('\n❌ Documentation has errors that must be fixed before preview.');
  console.log('   Fix the issues above, then try again.\n');
  process.exit(1);
}

console.log('\n✅ Validation passed! Starting server...\n');
```

**What this catches:**
- YAML frontmatter errors (unquoted colons, tabs)
- MDX compatibility issues (unquoted attributes, unclosed tags)
- Duplicate routes
- Broken internal links

**Auto-fixes applied:**
- Wraps YAML values with colons in quotes
- Quotes HTML attributes
- Adds closing slashes to void elements (`<br>` → `<br />`)
- Converts tabs to spaces in YAML

### Step 2: Check for Cached Installation

```bash
# Check if Docusaurus is already set up in cache
if [ -d "${config.cachePath}/node_modules" ]; then
  echo "✓ Docusaurus installation found in cache"
  NEEDS_INSTALL=false
else
  echo "⚙ First-time setup: Installing Docusaurus (~30 seconds)..."
  NEEDS_INSTALL=true
fi
```

### Step 3: First-Time Setup (if needed)

If `NEEDS_INSTALL=true`, create the cached Docusaurus installation:

```typescript
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Create cache directory
fs.mkdirSync(config.cachePath, { recursive: true });

// Create package.json
const packageJson = {
  name: isPublic ? 'specweave-docs-public' : 'specweave-docs-internal',
  version: '1.0.0',
  private: true,
  scripts: {
    start: `docusaurus start --port ${config.port}`,
    build: 'docusaurus build',
    clear: 'docusaurus clear'
  },
  dependencies: {
    '@docusaurus/core': '^3.9.2',
    '@docusaurus/preset-classic': '^3.9.2',
    '@docusaurus/theme-mermaid': '^3.9.2',
    '@mdx-js/react': '^3.0.0',
    'clsx': '^2.0.0',
    'prism-react-renderer': '^2.3.0',
    'react': '^19.0.0',
    'react-dom': '^19.0.0'
  },
  engines: {
    node: '>=20.0'
  }
};

fs.writeFileSync(
  path.join(config.cachePath, 'package.json'),
  JSON.stringify(packageJson, null, 2)
);

// Calculate relative path from cache to docs
// For internal: ../../docs/internal
// For public: ../../docs/public
const relativePath = isPublic ? '../../docs/public' : '../../docs/internal';

// Create Docusaurus config
const docusaurusConfig = `import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: '${config.title}',
  tagline: 'SpecWeave Living Documentation',
  favicon: 'img/favicon.ico',
  future: { v4: true },
  url: 'http://localhost:${config.port}',
  baseUrl: '/',
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',
  i18n: { defaultLocale: 'en', locales: ['en'] },
  markdown: { mermaid: true, format: 'md' },
  themes: ['@docusaurus/theme-mermaid'],
  presets: [
    [
      'classic',
      {
        docs: {
          path: '${relativePath}',
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          showLastUpdateTime: true,
          sidebarCollapsible: true,
          sidebarCollapsed: true,
        },
        blog: false,
        theme: { customCss: './src/css/custom.css' },
      } satisfies Preset.Options,
    ],
  ],
  themeConfig: {
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: '${config.navbarTitle}',
      items: [
        {to: '/', label: 'Home', position: 'left'},
        {type: 'search', position: 'right'},
      ],
    },
    footer: {
      style: 'dark',
      copyright: 'SpecWeave Living Documentation',
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'typescript', 'yaml', 'json'],
    },
    mermaid: { theme: {light: 'neutral', dark: 'dark'} },
  } satisfies Preset.ThemeConfig,
};

export default config;
`;

fs.writeFileSync(path.join(config.cachePath, 'docusaurus.config.ts'), docusaurusConfig);

// Create auto-generated sidebar
const sidebarsConfig = `import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    {
      type: 'autogenerated',
      dirName: '.',
    },
  ],
};

export default sidebars;
`;

fs.writeFileSync(path.join(config.cachePath, 'sidebars.ts'), sidebarsConfig);

// Create minimal CSS
fs.mkdirSync(path.join(config.cachePath, 'src', 'css'), { recursive: true });
const customCss = `:root {
  --ifm-color-primary: ${isPublic ? '#059669' : '#2563eb'};
  --ifm-code-font-size: 95%;
}
[data-theme='dark'] {
  --ifm-color-primary: ${isPublic ? '#34d399' : '#60a5fa'};
}
`;

fs.writeFileSync(path.join(config.cachePath, 'src', 'css', 'custom.css'), customCss);

// Create static folder with placeholder favicon
fs.mkdirSync(path.join(config.cachePath, 'static', 'img'), { recursive: true });
fs.writeFileSync(
  path.join(config.cachePath, 'static', 'img', 'favicon.ico'),
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📚</text></svg>'
);

// Install dependencies using PUBLIC npm registry
execSync('npm install --registry=https://registry.npmjs.org --legacy-peer-deps', {
  cwd: config.cachePath,
  stdio: 'inherit'
});
```

### Step 4: Start the Server

```bash
cd ${config.cachePath} && npm start
```

This will:
- Start Docusaurus on **http://localhost:${config.port}**
- Enable hot reload (edit markdown, see changes instantly)
- Render Mermaid diagrams
- Auto-generate sidebar from folder structure

### Output to User

After starting, display:

```
📚 Documentation View Server Started!

   Mode: ${isPublic ? 'PUBLIC' : 'INTERNAL'} docs
   URL: http://localhost:${config.port}
   Content: ${config.docsPath}/

   Features:
   • Hot reload - edit markdown, see changes instantly
   • Mermaid diagrams - architecture diagrams render beautifully
   • Auto sidebar - generated from folder structure
   • Dark/light mode - toggle in navbar

   Press Ctrl+C to stop the server.
```

## What You Get

- **Hot reload** - Edit markdown, see changes instantly
- **Auto sidebar** - Generated from folder structure
- **Mermaid diagrams** - Architecture diagrams render beautifully
- **Dark/light mode** - Toggle in navbar
- **Local search** - Instant search across all docs
- **Color coding** - Internal docs use blue theme, public docs use green theme

## Examples

### View Internal Docs (Default)

```bash
/sw-docs:view

# Output:
📚 Starting Internal Documentation server...
🔍 Running pre-flight validation...
✅ Validation passed! Starting server...

📚 Documentation View Server Started!
   Mode: INTERNAL docs
   URL: http://localhost:3015
   Content: .specweave/docs/internal/
```

### View Public Docs

```bash
/sw-docs:view --public

# Output:
📚 Starting Public Documentation server...
🔍 Running pre-flight validation...
✅ Validation passed! Starting server...

📚 Documentation View Server Started!
   Mode: PUBLIC docs
   URL: http://localhost:3016
   Content: .specweave/docs/public/
```

### View Both Simultaneously

Run in separate terminals:
```bash
# Terminal 1: Internal docs
/sw-docs:view

# Terminal 2: Public docs
/sw-docs:view --public

# Now both servers are running!
# Internal: http://localhost:3015
# Public: http://localhost:3016
```

## Troubleshooting

### Port already in use
```bash
# For internal docs (port 3015)
lsof -i :3015 && kill -9 $(lsof -t -i :3015)

# For public docs (port 3016)
lsof -i :3016 && kill -9 $(lsof -t -i :3016)
```

### Reinstall from scratch
```bash
# For internal docs
rm -rf .specweave/cache/docs-site && /sw-docs:view

# For public docs
rm -rf .specweave/cache/docs-site-public && /sw-docs:view --public
```

### npm registry issues
The setup uses `--registry=https://registry.npmjs.org` to bypass private registry configurations.

## See Also

- `/sw-docs:build` - Build static site for deployment
- `/sw-docs:organize` - Generate themed indexes for large folders
- `/sw-docs:health` - Documentation health report
- `/sw-docs:validate` - Validate documentation without starting server
