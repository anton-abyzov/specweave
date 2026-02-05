---
description: Build static documentation site for deployment. Validates docs first, auto-fixes issues, auto-setup on first run. Outputs production-ready HTML/CSS/JS.
---

# Documentation Build Command

Build production-ready static documentation site for deployment to any static host.

**CRITICAL**: Runs pre-flight validation to catch issues BEFORE building.

## Your Task

**IMPORTANT**: This command must work in ANY SpecWeave user project, not just the SpecWeave repo itself.

### Step 1: CRITICAL - Run Pre-Flight Validation

**ALWAYS validate BEFORE building to prevent cryptic webpack errors!**

```typescript
import { DocsValidator } from '../../../src/utils/docs-validator.js';

const validator = new DocsValidator({
  docsPath: '.specweave/docs/internal',
  autoFix: true,  // Auto-fix common issues
});

console.log('\n🔍 Running pre-build validation...\n');
const result = await validator.validate();

// Show summary
console.log(DocsValidator.formatResult(result));

// If errors remain after auto-fix, STOP and report
if (!result.valid) {
  console.log('\n❌ Documentation has errors that must be fixed before build.');
  console.log('   Fix the issues above, then try again.\n');
  process.exit(1);
}

console.log('\n✅ Validation passed! Proceeding with build...\n');
```

### Step 2: Ensure Docusaurus is Set Up

```bash
# Check if Docusaurus is set up
if [ ! -d ".specweave/cache/docs-site/node_modules" ]; then
  echo "Setting up Docusaurus first..."
  # Run the same setup as preview command (see preview.md for full setup)
  # After setup, continue to build
fi
```

If not set up, follow the same setup steps as `/sw-docs:view` (Step 3 in view.md).

### Step 3: Run Build

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
# View docs first to find errors
/sw-docs:view
# Fix broken links, then build
/sw-docs:build
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
/sw-docs:build
```

## See Also

- `/sw-docs:view` - View docs locally with hot reload
- `/sw-docs:organize` - Organize large folders with themed indexes
- `/sw-docs:health` - Documentation health report
