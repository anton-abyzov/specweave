---
name: specweave-docs:build
description: Build static documentation site for deployment. Auto-setup on first run. Outputs production-ready HTML/CSS/JS.
---

# Documentation Build Command

Build production-ready static documentation site for deployment to any static host.

## Your Task

**IMPORTANT**: This command must work in ANY SpecWeave user project, not just the SpecWeave repo itself.

### Step 1: Ensure Docusaurus is Set Up

First, ensure the cached Docusaurus installation exists:

```bash
# Check if Docusaurus is set up
if [ ! -d ".specweave/cache/docs-site/node_modules" ]; then
  echo "Setting up Docusaurus first..."
  # Run the same setup as preview command (see preview.md for full setup)
  # After setup, continue to build
fi
```

If not set up, follow the same setup steps as `/specweave-docs:preview` (Step 3 in preview.md).

### Step 2: Run Build

```bash
cd .specweave/cache/docs-site && npm run build
```

### Step 3: Report Output

```bash
echo ""
echo "📦 Build Complete!"
echo ""
echo "   Output: .specweave/cache/docs-site/build/"
echo ""
echo "   Deploy with:"
echo "   • npx serve .specweave/cache/docs-site/build/"
echo "   • Copy to your static host"
echo ""
```

## Output Structure

```
.specweave/cache/docs-site/build/
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
npx serve .specweave/cache/docs-site/build/
```

### 2. Copy to Custom Location

```bash
# Copy build to docs folder for GitHub Pages
cp -r .specweave/cache/docs-site/build/* docs/
git add docs/
git commit -m "docs: update documentation site"
```

### 3. Netlify/Vercel

```bash
# Point your deployment to:
.specweave/cache/docs-site/build/
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

## Troubleshooting

### Build fails with broken links
```bash
# Preview first to find errors
/specweave-docs:preview
# Fix broken links, then build
/specweave-docs:build
```

### Out of memory
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

### Cache issues
```bash
cd .specweave/cache/docs-site && npm run clear && npm run build
```

### Reinstall from scratch
```bash
rm -rf .specweave/cache/docs-site
/specweave-docs:build
```

## See Also

- `/specweave-docs:preview` - Preview docs locally with hot reload
- `/specweave-docs:organize` - Organize large folders with themed indexes
- `/specweave-docs:health` - Documentation health report
