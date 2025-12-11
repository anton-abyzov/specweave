---
name: specweave:organize-docs
description: Smart documentation organization - generates themed navigation indexes for large folders. Works seamlessly with Docusaurus preview.
---

# Smart Documentation Organizer

Automatically organize large documentation folders by detecting themes and generating navigable category indexes.

## Why Organize?

When folders grow beyond 30+ files, navigation becomes painful:
- ADRs (147 files) - hard to find sync vs hooks vs testing decisions
- Specs - many features across different domains
- Guides - mixed topics without clear structure

**Solution**: Generate themed category indexes WITHOUT moving files (preserves URLs).

## Usage

```bash
# Analyze and organize all internal docs
/sw:organize-docs

# Analyze specific folder only
/sw:organize-docs --folder architecture/adr

# Preview without generating files
/sw:organize-docs --dry-run

# Force regeneration even if under threshold
/sw:organize-docs --force

# Set custom threshold (default: 30)
/sw:organize-docs --threshold 20
```

## Your Task

Execute the smart documentation organizer:

```typescript
import { SmartDocOrganizer, organizeDocumentation } from '../../src/living-docs/smart-doc-organizer.js';
import * as path from 'path';

const projectPath = process.cwd();

// Option 1: Quick organize all internal docs
const result = await organizeDocumentation(projectPath, {
  dryRun: false,  // Set true to preview
  thresholdForOrganization: 30,
});

console.log(result.summary);

// Option 2: Analyze specific folder
const organizer = new SmartDocOrganizer({
  projectPath,
  thresholdForOrganization: 30,
  generateIndexes: true,
  dryRun: false,
});

const adrPath = path.join(projectPath, '.specweave/docs/internal/architecture/adr');
const plan = await organizer.analyzeFolder(adrPath);

console.log(`
📊 DOCUMENTATION ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Folder: ${plan.folder}
Total Files: ${plan.totalFiles}
Needs Organization: ${plan.needsOrganization ? '✅ Yes' : '❌ No'}

Theme Categories:
${plan.themeCategories
  .filter(c => c.count >= 3)
  .map(c => `  ${c.theme.icon} ${c.theme.name}: ${c.count} files`)
  .join('\n')}

Uncategorized: ${plan.uncategorized.length} files
`);

// Generate indexes if needed
if (plan.needsOrganization) {
  const generatedFiles = await organizer.generateCategoryIndexes(plan);
  console.log(`\n✅ Generated ${generatedFiles.length} index files`);
}
```

## What Gets Generated

### 1. Category Index (`_categories.md`)

Main navigation hub with:
- Links to all theme categories
- Quick stats (total docs, categorized count)
- Recently updated documents

### 2. Theme Indexes (`_index-{theme}.md`)

Per-theme navigation with:
- All files in that category
- Sub-grouping for large themes (15+ files)
- Sorted alphabetically

### Theme Detection

The organizer automatically detects these themes:

| Theme | Keywords | Icon |
|-------|----------|------|
| Synchronization | sync, integration, bidirectional | 🔄 |
| Hooks & Events | hook, event, trigger, callback | 🪝 |
| GitHub | github, issue, pull-request, actions | 🐙 |
| External Tools | jira, ado, azure-devops, area-path | 🔌 |
| Testing | test, fixture, mock, coverage, tdd | 🧪 |
| Brownfield | brownfield, migration, legacy | 🏗️ |
| Architecture | pattern, factory, abstraction | 🏛️ |
| Performance | cache, pagination, batch, lazy | ⚡ |
| Security | permission, auth, token, secret | 🔒 |
| Increments | increment, status, lifecycle | 📦 |
| Configuration | config, env, setup, init | ⚙️ |
| Documentation | doc, living, spec, naming | 📚 |

## Output Example

```
📊 DOCUMENTATION ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Folder: architecture/adr
Total Files: 147
Needs Organization: ✅ Yes

Theme Categories:
  🔄 Synchronization & Integration: 23 files
  🐙 GitHub Integration: 18 files
  🪝 Hooks & Events: 15 files
  🧪 Testing & Quality: 12 files
  🔌 External Tools (ADO, JIRA): 11 files
  📦 Increment Lifecycle: 10 files
  ⚡ Performance & Optimization: 9 files
  ⚙️ Configuration & Setup: 8 files

Uncategorized: 14 files

✅ Generated 9 index files:
  - _categories.md
  - _index-sync.md
  - _index-github.md
  - _index-hooks.md
  - _index-testing.md
  - _index-external-tools.md
  - _index-increments.md
  - _index-performance.md
  - _index-config.md
```

## Docusaurus Integration

After running this command, use:

```bash
/sw-docs:view
```

The generated indexes will appear in the sidebar:
- **📚 Browse by Category** - main hub
- **🔄 Synchronization & Integration** - themed section
- **🐙 GitHub Integration** - themed section
- etc.

## Best Practices

1. **Run periodically** - As docs grow, re-run to update indexes
2. **Review uncategorized** - Files without themes may need better naming
3. **Check Docusaurus** - Preview after organizing to verify navigation
4. **Don't move files** - Indexes are virtual, original URLs preserved

## Related Commands

- `/sw-docs:view` - View documentation with Docusaurus
- `/sw-docs:build` - Build static documentation site
- Enterprise health report - Includes organization recommendations
