---
id: US-005
feature: FS-048
title: "Dedicated Import Commands (Post-Init Flexibility)"
status: proposed
priority: P2
created: 2025-11-21
---

# US-005: Dedicated Import Commands (Post-Init Flexibility)

**GitHub Project**: https://github.com/anton-abyzov/specweave/issues/707

**Feature**: [FS-048 - Enhanced External Tool Import](../../../_features/FS-048/FEATURE.md)

## User Story

**As a** team lead managing SpecWeave for multiple teams
**I want** to add projects incrementally after initial setup
**So that** I can onboard teams gradually without re-running `specweave init`

## Business Value

- **Flexibility**: Add projects as teams adopt SpecWeave (no big-bang migration)
- **Recovery**: Recover from partial failures (interrupted init can resume)
- **Maintenance**: Add new JIRA/ADO projects as company grows

## Acceptance Criteria

### AC-US5-01: `/specweave-jira:import-projects` Command
- **Priority**: P2
- **Testable**: Yes (E2E test)
- **Description**: Post-init command to add JIRA projects
- **Usage**:
  ```
  /specweave-jira:import-projects
  /specweave-jira:import-projects --filter active
  /specweave-jira:import-projects --resume
  ```
- **Validation**: Command exists, runs without errors

### AC-US5-02: `/specweave-ado:import-projects` Command
- **Priority**: P2
- **Testable**: Yes (E2E test)
- **Description**: Post-init command to add Azure DevOps projects
- **Usage**: Same as JIRA (consistency)
- **Validation**: Command exists, runs without errors

### AC-US5-03: Merge with Existing Projects (No Duplicates)
- **Priority**: P1
- **Testable**: Yes (integration test)
- **Description**: Imported projects merged with existing config
- **Behavior**:
  - Read existing `JIRA_PROJECTS` from `.env`
  - Merge new projects (avoid duplicates)
  - Update `.env` with merged list
  - Example:
    ```
    Existing: BACKEND,FRONTEND
    Importing: MOBILE,INFRA
    Result: BACKEND,FRONTEND,MOBILE,INFRA
    ```
- **Validation**: No duplicate project keys after import

### AC-US5-04: Smart Filtering (Active Only, By Type, Custom JQL)
- **Priority**: P2
- **Testable**: Yes (integration test)
- **Description**: Filter projects before importing
- **Filters**:
  - `--filter active` - Exclude archived projects
  - `--filter agile` - Only Agile-type projects
  - `--filter "lead:john.doe"` - Projects led by specific user
  - `--jql "project in (BACKEND, FRONTEND)"` - Custom JIRA query
- **Validation**: Filters applied correctly

### AC-US5-05: Resume Support (Interrupted Imports)
- **Priority**: P2
- **Testable**: Yes (integration test)
- **Description**: Resume interrupted imports without restarting
- **State File**: `.specweave/cache/import-state.json`
- **Behavior**:
  - Save progress after each project imported
  - On resume, skip already-imported projects
  - Expire state after 24 hours (force fresh start)
- **Validation**: Ctrl+C mid-import → Resume completes successfully

### AC-US5-06: Progress Tracking with Cancelation
- **Priority**: P1
- **Testable**: Yes (E2E test)
- **Description**: Real-time progress with graceful cancelation
- **Display**:
  ```
  Importing projects... 12/50 (24%)
  ✅ BACKEND
  ✅ FRONTEND
  ⏳ MOBILE (loading dependencies...)
  ```
- **Cancelation**: Ctrl+C saves state, shows "Use --resume to continue"
- **Validation**: Progress updates shown, Ctrl+C handled gracefully

### AC-US5-07: Dry-Run Mode (Preview)
- **Priority**: P2
- **Testable**: Yes (unit test)
- **Description**: Preview what will be imported without making changes
- **Usage**: `/specweave-jira:import-projects --dry-run`
- **Output**:
  ```
  Dry run: The following projects would be imported:
    ✨ MOBILE (Agile, lead: John Doe)
    ✨ INFRA (Software, lead: Jane Smith)
    ⏭️ LEGACY (archived - skipped)

  Total: 2 projects would be imported
  ```
- **Validation**: No changes to `.env` or config files

## Technical Implementation

### Command Structure

```typescript
// plugins/specweave-jira/commands/import-projects.ts (NEW)

export interface ImportProjectsOptions {
  filter?: 'active' | 'agile' | 'cmmi' | 'safe';
  jql?: string;
  resume?: boolean;
  dryRun?: boolean;
}

export async function importProjectsCommand(options: ImportProjectsOptions = {}) {
  const config = await loadSpecWeaveConfig();
  const jiraClient = createJiraClient(config);

  // Load existing projects
  const existingProjects = getExistingProjects(config);  // From .env JIRA_PROJECTS

  // Check for resume state
  if (options.resume) {
    const state = await loadImportState();
    if (state) {
      console.log(`📋 Resuming import from last checkpoint (${state.completed}/${state.total} complete)\n`);
      return await resumeImport(state, jiraClient);
    } else {
      console.log('⚠️  No import state found. Starting fresh import.\n');
    }
  }

  // Fetch all available projects
  const allProjects = await jiraClient.getProjects();

  // Apply filters
  const filteredProjects = applyFilters(allProjects, options);

  // Remove already-imported projects
  const newProjects = filteredProjects.filter(p =>
    !existingProjects.includes(p.key)
  );

  if (newProjects.length === 0) {
    console.log('✅ No new projects to import (all projects already configured)\n');
    return;
  }

  // Dry run preview
  if (options.dryRun) {
    console.log('🔍 Dry run: The following projects would be imported:\n');
    newProjects.forEach(p => {
      console.log(`   ✨ ${p.key} (${p.type}, lead: ${p.lead})`);
    });
    console.log(`\nTotal: ${newProjects.length} projects would be imported\n`);
    return;
  }

  // Confirm import
  const { confirm } = await inquirer.prompt({
    type: 'confirm',
    name: 'confirm',
    message: `Import ${newProjects.length} new projects?`,
    default: true
  });

  if (!confirm) {
    console.log('⏭️  Import cancelled\n');
    return;
  }

  // Import projects with progress tracking
  await importProjectsWithProgress(newProjects, jiraClient, existingProjects);
}

async function importProjectsWithProgress(
  projects: any[],
  client: JiraClient,
  existingProjects: string[]
): Promise<void> {
  const total = projects.length;
  let completed = 0;
  const imported: string[] = [];
  const failed: string[] = [];

  console.log(`\n📦 Importing ${total} projects...\n`);

  for (const project of projects) {
    try {
      console.log(`⏳ ${project.key} (${completed + 1}/${total})`);

      // Load dependencies (Tier 2)
      await client.loadDependencies(project.key);

      // Add to imported list
      imported.push(project.key);
      completed++;

      // Save state (for resume capability)
      await saveImportState({
        total,
        completed,
        imported,
        failed,
        lastProject: project.key
      });

      console.log(`✅ ${project.key} (${completed}/${total})\n`);
    } catch (error) {
      console.error(`❌ ${project.key}: ${(error as Error).message}\n`);
      failed.push(project.key);
    }
  }

  // Update .env with merged project list
  const mergedProjects = [...existingProjects, ...imported];
  await updateEnvFile('JIRA_PROJECTS', mergedProjects.join(','));

  // Summary
  console.log(`\n✅ Import complete: ${imported.length}/${total} projects imported`);
  if (failed.length > 0) {
    console.log(`❌ Failed: ${failed.length} projects (${failed.join(', ')})`);
  }

  // Clean up state file
  await deleteImportState();
}
```

## Test Cases

### TC-US5-01: Import Command Exists (E2E Test)
```typescript
test('should have /specweave-jira:import-projects command', async ({ page }) => {
  await page.goto('/');

  const commandList = await page.locator('[data-testid="command-palette"]');
  await commandList.click();

  const importCmd = page.getByText('/specweave-jira:import-projects');
  await expect(importCmd).toBeVisible();
});
```

### TC-US5-02: Merge Without Duplicates (Integration Test)
```typescript
test('should merge projects without duplicates', async () => {
  // Existing projects
  process.env.JIRA_PROJECTS = 'BACKEND,FRONTEND';

  // Import new projects
  await importProjectsCommand({ filter: 'active' });

  // Verify merged (no duplicates)
  const updated = process.env.JIRA_PROJECTS.split(',');
  expect(updated).toContain('BACKEND');
  expect(updated).toContain('FRONTEND');
  expect(updated).toContain('MOBILE');  // New project
  expect(updated.length).toBe(3);  // No duplicates
});
```

### TC-US5-03: Resume Interrupted Import (Integration Test)
```typescript
test('should resume interrupted import', async () => {
  // Create import state (interrupted at 25/50)
  await saveImportState({
    total: 50,
    completed: 25,
    imported: ['BACKEND', 'FRONTEND', ...],  // 25 projects
    failed: [],
    lastProject: 'PROJ-025'
  });

  // Resume import
  await importProjectsCommand({ resume: true });

  // Verify only remaining 25 projects imported
  const apiCalls = mockClient.callCount;
  expect(apiCalls).toBe(25);  // Not 50 (skip first 25)
});
```

### TC-US5-04: Dry-Run Preview (Unit Test)
```typescript
test('should preview import without making changes', async () => {
  const consoleSpy = vi.spyOn(console, 'log');

  await importProjectsCommand({ dryRun: true });

  // Verify dry-run message shown
  expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Dry run'));

  // Verify no .env changes
  const envContent = readEnvFile('.');
  expect(envContent).not.toContain('JIRA_PROJECTS');  // No updates
});
```

## Dependencies

- **US-003**: Three-Tier Dependency Loading (used by import)
- **US-004**: Smart Caching (cache imported project dependencies)
- **Existing**: `.env` file management utilities

## Risks & Mitigations

### Risk: Partial .env Corruption
- **Problem**: Import interrupted mid-write, `.env` corrupted
- **Mitigation**:
  - Atomic write (write to temp file, rename)
  - Backup `.env` before changes (`.env.backup`)
  - Validate `.env` syntax after write

---

**Implementation Tasks**: See increment plan
**Related User Stories**: US-003 (Dependency Loading), US-007 (Progress Tracking)
