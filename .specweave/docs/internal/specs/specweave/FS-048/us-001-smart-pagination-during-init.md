---
id: US-001
feature: FS-048
title: "Smart Pagination During Init (50-Project Limit)"
status: proposed
priority: P0
created: 2025-11-21
---

# US-001: Smart Pagination During Init (50-Project Limit)

**Feature**: [FS-048 - Enhanced External Tool Import](../../../_features/FS-048/FEATURE.md)

## User Story

**As a** DevOps engineer configuring SpecWeave for a large organization
**I want** init to load projects quickly without timeouts
**So that** I can complete setup in < 30 seconds instead of waiting 2-5 minutes

## Business Value

- **Time Savings**: 80% reduction in init time (2-5 minutes → < 30 seconds)
- **User Frustration**: Eliminates timeout errors for large JIRA/ADO instances
- **Onboarding**: Faster setup = better first impression for new teams

## Acceptance Criteria

### AC-US1-01: 50-Project Limit During Init
- **Priority**: P0
- **Testable**: Yes (integration test with mock API)
- **Description**: `specweave init` loads maximum 50 projects initially
- **Validation**: API mock returns 200 projects, init loads only 50

### AC-US1-02: Explicit Choice Prompt
- **Priority**: P0
- **Testable**: Yes (E2E test with Playwright)
- **Description**: User shown upfront choice before loading all projects
- **Prompt Format**:
  ```
  Found 127 accessible projects. How would you like to import?

  1. ✨ Import all 127 projects (recommended for full sync)
  2. 📋 Select specific projects (interactive)
  3. ✏️ Enter project keys manually
  ```
- **Validation**: Prompt appears, all 3 options available

### AC-US1-03: Async Fetch for "Import All"
- **Priority**: P1
- **Testable**: Yes (unit test for async fetch logic)
- **Description**: "Import all" fetches remaining projects asynchronously
- **Behavior**:
  - Show progress: "Fetching projects... 50/127 (39%)"
  - User can cancel (Ctrl+C) and resume later
  - Errors logged, import continues with successful projects
- **Validation**: Progress bar updates, cancelation works

### AC-US1-04: Init Completes < 30 Seconds
- **Priority**: P0
- **Testable**: Yes (performance test)
- **Description**: Init completes in < 30 seconds even for 500+ project instances
- **Measurement**: Performance test with real JIRA/ADO API
- **Validation**: 95th percentile < 30 seconds (50 test runs)

### AC-US1-05: No Timeout Errors
- **Priority**: P0
- **Testable**: Yes (E2E test with timeout injection)
- **Description**: Init never times out due to excessive API calls
- **Validation**: 100 consecutive init runs with 500-project mock, zero timeouts

## Technical Implementation

### Files to Modify

1. **`src/cli/helpers/issue-tracker/jira.ts`**
   - Add `fetchProjectCount()` helper (lightweight API call)
   - Modify `autoDiscoverJiraProjects()` to fetch max 50 initially
   - Add import strategy prompt (before full fetch)

2. **`src/cli/helpers/issue-tracker/ado.ts`**
   - Same pattern as JIRA (consistency)

3. **`src/cli/helpers/issue-tracker/index.ts`**
   - Centralized pagination logic (shared by JIRA/ADO)

### Code Changes (Pseudocode)

```typescript
// src/cli/helpers/issue-tracker/jira.ts

async function fetchProjectCount(credentials: JiraCredentials): Promise<number> {
  const apiBase = credentials.instanceType === 'cloud'
    ? `https://${credentials.domain}/rest/api/3/project/search`
    : `https://${credentials.domain}/rest/api/2/project/search`;

  const response = await fetch(`${apiBase}?maxResults=0`, {
    headers: { 'Authorization': `Basic ${auth}` }
  });

  const data = await response.json();
  return data.total;  // Total count without fetching all projects
}

async function promptImportStrategy(projectCount: number): Promise<string> {
  if (projectCount <= 1) {
    return 'all';  // Auto-select single project
  }

  const { importStrategy } = await inquirer.prompt({
    type: 'list',
    name: 'importStrategy',
    message: `Found ${projectCount} accessible projects. How would you like to import?`,
    choices: [
      {
        name: `✨ Import all ${projectCount} projects (recommended)`,
        value: 'all',
        short: 'Import all'
      },
      {
        name: '📋 Select specific projects',
        value: 'specific',
        short: 'Select specific'
      },
      {
        name: '✏️ Enter project keys manually',
        value: 'manual',
        short: 'Manual entry'
      }
    ],
    default: 'all'  // CLI-first default
  });

  return importStrategy;
}

async function autoDiscoverJiraProjects(credentials: JiraCredentials): Promise<string[]> {
  // Step 1: Fetch count (fast)
  const projectCount = await fetchProjectCount(credentials);

  if (projectCount === 0) {
    console.log('⚠️ No accessible projects found.');
    return [];
  }

  // Step 2: Prompt strategy
  const strategy = await promptImportStrategy(projectCount);

  // Step 3: Route based on choice
  switch (strategy) {
    case 'all':
      return await fetchAllProjectsAsync(credentials, projectCount);
    case 'specific':
      return await selectSpecificProjects(credentials);
    case 'manual':
      return await promptManualProjectKeys();
  }
}

async function fetchAllProjectsAsync(
  credentials: JiraCredentials,
  totalCount: number
): Promise<string[]> {
  const spinner = ora(`Fetching projects... 0/${totalCount} (0%)`).start();

  try {
    // Fetch in batches of 50 (avoid timeout)
    const batchSize = 50;
    let allProjects: any[] = [];

    for (let offset = 0; offset < totalCount; offset += batchSize) {
      const batch = await fetchProjectBatch(credentials, offset, batchSize);
      allProjects = allProjects.concat(batch);

      const progress = ((offset + batch.length) / totalCount * 100).toFixed(0);
      spinner.text = `Fetching projects... ${offset + batch.length}/${totalCount} (${progress}%)`;
    }

    spinner.succeed(`Loaded ${allProjects.length} projects`);
    return allProjects.map(p => p.key);
  } catch (error) {
    spinner.fail('Failed to fetch all projects');
    throw error;
  }
}
```

## Test Cases

### TC-US1-01: 50-Project Limit (Unit Test)
```typescript
describe('Smart Pagination', () => {
  it('should fetch max 50 projects initially', async () => {
    // Mock API returns 200 projects
    const mockClient = createMockJiraClient(200);

    const count = await fetchProjectCount(mockClient.credentials);

    expect(count).toBe(200);  // Count is correct

    // But initial fetch loads only 50
    const initialBatch = await fetchInitialProjects(mockClient.credentials);
    expect(initialBatch.length).toBe(50);
  });
});
```

### TC-US1-02: Explicit Choice Prompt (E2E Test)
```typescript
test('should show import strategy prompt', async ({ page }) => {
  await page.goto('/');

  // Trigger init
  await page.getByRole('button', { name: 'Initialize' }).click();

  // Mock 127 projects
  await page.route('**/rest/api/3/project/search*', route => {
    route.fulfill({ json: { total: 127, values: [...] } });
  });

  // Verify prompt appears
  const prompt = page.getByText('Found 127 accessible projects');
  await expect(prompt).toBeVisible();

  // Verify 3 choices
  await expect(page.getByText('Import all 127 projects')).toBeVisible();
  await expect(page.getByText('Select specific projects')).toBeVisible();
  await expect(page.getByText('Enter project keys manually')).toBeVisible();
});
```

### TC-US1-03: Async Fetch Progress (Integration Test)
```typescript
test('should show progress during async fetch', async () => {
  const mockClient = createMockJiraClient(500);
  const progressUpdates: string[] = [];

  // Capture progress updates
  const originalLog = console.log;
  console.log = (msg: string) => {
    if (msg.includes('Fetching projects')) {
      progressUpdates.push(msg);
    }
  };

  await fetchAllProjectsAsync(mockClient.credentials, 500);

  console.log = originalLog;

  // Verify progress updates
  expect(progressUpdates.length).toBeGreaterThan(5);
  expect(progressUpdates[0]).toContain('0/500');
  expect(progressUpdates[progressUpdates.length - 1]).toContain('500/500');
});
```

### TC-US1-04: Init Performance < 30s (Performance Test)
```typescript
test('init should complete < 30 seconds for 100 projects', async () => {
  const startTime = Date.now();

  // Real JIRA API call (100 projects)
  const credentials = getRealJiraCredentials();
  await autoDiscoverJiraProjects(credentials);

  const duration = Date.now() - startTime;

  expect(duration).toBeLessThan(30000);  // < 30 seconds
});
```

## Dependencies

- **FS-047 US-007**: External Item Import on Init (foundation)
- **Existing**: `src/cli/helpers/issue-tracker/jira.ts` (auto-discovery)
- **Existing**: `plugins/specweave-jira/lib/project-selector.ts` (selection UI)

## Risks & Mitigations

### Risk: API Rate Limits
- **Problem**: Fetching 500 projects in batches may still hit limits
- **Mitigation**:
  - Respect `X-RateLimit-Remaining` header
  - Exponential backoff on 429 errors
  - Cache project count for 24 hours

### Risk: Network Failures
- **Problem**: Async fetch interrupted mid-batch
- **Mitigation**:
  - Save partial progress to `.specweave/cache/import-state.json`
  - Resume capability (US-005 handles this)

---

**Implementation Tasks**: See increment plan
**Related User Stories**: US-002 (CLI-First Defaults), US-004 (Smart Caching)
