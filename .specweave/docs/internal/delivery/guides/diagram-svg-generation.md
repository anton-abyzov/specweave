# Diagram SVG Generation Guide

**Purpose**: Generate static SVG files from Mermaid diagrams for reliable rendering in Docusaurus

**Created**: 2025-10-27

---

## Why SVG Generation?

### Problems with Client-Side Mermaid Rendering

1. **Inconsistent rendering**: Different browsers/versions render Mermaid differently
2. **Performance**: Large diagrams slow down page load (client-side parsing)
3. **Build failures**: Mermaid syntax errors can break SSG builds
4. **Accessibility**: SVGs are more accessible than dynamically rendered diagrams
5. **Reliability**: SVGs always work, even if Mermaid.js fails

### Benefits of SVG Export

1. ✅ **Consistent appearance**: Same rendering everywhere
2. ✅ **Faster page loads**: No JavaScript parsing required
3. ✅ **SSG-friendly**: Works with static site generators (Docusaurus, Next.js, etc.)
4. ✅ **Offline support**: Diagrams work without internet
5. ✅ **Version control**: See visual diffs in git
6. ✅ **Dark mode**: Generate both light and dark theme versions

---

## Quick Start

### Generate All Diagrams

```bash
# Generate SVGs for all .mmd files
npm run generate:diagrams
```

**Output**:
- For each `.mmd` file, creates:
  - `{filename}.svg` (light theme)
  - `{filename}-dark.svg` (dark theme)
- Placed next to source `.mmd` files

### Example

```bash
# Before
.specweave/docs/internal/architecture/diagrams/
└── specweave-workflow.mmd

# After running npm run generate:diagrams
.specweave/docs/internal/architecture/diagrams/
├── specweave-workflow.mmd          # Source (keep in git)
├── specweave-workflow.svg          # Generated (commit to git)
└── specweave-workflow-dark.svg     # Generated (commit to git)
```

---

## Workflow

### 1. Create Mermaid Diagram

**File**: `.specweave/docs/internal/architecture/diagrams/my-diagram.mmd`

**Note**: SVG generation examples are available in the [architecture diagrams folder](../../architecture/diagrams/). Run `scripts/generate-diagram-svgs.sh` to generate SVGs from any `.mmd` file.

**Important**: Use `.mmd` extension (NOT `.md`)

### 2. Generate SVG

```bash
npm run generate:diagrams
```

### 3. Verify Output

```bash
# Check files were created
ls -lh .specweave/docs/internal/architecture/diagrams/my-diagram*.svg

# Expected output:
# my-diagram.svg        (light theme)
# my-diagram-dark.svg   (dark theme)
```

### 4. Use in Documentation

**Markdown** (Docusaurus):
```markdown
## System Architecture

**Note**: SVG generation examples are available in the [architecture diagrams folder](../../architecture/diagrams/). Run `scripts/generate-diagram-svgs.sh` to generate SVGs from any `.mmd` file.
```

**MDX** (with dark mode support):
```mdx
import ThemedImage from '@theme/ThemedImage';

<ThemedImage
  alt="System Workflow"
  sources={{
    light: '/diagrams/specweave-workflow.svg',
    dark: '/diagrams/specweave-workflow-dark.svg',
  }}
/>
```

### 5. Commit to Git

```bash
# Commit both source and generated files
git add .specweave/docs/internal/architecture/diagrams/my-diagram.mmd
git add .specweave/docs/internal/architecture/diagrams/my-diagram*.svg
git commit -m "docs: add system workflow diagram"
```

---

## Configuration

### Mermaid Configuration File

**File**: `.mermaidrc.json`

```json
{
  "theme": "default",
  "themeVariables": {
    "primaryColor": "#e1f5ff",
    "primaryTextColor": "#000",
    "primaryBorderColor": "#0288d1",
    "lineColor": "#666",
    "secondaryColor": "#fff3e0",
    "tertiaryColor": "#f3e5f5",
    "background": "#fff",
    "fontFamily": "\"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
    "fontSize": "14px"
  },
  "flowchart": {
    "htmlLabels": true,
    "curve": "basis",
    "useMaxWidth": true
  }
}
```

**Customization**:
- Change colors to match brand
- Adjust font sizes
- Modify spacing/padding
- See [Mermaid Theme Configuration](https://mermaid.js.org/config/theming.html)

---

## Manual Generation (Single Diagram)

### Light Theme

```bash
npx mmdc -i path/to/diagram.mmd \
         -o path/to/diagram.svg \
         -c .mermaidrc.json \
         -b transparent
```

### Dark Theme

```bash
# Create dark theme config
cat .mermaidrc.json | \
  sed 's/"darkMode": false/"darkMode": true/' | \
  sed 's/"background": "#fff"/"background": "#1e1e1e"/' | \
  sed 's/"mainBkg": "#fff"/"mainBkg": "#1e1e1e"/' | \
  sed 's/"primaryTextColor": "#000"/"primaryTextColor": "#fff"/' \
  > /tmp/mermaid-dark.json

# Generate dark SVG
npx mmdc -i path/to/diagram.mmd \
         -o path/to/diagram-dark.svg \
         -c /tmp/mermaid-dark.json \
         -b transparent
```

---

## Using SVGs in Docusaurus

### Option 1: Simple Image (Recommended)

**Markdown**:
```markdown
**Note**: SVG generation examples are available in the [architecture diagrams folder](../../architecture/diagrams/). Run `scripts/generate-diagram-svgs.sh` to generate SVGs from any `.mmd` file.
```

**Benefits**:
- Simple syntax
- Works everywhere
- No build configuration

**Drawbacks**:
- No dark mode support

---

### Option 2: Themed Image (Dark Mode Support)

**MDX**:
```mdx
import ThemedImage from '@theme/ThemedImage';

<ThemedImage
  alt="Workflow Diagram"
  sources={{
    light: useBaseUrl('/diagrams/specweave-workflow.svg'),
    dark: useBaseUrl('/diagrams/specweave-workflow-dark.svg'),
  }}
/>
```

**Benefits**:
- Automatic dark mode switching
- Better UX

**Drawbacks**:
- Requires MDX (not Markdown)
- Slightly more complex

---

### Option 3: HTML Image Tag

**Markdown**:
```markdown
<img src="../diagrams/specweave-workflow.svg" alt="Workflow" width="100%" />
```

**Benefits**:
- Control size/styling
- Works in Markdown

**Drawbacks**:
- Verbose

---

## Automation

### Pre-Commit Hook (Optional)

**File**: `.git/hooks/pre-commit`

```bash
#!/usr/bin/env bash

# Auto-generate SVGs before commit
if git diff --cached --name-only | grep -q '\.mmd$'; then
    echo "Detected .mmd changes, regenerating SVGs..."
    npm run generate:diagrams

    # Stage generated SVGs
    git add .specweave/docs/**/*.svg
fi
```

**Make executable**:
```bash
chmod +x .git/hooks/pre-commit
```

---

### CI/CD Integration (GitHub Actions)

**File**: `.github/workflows/diagrams.yml`

```yaml
name: Generate Diagrams

on:
  push:
    paths:
      - '**/*.mmd'

jobs:
  generate-svgs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm install

      - run: npm run generate:diagrams

      - name: Commit SVGs
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add .specweave/docs/**/*.svg
          git diff --cached --quiet || git commit -m "docs: regenerate diagram SVGs"
          git push
```

---

## Troubleshooting

### Issue: SVG Not Generated

**Symptoms**: Script runs but no `.svg` file created

**Causes**:
1. Mermaid syntax error in `.mmd` file
2. Invalid path
3. Permissions issue

**Debug**:
```bash
# Run mmdc directly with verbose output
npx mmdc -i path/to/diagram.mmd \
         -o path/to/diagram.svg \
         --verbose
```

**Fix**: Check error message, fix syntax error in `.mmd` file

---

### Issue: SVG Renders Incorrectly

**Symptoms**: Diagram shows but layout is wrong

**Causes**:
1. Complex diagram (too many nodes)
2. Mermaid version mismatch
3. Theme configuration issue

**Debug**:
```bash
# Test in Mermaid Live Editor
open https://mermaid.live/
# Paste diagram code, verify rendering
```

**Fixes**:
- Simplify diagram (split into multiple diagrams)
- Update mermaid-cli: `npm update @mermaid-js/mermaid-cli`
- Adjust `.mermaidrc.json` theme variables

---

### Issue: Dark Mode SVG Same as Light

**Symptoms**: Both SVGs look identical

**Causes**:
1. Dark theme config not applied
2. Hardcoded colors in `.mmd` file

**Debug**:
```bash
# Check dark config is different
cat /tmp/mermaid-dark.json | grep darkMode
# Should show: "darkMode": true
```

**Fixes**:
- Verify script generates dark config correctly
- Remove hardcoded colors from `.mmd` file (use theme variables)

---

### Issue: SVG File Size Too Large

**Symptoms**: `.svg` file is >500KB

**Causes**:
1. Very complex diagram
2. High resolution
3. Embedded fonts

**Fixes**:
```bash
# Optimize SVG with svgo
npm install -g svgo
svgo path/to/diagram.svg

# Or use --scale flag
npx mmdc -i diagram.mmd -o diagram.svg --scale 0.8
```

---

## Best Practices

### 1. Always Commit Both .mmd and .svg

```bash
# ✅ CORRECT
git add diagram.mmd diagram.svg diagram-dark.svg

# ❌ WRONG
git add diagram.mmd
# (SVG not committed - breaks docs site)
```

**Why**: Documentation site uses `.svg`, but source is `.mmd`

---

### 2. Regenerate After Editing .mmd

```bash
# Edit diagram
vim .specweave/docs/internal/architecture/diagrams/my-diagram.mmd

# MUST regenerate
npm run generate:diagrams

# Verify changes
git diff .specweave/docs/internal/architecture/diagrams/my-diagram.svg
```

---

### 3. Use Relative Paths in Markdown

```markdown
# ✅ CORRECT (relative path)
**Note**: SVG generation examples are available in the [architecture diagrams folder](../../architecture/diagrams/). Run `scripts/generate-diagram-svgs.sh` to generate SVGs from any `.mmd` file.

# ❌ WRONG (absolute path - breaks on different hosts)
![Diagram](/Users/me/specweave/diagrams/workflow.svg)
```

---

### 4. Provide Alt Text

```markdown
# ✅ CORRECT (accessible)
**Note**: SVG generation examples are available in the [architecture diagrams folder](../../architecture/diagrams/). Run `scripts/generate-diagram-svgs.sh` to generate SVGs from any `.mmd` file.

# ❌ WRONG (no alt text)
**Note**: SVG generation examples are available in the [architecture diagrams folder](../../architecture/diagrams/). Run `scripts/generate-diagram-svgs.sh` to generate SVGs from any `.mmd` file.
```

---

### 5. Keep Diagrams Focused

```
# ✅ CORRECT (one concept per diagram)
- specweave-workflow.mmd         (main workflow)
- increment-lifecycle.mmd         (WIP limits, closures)
- external-integrations.mmd       (GitHub/JIRA/ADO)

# ❌ WRONG (everything in one diagram)
- specweave-everything.mmd        (60+ nodes, overwhelming)
```

---

## File Naming Conventions

| Type | Naming Pattern | Example |
|------|----------------|---------|
| **Workflow** | `{feature}-workflow.mmd` | `specweave-workflow.mmd` |
| **C4 Context** | `system-context.mmd` | `system-context.mmd` |
| **C4 Container** | `system-container.mmd` | `system-container.mmd` |
| **C4 Component** | `component-{service}.mmd` | `component-auth-service.mmd` |
| **Sequence** | `flow-{name}.mmd` | `flow-login.mmd` |
| **ER Diagram** | `data-model-{module}.mmd` | `data-model-auth.mmd` |
| **Deployment** | `deployment-{env}.mmd` | `deployment-production.mmd` |

---

## Directory Structure

```
.specweave/docs/internal/architecture/diagrams/
├── specweave-workflow.mmd              # Main workflow
├── specweave-workflow.svg              # Generated (light)
├── specweave-workflow-dark.svg         # Generated (dark)
├── increment-lifecycle.mmd             # Lifecycle diagram
├── increment-lifecycle.svg
├── increment-lifecycle-dark.svg
├── system-context.mmd                  # C4 Level 1
├── system-context.svg
├── system-container.mmd                # C4 Level 2
├── system-container.svg
└── {module}/                           # Module-specific diagrams
    ├── component-auth-service.mmd      # C4 Level 3
    ├── component-auth-service.svg
    ├── flow-login.mmd                  # Sequence diagram
    ├── flow-login.svg
    ├── data-model.mmd                  # ER diagram
    └── data-model.svg
```

---

## Scripts Reference

### npm run generate:diagrams

**Location**: `scripts/generate-diagram-svgs.sh`

**What it does**:
1. Finds all `.mmd` files in project (excludes `node_modules`, `.git`)
2. Generates light theme SVG for each
3. Generates dark theme SVG for each
4. Reports success/failure

**Output**:
```
🎨 Generating SVG diagrams from Mermaid files...

Found 1 Mermaid diagram(s)

[1/1] Processing: .specweave/docs/internal/architecture/diagrams/specweave-workflow.mmd
  ✓ Generated: specweave-workflow.svg (light theme)
  ✓ Generated: specweave-workflow-dark.svg (dark theme)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Success! Generated SVGs for 1/1 diagram(s)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generated files:
  • .specweave/docs/internal/architecture/diagrams/specweave-workflow.svg (224K)
  • .specweave/docs/internal/architecture/diagrams/specweave-workflow-dark.svg (224K)

💡 Tip: Commit both .mmd and .svg files to git
   Use <img src="path/to/diagram.svg"> in Markdown
```

---

## Related Documentation

- [Diagram Conventions](./diagram-conventions.md) - SpecWeave diagram standards
- [Architecture Documentation](../../architecture/README.md) - Where diagrams are used
- [Mermaid Documentation](https://mermaid.js.org/) - Diagram syntax reference
- [Docusaurus Markdown Features](https://docusaurus.io/docs/markdown-features) - How diagrams render

---

## Summary

**Status**: ✅ Production-ready SVG generation workflow

**Commands**:
```bash
npm run generate:diagrams     # Generate all SVGs
git add **/*.mmd **/*.svg      # Commit source + generated
```

**Benefits**:
- ✅ Reliable rendering across all browsers
- ✅ Dark mode support
- ✅ Faster page loads
- ✅ Version controlled visuals
- ✅ SSG-friendly

**Maintenance**: Run `npm run generate:diagrams` after editing any `.mmd` file

---

**Created**: 2025-10-27
**Last Updated**: Auto-updated when diagrams change
**Maintained By**: SpecWeave Documentation Team
