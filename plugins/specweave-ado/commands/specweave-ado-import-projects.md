---
name: specweave-ado:import-projects
description: Import additional Azure DevOps projects post-init with area path mapping, filtering, and dry-run preview
---

# Import Azure DevOps Projects Command

You are an Azure DevOps project import expert. Help users add additional ADO projects to their SpecWeave workspace after initial setup.

## Purpose

This command allows users to import additional Azure DevOps projects **after** initial SpecWeave setup (`specweave init`), with area path mapping, filtering, and dry-run preview.

**Use Cases**:
- Adding new ADO projects to existing workspace
- Importing projects from different organizations
- Selective import with area path granularity
- Multi-project organization (Backend, Frontend, Mobile, Infrastructure)

## Command Syntax

```bash
# Basic import (interactive)
/specweave-ado:import-projects

# With area path granularity
/specweave-ado:import-projects --granularity two-level

# Dry-run (preview)
/specweave-ado:import-projects --dry-run

# Resume interrupted import
/specweave-ado:import-projects --resume

# Combined
/specweave-ado:import-projects --granularity top-level --dry-run
```

## Your Task

When the user runs this command:

### Step 1: Validate Prerequisites
```typescript
import { readEnvFile, parseEnvFile } from '../../../src/utils/env-file.js';

// 1. Check if ADO credentials exist
const envContent = readEnvFile(process.cwd());
const parsed = parseEnvFile(envContent);

if (!parsed.AZURE_DEVOPS_PAT || !parsed.AZURE_DEVOPS_ORG) {
  console.log('❌ Missing Azure DevOps credentials. Run `specweave init` first.');
  return;
}

// 2. Get existing configuration
const org = parsed.AZURE_DEVOPS_ORG;
const existingProject = parsed.AZURE_DEVOPS_PROJECT;

console.log(`\n📋 Organization: ${org}`);
console.log(`   Current project: ${existingProject || 'None'}\n`);
```

### Step 2: Fetch Available Projects
```typescript
import { getProjectCount } from '../../../src/cli/helpers/project-count-fetcher.js';
import { AsyncProjectLoader } from '../../../src/cli/helpers/async-project-loader.js';

// Count check (< 1 second)
const countResult = await getProjectCount({
  provider: 'ado',
  credentials: {
    organization: org,
    pat: parsed.AZURE_DEVOPS_PAT
  }
});

console.log(`✓ Found ${countResult.accessible} accessible project(s)`);

// Fetch all projects (with smart pagination)
const loader = new AsyncProjectLoader(
  {
    organization: org,
    pat: parsed.AZURE_DEVOPS_PAT
  },
  'ado',
  {
    batchSize: 50,
    updateFrequency: 5,
    showEta: true
  }
);

const result = await loader.fetchAllProjects(countResult.accessible);
const allProjects = result.projects;
```

### Step 3: Area Path Mapping (Multi-Project Organization)
```typescript
import { AreaPathMapper } from '../../../src/integrations/ado/area-path-mapper.js';

const { selectedProject } = await inquirer.prompt([{
  type: 'select',
  name: 'selectedProject',
  message: 'Select ADO project to import area paths from:',
  choices: allProjects.map(p => ({ name: p.name, value: p.name }))
}]);

const mapper = new AreaPathMapper({
  credentials: { organization: org, pat: parsed.AZURE_DEVOPS_PAT },
  project: selectedProject
});

// Fetch area path tree
const areaPathTree = await mapper.fetchAreaPaths();

// Get granularity suggestion
const suggestion = mapper.suggestGranularity(areaPathTree);
console.log(`\n💡 Suggestion: ${suggestion.suggested}`);
console.log(`   ${suggestion.reasoning}\n`);

// Prompt for granularity (if not provided via CLI)
const granularity = args.granularity || await mapper.promptAreaPathGranularity(areaPathTree);

// Flatten area paths with selected granularity
const areaPaths = mapper.flattenAreaPaths(areaPathTree, granularity);

console.log(`\n📊 ${areaPaths.length} project(s) will be created from area paths:\n`);
areaPaths.forEach(ap => {
  const projectId = mapper.mapToProjectId(ap.path);
  console.log(`   ✨ ${ap.path} → ${projectId}`);
});
```

### Step 4: Dry-Run or Execute
```typescript
if (args.dryRun) {
  console.log('\n🔎 DRY RUN: No changes will be made.\n');
  console.log('The following projects would be configured:');
  areaPaths.forEach(ap => {
    const projectId = mapper.mapToProjectId(ap.path);
    console.log(`   ✨ ${projectId} (${ap.path})`);
  });
  console.log(`\nTotal: ${areaPaths.length} projects would be configured\n`);
  return;
}

// Confirm import
const { confirmed } = await inquirer.prompt([{
  type: 'confirm',
  name: 'confirmed',
  message: `Configure ${areaPaths.length} project(s) from area paths?`,
  default: true
}]);

if (!confirmed) {
  console.log('⏭️  Import cancelled.');
  return;
}
```

### Step 5: Update Configuration
```typescript
import { getConfigManager } from '../../../src/core/config/index.js';

const configManager = getConfigManager(process.cwd());

// Build area path configuration
const areaPathConfig: Record<string, string[]> = {};

for (const ap of areaPaths) {
  const projectId = mapper.mapToProjectId(ap.path);
  areaPathConfig[projectId] = [ap.path];
}

// Update configuration
await configManager.update({
  issueTracker: {
    provider: 'ado',
    ado: {
      organization: org,
      project: selectedProject,
      areaPathMapping: areaPathConfig,
      granularity
    }
  }
});

// Update .env file
import { updateEnvFile } from '../../../src/utils/env-manager.js';

await updateEnvFile('AZURE_DEVOPS_PROJECT', selectedProject);

// Write area paths to .env (comma-separated)
const areaPathList = areaPaths.map(ap => ap.path).join(',');
await updateEnvFile('AZURE_DEVOPS_AREA_PATHS', areaPathList);

console.log('\n✅ Projects configured successfully!\n');
console.log(`Organization: ${org}`);
console.log(`Project: ${selectedProject}`);
console.log(`Granularity: ${granularity}`);
console.log(`\nArea paths configured:\n   ${areaPathList.split(',').join('\n   ')}\n`);
```

### Step 6: Resume Support
```typescript
if (args.resume) {
  const { CacheManager } = await import('../../../src/core/cache/cache-manager.js');
  const cacheManager = new CacheManager(process.cwd());

  const importState = await cacheManager.get('ado-import-state');

  if (!importState) {
    console.log('⚠️  No import state found. Use without --resume to start fresh.');
    return;
  }

  console.log(`\n📂 Resuming from: ${importState.lastAreaPath} (${importState.completed}/${importState.total})`);

  // Skip already-processed area paths
  const remainingPaths = areaPaths.filter(ap => !importState.processed.includes(ap.path));

  // Continue import with remaining paths
  // (use same logic as Step 5)
}
```

## Examples

### Example 1: Basic Import with Area Paths
**User**: `/specweave-ado:import-projects`

**Output**:
```
📋 Organization: mycompany
   Current project: Platform

✓ Found 5 accessible project(s)

Select ADO project to import area paths from:
> Platform

💡 Suggestion: two-level
   Balanced hierarchy (8 two-level areas). Recommended granularity.

Select area path granularity for project organization:
> Two-level (8 projects) - e.g., Backend-API, Backend-Database

📊 8 project(s) will be created from area paths:

   ✨ Platform/Backend/API → backend-api
   ✨ Platform/Backend/Database → backend-database
   ✨ Platform/Frontend/Web → frontend-web
   ✨ Platform/Frontend/Admin → frontend-admin
   ✨ Platform/Mobile/iOS → mobile-ios
   ✨ Platform/Mobile/Android → mobile-android
   ✨ Platform/Infrastructure/Cloud → infrastructure-cloud
   ✨ Platform/Infrastructure/Network → infrastructure-network

Configure 8 project(s) from area paths? (Y/n)

✅ Projects configured successfully!

Organization: mycompany
Project: Platform
Granularity: two-level

Area paths configured:
   Platform/Backend/API
   Platform/Backend/Database
   Platform/Frontend/Web
   Platform/Frontend/Admin
   Platform/Mobile/iOS
   Platform/Mobile/Android
   Platform/Infrastructure/Cloud
   Platform/Infrastructure/Network
```

### Example 2: Top-Level Only
**User**: `/specweave-ado:import-projects --granularity top-level`

**Output**:
```
Select area path granularity: top-level (forced via CLI)

📊 3 project(s) will be created from area paths:

   ✨ Platform/Backend → backend
   ✨ Platform/Frontend → frontend
   ✨ Platform/Mobile → mobile
```

### Example 3: Dry-Run
**User**: `/specweave-ado:import-projects --dry-run`

**Output**:
```
🔎 DRY RUN: No changes will be made.

The following projects would be configured:
   ✨ backend-api (Platform/Backend/API)
   ✨ backend-database (Platform/Backend/Database)
   ✨ frontend-web (Platform/Frontend/Web)

Total: 8 projects would be configured
```

## Important Notes

- **Multi-Project Organization**: Uses area paths to create logical project separation
- **Granularity Control**: Top-level, two-level, or full-tree based on hierarchy complexity
- **Atomic Updates**: Uses temp file + rename to prevent corruption
- **Progress Tracking**: Shows progress bar for large hierarchies (> 50 area paths)
- **Resume Support**: Interrupted imports can be resumed with `--resume`

## Related Commands

- `/specweave:init` - Initial SpecWeave setup
- `/specweave-ado:sync` - Sync increments with ADO work items
- `/specweave-ado:refresh-cache` - Clear cached ADO data

## Error Handling

- **Missing Credentials**: Prompt user to run `specweave init` first
- **API Errors**: Show clear error message with suggestion
- **No Area Paths**: Fallback to single-project mode
- **Permission Errors**: Check ADO PAT scopes

---

**Multi-Project Excellence**: This command enables sophisticated multi-project organization in Azure DevOps using area paths, perfect for large teams with complex hierarchies.
