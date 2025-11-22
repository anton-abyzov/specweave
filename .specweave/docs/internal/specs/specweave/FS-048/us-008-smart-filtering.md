---
id: US-008
feature: FS-048
title: "Smart Filtering (Active Projects, Custom JQL)"
status: proposed
priority: P2
created: 2025-11-21
---

# US-008: Smart Filtering (Active Projects, Custom JQL)

**GitHub Project**: https://github.com/anton-abyzov/specweave/issues/710

**Feature**: [FS-048 - Enhanced External Tool Import](../../../_features/FS-048/FEATURE.md)

## User Story

**As a** DevOps engineer with 500+ JIRA projects
**I want** to filter projects before importing (active only, by type, custom JQL)
**So that** I import only relevant projects and avoid noise

## Business Value

- **Noise Reduction**: Filter out archived, test, legacy projects (90% reduction typical)
- **Targeted Import**: Import only production projects (exclude staging, dev)
- **Compliance**: Exclude sensitive projects (e.g., HR, Finance) via custom JQL

## Acceptance Criteria

### AC-US8-01: Active Projects Filter
- **Priority**: P1
- **Testable**: Yes (integration test)
- **Description**: Filter out archived/deleted projects
- **Usage**: `/specweave-jira:import-projects --filter active`
- **Behavior**:
  - Fetch all projects from API
  - Filter by `status != Archived` and `isDeleted != true`
  - Preview: "Filters will load ~45 projects (down from 500)"
- **Validation**: Archived projects excluded from import

### AC-US8-02: Project Type Filter
- **Priority**: P2
- **Testable**: Yes (integration test)
- **Description**: Filter by project type (Agile, CMMI, SAFe, Software, Business)
- **Usage**: `/specweave-jira:import-projects --filter agile`
- **Behavior**:
  - Fetch all projects
  - Filter by `projectTypeKey == 'software'` (Agile)
  - Support multiple types: `--filter "agile,cmmi"`
- **Validation**: Only Agile-type projects imported

### AC-US8-03: Project Lead Filter
- **Priority**: P2
- **Testable**: Yes (integration test)
- **Description**: Filter by project lead (useful for team-specific imports)
- **Usage**: `/specweave-jira:import-projects --filter "lead:john.doe"`
- **Behavior**:
  - Fetch all projects
  - Filter by `lead.accountId == 'john.doe'`
  - Preview: "12 projects led by john.doe"
- **Validation**: Only projects led by specified user imported

### AC-US8-04: Custom JQL Filter (JIRA-Specific)
- **Priority**: P2
- **Testable**: Yes (integration test with JIRA API)
- **Description**: Advanced filtering via JIRA Query Language
- **Usage**: `/specweave-jira:import-projects --jql "project in (BACKEND, FRONTEND) AND status != Archived"`
- **Behavior**:
  - Use JIRA search API: `/rest/api/3/search?jql=...`
  - Parse response, extract project keys
  - Validate JQL syntax (show error if invalid)
- **Validation**: JQL query executed correctly, results filtered

### AC-US8-05: Filter Preview (Before Import)
- **Priority**: P1
- **Testable**: Yes (E2E test)
- **Description**: Show preview of what filters will load
- **Prompt**:
  ```
  Filters applied:
    - Active projects only
    - Project type: Agile

  Preview: 45 projects will be imported (down from 500)

  Continue with import? (Y/n)
  ```
- **Validation**: Preview accurate, user can cancel

### AC-US8-06: Saved Filter Presets
- **Priority**: P2
- **Testable**: Yes (integration test)
- **Description**: Save commonly-used filters for reuse
- **Usage**:
  ```
  /specweave-jira:import-projects --preset production
  ```
- **Preset Config** (`.specweave/config.json`):
  ```json
  {
    "jira": {
      "filterPresets": {
        "production": {
          "filter": "active",
          "type": "agile",
          "jql": "project NOT IN (TEST, SANDBOX, DEV)"
        },
        "my-teams": {
          "filter": "lead:john.doe"
        }
      }
    }
  }
  ```
- **Validation**: Presets work, custom presets can be defined

## Technical Implementation

### Filter Processor (New Module)

```typescript
// src/integrations/jira/filter-processor.ts (NEW)

export interface FilterOptions {
  /** Active projects only (exclude archived) */
  active?: boolean;

  /** Filter by project type (agile, cmmi, safe, software, business) */
  type?: string | string[];

  /** Filter by project lead (email or accountId) */
  lead?: string;

  /** Custom JQL query (advanced) */
  jql?: string;

  /** Preset name (from config) */
  preset?: string;
}

export class FilterProcessor {
  private client: JiraClient;
  private config: SpecWeaveConfig;

  constructor(client: JiraClient, config: SpecWeaveConfig) {
    this.client = client;
    this.config = config;
  }

  /**
   * Apply filters to project list
   */
  async applyFilters(projects: any[], options: FilterOptions): Promise<any[]> {
    let filtered = projects;

    // 1. Load preset if specified
    if (options.preset) {
      const preset = this.loadPreset(options.preset);
      options = { ...preset, ...options };  // Merge preset with CLI options
    }

    // 2. Filter active projects
    if (options.active) {
      filtered = this.filterActive(filtered);
    }

    // 3. Filter by project type
    if (options.type) {
      const types = Array.isArray(options.type) ? options.type : [options.type];
      filtered = this.filterByType(filtered, types);
    }

    // 4. Filter by project lead
    if (options.lead) {
      filtered = this.filterByLead(filtered, options.lead);
    }

    // 5. Apply custom JQL (overrides all other filters)
    if (options.jql) {
      filtered = await this.filterByJql(options.jql);
    }

    return filtered;
  }

  /**
   * Filter out archived/deleted projects
   */
  private filterActive(projects: any[]): any[] {
    return projects.filter(p =>
      !p.archived &&
      !p.isDeleted &&
      p.status !== 'archived'
    );
  }

  /**
   * Filter by project type
   */
  private filterByType(projects: any[], types: string[]): any[] {
    const normalizedTypes = types.map(t => t.toLowerCase());

    return projects.filter(p => {
      const projectType = (p.projectTypeKey || '').toLowerCase();
      return normalizedTypes.includes(projectType);
    });
  }

  /**
   * Filter by project lead
   */
  private filterByLead(projects: any[], leadIdentifier: string): any[] {
    return projects.filter(p => {
      const lead = p.lead;
      if (!lead) return false;

      // Match by email or accountId
      return lead.emailAddress === leadIdentifier ||
             lead.accountId === leadIdentifier ||
             lead.displayName === leadIdentifier;
    });
  }

  /**
   * Filter using custom JQL query
   */
  private async filterByJql(jql: string): Promise<any[]> {
    try {
      console.log(`🔍 Executing JQL: ${jql}\n`);

      const response = await this.client.searchIssues(jql);

      // Extract unique project keys from search results
      const projectKeys = new Set<string>();
      response.issues.forEach((issue: any) => {
        projectKeys.add(issue.fields.project.key);
      });

      console.log(`✅ JQL matched ${projectKeys.size} projects\n`);

      // Fetch full project details for matched keys
      const projects = await Promise.all(
        Array.from(projectKeys).map(key => this.client.getProject(key))
      );

      return projects;
    } catch (error: any) {
      console.error(`❌ Invalid JQL: ${error.message}`);
      throw new Error(`JQL syntax error: ${error.message}`);
    }
  }

  /**
   * Load filter preset from config
   */
  private loadPreset(presetName: string): FilterOptions {
    const presets = this.config.jira?.filterPresets || {};
    const preset = presets[presetName];

    if (!preset) {
      throw new Error(`Filter preset not found: ${presetName}`);
    }

    return preset;
  }

  /**
   * Show filter preview (before import)
   */
  async showPreview(projects: any[], options: FilterOptions): Promise<void> {
    const filteredCount = projects.length;
    const totalCount = filteredCount;  // Would need original count for accurate "down from"

    console.log(chalk.cyan('\n📋 Filter Preview:\n'));

    if (options.active) {
      console.log('   ✓ Active projects only');
    }

    if (options.type) {
      const types = Array.isArray(options.type) ? options.type.join(', ') : options.type;
      console.log(`   ✓ Project type: ${types}`);
    }

    if (options.lead) {
      console.log(`   ✓ Project lead: ${options.lead}`);
    }

    if (options.jql) {
      console.log(`   ✓ Custom JQL: ${options.jql}`);
    }

    console.log(`\n📊 ${filteredCount} projects will be imported\n`);
  }
}
```

## Test Cases

### TC-US8-01: Active Projects Filter (Integration Test)
```typescript
test('should filter archived projects', async () => {
  const processor = new FilterProcessor(mockClient, mockConfig);

  // Mock 100 projects (20 archived)
  const allProjects = createMockProjects(100, { archived: 20 });

  const filtered = await processor.applyFilters(allProjects, { active: true });

  expect(filtered.length).toBe(80);  // 100 - 20 archived
  expect(filtered.every(p => !p.archived)).toBe(true);
});
```

### TC-US8-02: Project Type Filter (Integration Test)
```typescript
test('should filter by project type', async () => {
  const processor = new FilterProcessor(mockClient, mockConfig);

  // Mock projects (50 Agile, 30 CMMI, 20 Business)
  const allProjects = createMockProjects(100, {
    types: { agile: 50, cmmi: 30, business: 20 }
  });

  const filtered = await processor.applyFilters(allProjects, { type: 'agile' });

  expect(filtered.length).toBe(50);
  expect(filtered.every(p => p.projectTypeKey === 'software')).toBe(true);
});
```

### TC-US8-03: Custom JQL Filter (Integration Test with JIRA API)
```typescript
test('should filter using custom JQL', async () => {
  const processor = new FilterProcessor(realJiraClient, mockConfig);

  const jql = 'project in (BACKEND, FRONTEND) AND status != Archived';

  const filtered = await processor.filterByJql(jql);

  expect(filtered.length).toBe(2);  // BACKEND, FRONTEND
  expect(filtered.map(p => p.key)).toEqual(['BACKEND', 'FRONTEND']);
});
```

### TC-US8-04: Filter Preview (E2E Test)
```typescript
test('should show filter preview before import', async ({ page }) => {
  await page.goto('/');
  await initializeJira(page);

  // Trigger import with filters
  await page.getByRole('button', { name: 'Import Projects' }).click();
  await page.getByLabel('Active projects only').check();

  // Verify preview shown
  const preview = page.getByText(/45 projects will be imported/);
  await expect(preview).toBeVisible();
});
```

### TC-US8-05: Saved Preset (Integration Test)
```typescript
test('should use saved filter preset', async () => {
  const config = {
    jira: {
      filterPresets: {
        production: { active: true, type: 'agile' }
      }
    }
  };

  const processor = new FilterProcessor(mockClient, config);
  const allProjects = createMockProjects(100);

  const filtered = await processor.applyFilters(allProjects, { preset: 'production' });

  expect(filtered.length).toBeLessThan(100);  // Filtered
});
```

## Dependencies

- **US-005**: Dedicated Import Commands (uses smart filtering)
- **Existing**: `src/integrations/jira/jira-client.ts` (JQL search API)

## Risks & Mitigations

### Risk: Complex JQL Queries (Performance)
- **Problem**: Complex JQL may be slow (100,000+ issues scanned)
- **Mitigation**:
  - Warn user if JQL looks expensive: `project in projectsWhereIssuesCreatedInLast1Year()`
  - Suggest alternative: "Consider using --filter active instead"
  - Add timeout (30 seconds max)

### Risk: Invalid JQL Syntax
- **Problem**: User provides malformed JQL → API error
- **Mitigation**:
  - Validate JQL syntax client-side (basic regex)
  - Show helpful error message: "Invalid JQL near 'project in ('"
  - Suggest correction: "Did you mean 'project in (BACKEND, FRONTEND)'?"

---

**Implementation Tasks**: See increment plan
**Related User Stories**: US-001 (Smart Pagination), US-005 (Import Commands)
