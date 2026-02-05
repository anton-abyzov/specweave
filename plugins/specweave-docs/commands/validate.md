---
description: Validate documentation before preview/build. Catches YAML, MDX, broken links, and naming issues. Auto-fix available. Run this BEFORE preview or build to prevent cryptic webpack errors.
---

# Documentation Validation Command

Validate your documentation for Docusaurus compatibility BEFORE starting the preview server or building.

## Why This Matters

Docusaurus compilation errors are often cryptic:
- `Unexpected character` → unquoted HTML attribute
- `Unterminated JSX contents` → unclosed tag
- `Could not parse expression` → bad YAML frontmatter

This validator catches these issues **before** you see webpack errors.

## Usage

```bash
# Validate internal docs (default)
/sw-docs:validate

# Validate with auto-fix
/sw-docs:validate --fix

# Validate public docs
/sw-docs:validate public

# Validate specific path
/sw-docs:validate --path .specweave/docs/internal/specs
```

## Your Task

**CRITICAL**: Run validation BEFORE starting preview or build!

### Step 1: Determine Docs Path

```bash
# Check which docs to validate
DOCS_TYPE="${1:-internal}"  # internal or public

if [ "$DOCS_TYPE" = "public" ]; then
  DOCS_PATH=".specweave/docs/public"
else
  DOCS_PATH=".specweave/docs/internal"
fi

# Verify path exists
if [ ! -d "$DOCS_PATH" ]; then
  echo "❌ Documentation path not found: $DOCS_PATH"
  exit 1
fi
```

### Step 2: Run Validation

Execute the validation using the DocsValidator:

```typescript
import { DocsValidator } from '../../../src/utils/docs-validator.js';
import * as path from 'path';

// Get options from command args
const autoFix = process.argv.includes('--fix');
const docsType = process.argv.find(a => a === 'public') ? 'public' : 'internal';
const docsPath = path.resolve(`.specweave/docs/${docsType}`);

// Create validator
const validator = new DocsValidator({
  docsPath,
  autoFix,
});

// Run validation
console.log(`\n📋 Validating ${docsType} documentation...`);
console.log(`   Path: ${docsPath}\n`);

const result = await validator.validate();

// Display formatted result
console.log(DocsValidator.formatResult(result));

// Exit with error code if invalid (for CI integration)
if (!result.valid && !autoFix) {
  console.log('💡 Tip: Run with --fix to auto-repair fixable issues\n');
  process.exit(1);
}
```

### Step 3: Report Results

Display a clear summary:

```
═══════════════════════════════════════════════════════════════
               DOCUMENTATION VALIDATION REPORT
═══════════════════════════════════════════════════════════════

✅ Documentation is valid and ready for preview/build

   Errors:   0
   Warnings: 3
   Info:     0

═══════════════════════════════════════════════════════════════
```

Or if issues found:

```
═══════════════════════════════════════════════════════════════
               DOCUMENTATION VALIDATION REPORT
═══════════════════════════════════════════════════════════════

❌ Documentation has issues that need to be fixed

   Errors:   2
   Warnings: 5
   Info:     0

ERRORS (must fix):
───────────────────────────────────────────────────────────────
  📄 specs/FS-118E/FEATURE.md
     ❌ yaml_unquoted_colon:3: Unquoted colon in YAML value: title: Feature: External Sync [auto-fixable]

  📄 architecture/diagrams/overview.md
     ❌ mdx_compatibility: Unquoted attribute: target=_blank [auto-fixable]

QUICK FIXES:
───────────────────────────────────────────────────────────────
  1. Run validation with auto-fix:
     /sw-docs:validate --fix

  2. Or fix manually:
     • YAML: Wrap values with colons in quotes
       title: "Feature: Auth" (not title: Feature: Auth)
     • MDX: Quote HTML attributes, close self-closing tags
       target="_blank" (not target=_blank)
       <br /> (not <br>)

═══════════════════════════════════════════════════════════════
```

## What Gets Validated

### 1. YAML Frontmatter
- Unclosed frontmatter (`---` without closing `---`)
- Unquoted colons in values (`title: Feature: Auth` → error)
- Tab characters (YAML requires spaces)
- Invalid syntax

### 2. MDX/JSX Compatibility
- Unquoted HTML attributes (`target=_blank` → needs quotes)
- Non-self-closing void tags (`<br>` → needs `<br />`)
- Script/style tags (not allowed in MDX)
- Unclosed HTML comments

### 3. File Issues
- Duplicate routes (same path, different extensions)
- Invalid filename characters
- Spaces in filenames (URL issues)
- Very long filenames

### 4. Internal Links
- Broken links to non-existent files
- Links to files outside docs folder (warning)
- Malformed link syntax

## Auto-Fix Behavior

With `--fix`, the validator automatically repairs:

| Issue Type | Auto-Fix Action |
|------------|-----------------|
| `yaml_unquoted_colon` | Wraps value in quotes |
| `yaml_tabs` | Converts tabs to spaces |
| `mdx_compatibility` | Quotes attributes, closes tags |

Issues that **cannot** be auto-fixed:
- Broken links (need manual review)
- Duplicate routes (need to rename/delete)
- Invalid filenames (need manual rename)

## CI/CD Integration

Use in GitHub Actions to gate deployments:

```yaml
name: Validate Docs

on:
  push:
    paths:
      - '.specweave/docs/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: npx specweave docs:validate
```

## Troubleshooting

### "yaml_unquoted_colon" errors
```yaml
# Wrong:
title: Feature: External Sync

# Correct:
title: "Feature: External Sync"
```

### "mdx_compatibility" errors
```html
<!-- Wrong -->
<a href="..." target=_blank>Link</a>
<br>

<!-- Correct -->
<a href="..." target="_blank">Link</a>
<br />
```

### Many broken link warnings
If you see many warnings about links to `CLAUDE.md`, `README.md`, or `_archive/`:
- These are references to files outside the docs folder
- They're warnings, not errors
- The docs will still render, links just won't work in preview

### To suppress warnings for intentional external refs
Add to docusaurus.config.ts:
```typescript
onBrokenLinks: 'warn',  // Not 'throw'
onBrokenMarkdownLinks: 'warn',
```

## See Also

- `/sw-docs:view` - View docs (runs validation first)
- `/sw-docs:build` - Build docs (runs validation first)
- `/sw-docs:health` - Full documentation health report
