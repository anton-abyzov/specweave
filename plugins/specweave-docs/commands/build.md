---
name: specweave-docs:build
description: Build static documentation site for deployment. Supports both public and internal docs. Outputs production-ready HTML/CSS/JS.
---

# Documentation Build Command

Build production-ready static documentation site for deployment to any static host.

## Usage

```bash
# Build INTERNAL docs (SpecWeave living documentation) - DEFAULT
/specweave-docs:build

# Build PUBLIC docs (end-user documentation)
/specweave-docs:build --public
```

## Two Build Targets

| Site | Output Directory | NPM Script |
|------|------------------|------------|
| **Internal** | `docs-site/build-internal/` | `docs:internal:build` |
| **Public** | `docs-site/build/` | `docs:build` |

## Your Task

Execute the appropriate npm script based on user flags:

```bash
# Check if user wants public docs
PUBLIC_FLAG="${1:-}"

cd /path/to/project

if [ "$PUBLIC_FLAG" = "--public" ]; then
  echo "Building PUBLIC documentation..."
  echo "Output: docs-site/build/"
  echo ""
  npm run docs:build
  echo ""
  echo "Build complete! Output: docs-site/build/"
else
  echo "Building INTERNAL documentation..."
  echo "Output: docs-site/build-internal/"
  echo ""
  npm run docs:internal:build
  echo ""
  echo "Build complete! Output: docs-site/build-internal/"
fi
```

## Output Structure

```
docs-site/build-internal/
├── index.html              <- Landing page
├── strategy/
├── specs/
├── architecture/
│   └── adr/
├── delivery/
├── operations/
├── governance/
├── assets/
│   ├── css/styles.[hash].css
│   └── js/runtime.[hash].js
└── sitemap.xml
```

## Deployment Options

### 1. Preview Locally

```bash
# Internal docs
cd docs-site && npm run serve:internal

# Public docs
cd docs-site && npm run serve
```

### 2. Netlify

```bash
cd docs-site
npx netlify deploy --dir=build-internal --prod
```

### 3. Vercel

```bash
cd docs-site
npx vercel --prod
```

### 4. GitHub Pages

```bash
# Copy build to docs folder (GitHub Pages expects /docs)
cp -r docs-site/build-internal/* docs/
git add docs/
git commit -m "docs: update documentation site"
git push
```

### 5. Static Server

```bash
npx serve docs-site/build-internal/
```

## Build vs Preview

| Aspect | Preview | Build |
|--------|---------|-------|
| **Purpose** | Development | Production |
| **Speed** | Instant | 10-30 seconds |
| **Output** | Dev server | Static files |
| **Hot Reload** | Yes | No |
| **Optimization** | No | Yes (minified) |
| **Use Case** | Writing docs | Deployment |

## First-Time Setup

If dependencies not installed:

```bash
npm run docs:install
```

## Troubleshooting

### Build fails with broken links
```bash
# Preview first to find errors
npm run docs:internal
# Fix broken links, then build
npm run docs:internal:build
```

### Out of memory
```bash
# Increase Node memory
NODE_OPTIONS="--max-old-space-size=4096" npm run docs:internal:build
```

### Cache issues
```bash
cd docs-site && npm run clear && npm run build:internal
```

## See Also

- `/specweave-docs:preview` - Preview docs locally with hot reload
- `/specweave-docs:organize` - Organize large folders with themed indexes
- `/specweave-docs:health` - Documentation health report
