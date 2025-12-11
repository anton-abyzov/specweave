---
name: sw-jira:import-projects
description: Import additional JIRA projects post-init with filtering, resume support, and dry-run preview
---

# Import JIRA Projects Command

You are a JIRA project import expert. Help users add additional JIRA projects to their SpecWeave workspace after initial setup.

## Purpose

This command allows users to import additional JIRA projects **after** initial SpecWeave setup (`specweave init`), with advanced filtering, resume capability, and dry-run preview.

**Use Cases**:
- Adding new JIRA projects to existing workspace
- Importing archived/paused projects later
- Selective import with filters (active only, specific types, custom JQL)

## Command Syntax

```bash
# Basic import (interactive)
/sw-jira:import-projects

# With filters
/sw-jira:import-projects --filter active
/sw-jira:import-projects --type agile --lead "john.doe@company.com"
/sw-jira:import-projects --jql "project IN (BACKEND, FRONTEND) AND status != Archived"

# Dry-run (preview)
/sw-jira:import-projects --dry-run

# Resume interrupted import
/sw-jira:import-projects --resume

# Combined
/sw-jira:import-projects --filter active --dry-run
```

## Your Task

When the user runs this command:

### Step 1: Validate Prerequisites
```typescript
import { readEnvFile, parseEnvFile } from '../../../src/utils/env-file.js';

// 1. Check if Jira credentials exist
const envContent = readEnvFile(process.cwd());
const parsed = parseEnvFile(envContent);

if (!parsed.JIRA_API_TOKEN || !parsed.JIRA_EMAIL || !parsed.JIRA_DOMAIN) {
  console.log('❌ Missing Jira credentials. Run `specweave init` first.');
  return;
}

// 2. Get existing projects
const existingProjects = parsed.JIRA_PROJECTS?.split(',') || [];
console.log(`\n📋 Current projects: ${existingProjects.join(', ') || 'None'}\n`);
```

### Step 2: Fetch Available Projects
```typescript
import { getProjectCount } from '../../../src/cli/helpers/project-count-fetcher.js';
import { AsyncProjectLoader } from '../../../src/cli/helpers/async-project-loader.js';

// Count check (< 1 second)
const countResult = await getProjectCount({
  provider: 'jira',
  credentials: {
    domain: parsed.JIRA_DOMAIN,
    email: parsed.JIRA_EMAIL,
    token: parsed.JIRA_API_TOKEN,
    instanceType: 'cloud'
  }
});

console.log(`✓ Found ${countResult.accessible} accessible projects`);

// Fetch all projects (with smart pagination)
const loader = new AsyncProjectLoader(
  {
    domain: parsed.JIRA_DOMAIN,
    email: parsed.JIRA_EMAIL,
    token: parsed.JIRA_API_TOKEN,
    instanceType: 'cloud'
  },
  'jira',
  {
    batchSize: 50,
    updateFrequency: 5,
    showEta: true
  }
);

const result = await loader.fetchAllProjects(countResult.accessible);
let allProjects = result.projects;
```

### Step 3: Apply Filters (if specified)
```typescript
import { FilterProcessor } from '../../../src/integrations/jira/filter-processor.js';

const options = {
  filter: args.filter,       // 'active' | 'all'
  type: args.type,           // 'agile' | 'software' | 'business'
  lead: args.lead,           // Email address
  jql: args.jql              // Custom JQL
};

const filterProcessor = new FilterProcessor({ domain: parsed.JIRA_DOMAIN, token: parsed.JIRA_API_TOKEN });
const filteredProjects = await filterProcessor.applyFilters(allProjects, options);

console.log(`\n🔍 Filters applied:`);
if (options.filter === 'active') console.log(`   • Active projects only`);
if (options.type) console.log(`   • Type: ${options.type}`);
if (options.lead) console.log(`   • Lead: ${options.lead}`);
if (options.jql) console.log(`   • JQL: ${options.jql}`);
console.log(`\n📊 Results: ${filteredProjects.length} projects (down from ${allProjects.length})\n`);
```

### Step 4: Exclude Existing Projects
```typescript
const newProjects = filteredProjects.filter(p => !existingProjects.includes(p.key));

if (newProjects.length === 0) {
  console.log('✅ No new projects to import. All filtered projects are already configured.');
  return;
}

console.log(`📥 ${newProjects.length} new project(s) available for import:\n`);
newProjects.forEach(p => {
  console.log(`   ✨ ${p.key} - ${p.name} (${p.projectTypeKey}, lead: ${p.lead?.displayName || 'N/A'})`);
});
```

### Step 5: Dry-Run or Execute
```typescript
if (args.dryRun) {
  console.log('\n🔎 DRY RUN: No changes will be made.\n');
  console.log('The following projects would be imported:');
  newProjects.forEach(p => {
    const status = p.archived ? '⏭️  (archived - skipped)' : '✨';
    console.log(`   ${status} ${p.key} - ${p.name}`);
  });
  console.log(`\nTotal: ${newProjects.filter(p => !p.archived).length} projects would be imported\n`);
  return;
}

// Confirm import
const { confirmed } = await inquirer.prompt([{
  type: 'confirm',
  name: 'confirmed',
  message: `Import ${newProjects.length} project(s)?`,
  default: true
}]);

if (!confirmed) {
  console.log('⏭️  Import cancelled.');
  return;
}
```

### Step 6: Merge with Existing
```typescript
import { updateEnvFile, mergeProjectList } from '../../../src/utils/env-manager.js';

const newKeys = newProjects.map(p => p.key);
const mergedProjects = mergeProjectList(existingProjects, newKeys);

// Update .env file (atomic write)
await updateEnvFile('JIRA_PROJECTS', mergedProjects.join(','));

console.log('\n✅ Projects imported successfully!\n');
console.log(`Updated: ${existingProjects.length} → ${mergedProjects.length} projects`);
console.log(`\nCurrent projects:\n   ${mergedProjects.join(', ')}\n`);
```

### Step 7: Resume Support
```typescript
if (args.resume) {
  const { CacheManager } = await import('../../../src/core/cache/cache-manager.js');
  const cacheManager = new CacheManager(process.cwd());

  const importState = await cacheManager.get('jira-import-state');

  if (!importState) {
    console.log('⚠️  No import state found. Use without --resume to start fresh.');
    return;
  }

  console.log(`\n📂 Resuming from: ${importState.lastProject} (${importState.completed}/${importState.total})`);

  // Skip already-imported projects
  const remainingProjects = allProjects.filter(p => !importState.succeeded.includes(p.key));

  // Continue import with remaining projects
  // (use same logic as Step 6)
}
```

## Examples

### Example 1: Basic Import
**User**: `/sw-jira:import-projects`

**Output**:
```
📋 Current projects: BACKEND, FRONTEND

✓ Found 127 accessible projects
📥 5 new project(s) available for import:

   ✨ MOBILE - Mobile App (agile, lead: John Doe)
   ✨ INFRA - Infrastructure (software, lead: Jane Smith)
   ✨ QA - Quality Assurance (business, lead: Bob Wilson)
   ✨ DOCS - Documentation (business, lead: Alice Cooper)
   ✨ LEGACY - Legacy System (archived - skipped)

Import 5 project(s)? (Y/n)

✅ Projects imported successfully!

Updated: 2 → 6 projects

Current projects:
   BACKEND, FRONTEND, MOBILE, INFRA, QA, DOCS
```

### Example 2: Filter Active Only
**User**: `/sw-jira:import-projects --filter active`

**Output**:
```
🔍 Filters applied:
   • Active projects only

📊 Results: 120 projects (down from 127)

📥 4 new project(s) available for import:
   (LEGACY project excluded because it's archived)
```

### Example 3: Dry-Run
**User**: `/sw-jira:import-projects --dry-run`

**Output**:
```
🔎 DRY RUN: No changes will be made.

The following projects would be imported:
   ✨ MOBILE - Mobile App
   ✨ INFRA - Infrastructure
   ✨ QA - Quality Assurance
   ⏭️  LEGACY - Legacy System (archived - skipped)

Total: 3 projects would be imported
```

### Example 4: Custom JQL Filter
**User**: `/sw-jira:import-projects --jql "project IN (MOBILE, INFRA) AND status != Archived"`

**Output**:
```
🔍 Filters applied:
   • JQL: project IN (MOBILE, INFRA) AND status != Archived

📊 Results: 2 projects (down from 127)

📥 2 new project(s) available for import:
   ✨ MOBILE - Mobile App
   ✨ INFRA - Infrastructure
```

## Important Notes

- **Merge Logic**: No duplicates. Existing projects are preserved.
- **Atomic Updates**: Uses temp file + rename to prevent corruption.
- **Progress Tracking**: Shows progress bar for large imports (> 50 projects).
- **Resume Support**: Interrupted imports can be resumed with `--resume`.
- **Backup**: Creates `.env.backup` before modifying `.env`.

## Related Commands

- `/sw:init` - Initial SpecWeave setup
- `/sw-jira:sync` - Sync increments with Jira epics
- `/sw-jira:refresh-cache` - Clear cached project data

## Error Handling

- **Missing Credentials**: Prompt user to run `specweave init` first
- **API Errors**: Show clear error message with suggestion
- **No New Projects**: Inform user all projects already imported
- **Permission Errors**: Check `.env` file permissions

---

**Post-Init Flexibility**: This command provides flexibility to add projects after initial setup, supporting evolving team structures and project lifecycles.
