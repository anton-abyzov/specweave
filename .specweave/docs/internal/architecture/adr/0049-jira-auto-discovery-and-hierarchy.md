# ADR-0049: Jira Auto-Discovery and Universal Hierarchy Mapping

**Status**: Accepted
**Date**: 2025-11-20
**Deciders**: SpecWeave Core Team
**Priority**: P0 (Critical - Fixes broken Jira init flow)

---

## Context

Current Jira integration flow has several critical issues:

### Problems Identified

1. **Manual Project Key Entry** (`jira.ts:210`)
   - Users must manually type project keys (e.g., "FRONTEND,BACKEND,MOBILE")
   - Error-prone, typos cause validation failures
   - Jira API supports auto-discovery (why not use it?)

2. **Plugin Installation Messages** (`index.ts:774-778`)
   - Shows "✅ Jira plugin already installed" during init
   - Confusing: Plugins managed via marketplace, NOT init
   - Inconsistent with GitHub flow (no plugin messages)

3. **Redundant Setup Complete Message** (`jira.ts:446-451`)
   - Lists "/specweave-jira:sync" and "/specweave-jira:status" commands
   - Commands already documented in plugin skills
   - Adds visual noise, no value

4. **No Universal Hierarchy Mapping**
   - Missing SpecWeave → Jira hierarchy mapping
   - Doesn't detect Jira project type (Agile vs CMMI vs SAFe)
   - No multi-project coordination (like GitHub multi-repo)

---

## Decision

### Step 1: Remove Plugin Installation Messages

**File**: `src/cli/helpers/issue-tracker/index.ts`

**Remove lines 759-790**:
```typescript
// ❌ DELETE THIS:
async function installPlugin(tracker: IssueTracker, language: string): Promise<void> {
  const spinner = ora(`Installing ${getTrackerDisplayName(tracker)} plugin...`).start();
  // ... installation logic ...
}

// ❌ DELETE THIS CALL:
await installPlugin(tracker, language);
```

**Why**: Plugins are installed via marketplace (`/plugin install specweave-jira`), NOT during init.

---

### Step 2: Implement Auto-Discovery for Jira Projects

**File**: `src/cli/helpers/issue-tracker/jira.ts`

**Replace manual input (lines 206-224) with auto-discovery**:

```typescript
// ❌ OLD (MANUAL ENTRY):
questions.push({
  type: 'input',
  name: 'projects',
  message: 'Project keys (comma-separated, e.g., FRONTEND,BACKEND,MOBILE):',
  validate: (input: string) => { ... }
});

// ✅ NEW (AUTO-DISCOVERY):
async function autoDiscoverJiraProjects(credentials: JiraCredentials): Promise<string[]> {
  const spinner = ora('Fetching accessible Jira projects...').start();

  try {
    // Use JiraClient to fetch all projects
    const jiraClient = new JiraClient({
      domain: credentials.domain,
      email: credentials.email,
      token: credentials.token,
      instanceType: credentials.instanceType
    });

    const allProjects = await jiraClient.getProjects();
    spinner.succeed(`Found ${allProjects.length} accessible project(s)`);

    // Show multi-select checkbox (like GitHub repos)
    const { selectedProjects } = await inquirer.prompt([{
      type: 'checkbox',
      name: 'selectedProjects',
      message: 'Select Jira projects to sync:',
      choices: allProjects.map(p => ({
        name: `${p.key} - ${p.name}`,
        value: p.key,
        checked: false  // User must explicitly select
      })),
      validate: (input: string[]) => {
        if (input.length === 0) {
          return 'Please select at least one project';
        }
        return true;
      }
    }]);

    return selectedProjects;
  } catch (error: any) {
    spinner.fail('Failed to fetch projects');
    throw error;
  }
}
```

**Flow**:
1. User enters credentials (domain, email, token)
2. Validate connection (test API)
3. **Auto-fetch all accessible projects via API** ✅
4. Show multi-select checkbox menu ✅
5. User selects projects (no typing!) ✅
6. Save to .env with project IDs ✅

---

### Step 3: Implement Universal Hierarchy Mapping

**File**: `src/integrations/jira/jira-hierarchy-mapper.ts` (NEW)

```typescript
/**
 * Maps SpecWeave universal hierarchy to Jira issue types
 *
 * Supports:
 * - Jira Agile: Initiative → Epic → Story → Sub-task
 * - Jira CMMI: Epic → Feature → Requirement → Task
 * - Jira SAFe: Strategic Theme → Capability → User Story → Task
 */

export interface JiraHierarchyMapping {
  epic: string;       // Initiative | Theme | Epic
  feature: string;    // Epic | Capability | Feature
  userStory: string;  // Story | User Story | Requirement
  task: string;       // Sub-task | Task
}

export class JiraHierarchyMapper {
  /**
   * Detect Jira project type based on available issue types
   *
   * @param projectKey - Jira project key
   * @returns Detected hierarchy mapping
   */
  async detectProjectType(projectKey: string): Promise<JiraHierarchyMapping> {
    const jiraClient = this.getJiraClient();

    // Fetch issue types for project
    const issueTypes = await jiraClient.getIssueTypes(projectKey);
    const typeNames = issueTypes.map(t => t.name.toLowerCase());

    // Detect SAFe (has "Capability" or "Strategic Theme")
    if (typeNames.includes('capability') || typeNames.includes('strategic theme')) {
      console.log(chalk.cyan(`Detected Jira SAFe project: ${projectKey}`));
      return {
        epic: 'Strategic Theme',
        feature: 'Capability',
        userStory: 'User Story',
        task: 'Task'
      };
    }

    // Detect CMMI (has "Requirement")
    if (typeNames.includes('requirement')) {
      console.log(chalk.cyan(`Detected Jira CMMI project: ${projectKey}`));
      return {
        epic: 'Epic',
        feature: 'Feature',
        userStory: 'Requirement',
        task: 'Task'
      };
    }

    // Default: Agile (has "Story" and "Sub-task")
    console.log(chalk.cyan(`Detected Jira Agile project: ${projectKey}`));
    return {
      epic: 'Initiative',
      feature: 'Epic',
      userStory: 'Story',
      task: 'Sub-task'
    };
  }

  /**
   * Map SpecWeave work item to Jira issue type
   *
   * @param level - SpecWeave hierarchy level
   * @param mapping - Jira hierarchy mapping
   * @returns Jira issue type name
   */
  mapToJiraIssueType(
    level: 'epic' | 'feature' | 'userStory' | 'task',
    mapping: JiraHierarchyMapping
  ): string {
    return mapping[level];
  }

  /**
   * Create SpecWeave Epic in Jira
   *
   * @param epic - SpecWeave epic metadata
   * @param projectKey - Jira project key
   * @returns Created Jira issue key
   */
  async syncEpicToJira(epic: SpecWeaveEpic, projectKey: string): Promise<string> {
    const mapping = await this.detectProjectType(projectKey);
    const jiraIssueType = this.mapToJiraIssueType('epic', mapping);

    // Create Initiative/Theme/Epic in Jira
    const issue = await this.jiraClient.createIssue({
      projectKey,
      issueType: jiraIssueType,
      summary: epic.title,
      description: epic.description,
      customFields: {
        // Add SpecWeave metadata
        'customfield_10001': `EPIC-${epic.id}`
      }
    });

    return issue.key;
  }

  /**
   * Create SpecWeave Feature in Jira
   *
   * @param feature - SpecWeave feature metadata
   * @param projectKey - Jira project key
   * @param epicKey - Parent epic key (optional)
   * @returns Created Jira issue key
   */
  async syncFeatureToJira(
    feature: SpecWeaveFeature,
    projectKey: string,
    epicKey?: string
  ): Promise<string> {
    const mapping = await this.detectProjectType(projectKey);
    const jiraIssueType = this.mapToJiraIssueType('feature', mapping);

    // Create Epic/Capability/Feature in Jira
    const issue = await this.jiraClient.createIssue({
      projectKey,
      issueType: jiraIssueType,
      summary: feature.title,
      description: feature.description,
      epicLink: epicKey,  // Link to parent epic (if exists)
      customFields: {
        'customfield_10002': `FS-${feature.id}`
      }
    });

    return issue.key;
  }

  /**
   * Create SpecWeave User Story in Jira
   *
   * @param userStory - SpecWeave user story metadata
   * @param projectKey - Jira project key
   * @param featureKey - Parent feature key (optional)
   * @returns Created Jira issue key
   */
  async syncUserStoryToJira(
    userStory: SpecWeaveUserStory,
    projectKey: string,
    featureKey?: string
  ): Promise<string> {
    const mapping = await this.detectProjectType(projectKey);
    const jiraIssueType = this.mapToJiraIssueType('userStory', mapping);

    // Create Story/User Story/Requirement in Jira
    const issue = await this.jiraClient.createIssue({
      projectKey,
      issueType: jiraIssueType,
      summary: userStory.title,
      description: userStory.description,
      epicLink: featureKey,  // Link to parent feature
      acceptanceCriteria: userStory.acceptanceCriteria,
      customFields: {
        'customfield_10003': `US-${userStory.id}`
      }
    });

    return issue.key;
  }
}
```

---

### Step 4: Multi-Project Strategy Detection

**File**: `src/cli/helpers/issue-tracker/jira.ts`

```typescript
/**
 * Detect Jira strategy based on selected projects
 *
 * Strategies:
 * 1. Single Project: 1 Jira project selected
 * 2. Multi-Project (Project-per-team): Multiple Jira projects
 * 3. Component-based: 1 project, multiple components
 * 4. Board-based: 1 project, multiple boards
 *
 * @param selectedProjects - Array of selected Jira project keys
 * @returns Detected strategy
 */
async function detectJiraStrategy(selectedProjects: string[]): Promise<JiraStrategy> {
  // Check SpecWeave project structure
  const specweaveProjects = await detectSpecWeaveProjects();
  const specweaveProjectCount = specweaveProjects.length;

  console.log(chalk.cyan(`\n📊 Detected ${specweaveProjectCount} SpecWeave project(s)`));
  console.log(chalk.gray(`   Projects: ${specweaveProjects.map(p => p.name).join(', ')}\n`));

  // Case 1: Single Jira project
  if (selectedProjects.length === 1) {
    if (specweaveProjectCount <= 1) {
      return 'single-project';  // Simple case
    }

    // Multiple SpecWeave projects → 1 Jira project
    // Ask user: Component-based or Board-based?
    const { strategy } = await inquirer.prompt([{
      type: 'list',
      name: 'strategy',
      message: 'How to organize multiple SpecWeave projects in one Jira project?',
      choices: [
        {
          name: 'Component-based (use Jira Components)',
          value: 'component-based'
        },
        {
          name: 'Board-based (use separate Boards)',
          value: 'board-based'
        }
      ]
    }]);
    return strategy;
  }

  // Case 2: Multiple Jira projects
  // Perfect match → Project-per-team
  if (selectedProjects.length === specweaveProjectCount) {
    console.log(chalk.green('✅ Perfect match: Project-per-team strategy'));
    return 'project-per-team';
  }

  // Mismatch → Ask user
  const { strategy } = await inquirer.prompt([{
    type: 'list',
    name: 'strategy',
    message: `${selectedProjects.length} Jira projects, ${specweaveProjectCount} SpecWeave projects. How to map?`,
    choices: [
      {
        name: 'Project-per-team (manual mapping)',
        value: 'project-per-team'
      },
      {
        name: 'Component-based',
        value: 'component-based'
      }
    ]
  }]);
  return strategy;
}

/**
 * Map SpecWeave projects to Jira projects
 *
 * Example:
 * - SpecWeave: backend/ → Jira: BACKEND
 * - SpecWeave: frontend/ → Jira: FRONTEND
 * - SpecWeave: mobile/ → Jira: MOBILE
 *
 * @param selectedProjects - Selected Jira project keys
 * @returns Project mapping
 */
async function mapProjectsToJira(selectedProjects: string[]): Promise<ProjectMapping[]> {
  const specweaveProjects = await detectSpecWeaveProjects();
  const mappings: ProjectMapping[] = [];

  for (const sp of specweaveProjects) {
    // Suggest intelligent mapping based on naming
    const suggestion = selectedProjects.find(jp =>
      jp.toLowerCase() === sp.name.toLowerCase() ||
      jp.toLowerCase().includes(sp.name.toLowerCase()) ||
      sp.name.toLowerCase().includes(jp.toLowerCase())
    ) || selectedProjects[0];

    // Prompt user to confirm or change
    const { jiraProject } = await inquirer.prompt([{
      type: 'list',
      name: 'jiraProject',
      message: `Map SpecWeave project "${sp.name}" to Jira project:`,
      choices: selectedProjects.map(p => ({ name: p, value: p })),
      default: suggestion
    }]);

    mappings.push({
      specweaveProject: sp.name,
      jiraProject,
      path: sp.path
    });
  }

  return mappings;
}
```

---

### Step 5: Simplified Setup Complete Message

**File**: `src/cli/helpers/issue-tracker/jira.ts`

```typescript
// ❌ OLD (LINES 446-451):
export function showJiraSetupComplete(language: SupportedLanguage): void {
  console.log(chalk.green.bold('\n✅ Jira integration complete!\n'));
  console.log(chalk.white('Available commands:'));
  console.log(chalk.gray('  /specweave-jira:sync'));
  console.log(chalk.gray('  /specweave-jira:status\n'));
  console.log(chalk.cyan('💡 Tip: Use /specweave:increment "feature" to create an increment'));
  console.log(chalk.gray('   It will automatically sync to Jira Issues!\n'));
}

// ✅ NEW (MINIMAL MESSAGE):
export function showJiraSetupComplete(
  credentials: JiraCredentials,
  mapping: ProjectMapping[]
): void {
  console.log(chalk.green.bold('\n✅ Jira integration configured!\n'));

  // Show what was configured
  console.log(chalk.gray('Credentials saved to .env (gitignored)'));
  console.log(chalk.gray(`Strategy: ${credentials.strategy}`));
  console.log(chalk.gray(`Projects: ${credentials.projects?.join(', ')}\n`));

  // Show project mapping (if multi-project)
  if (mapping.length > 1) {
    console.log(chalk.cyan('📋 Project Mapping:\n'));
    for (const m of mapping) {
      console.log(chalk.gray(`   ${m.specweaveProject} → Jira ${m.jiraProject}`));
    }
    console.log('');
  }

  // Minimal tip (no command list!)
  console.log(chalk.cyan('💡 Tip: Run /specweave:increment "feature" to create an increment'));
  console.log(chalk.gray('   It will automatically sync to Jira!\n'));
}
```

---

## Updated Flow

### Before (Manual, Confusing)

```
1. User manually types: "FRONTEND,BACKEND,MOBILE"
2. Validation checks if projects exist
3. Shows "✅ Jira plugin already installed"
4. Shows "Available commands: /specweave-jira:sync, /specweave-jira:status"
```

### After (Auto-Discovery, Clean)

```
1. Credentials entered (domain, email, token)
2. ⚙️  Fetching accessible Jira projects... (API call)
3. ✓ Found 15 accessible project(s)
4. Multi-select checkbox:
   ◉ FRONTEND - Frontend Team
   ◯ BACKEND - Backend Services
   ◉ MOBILE - Mobile Apps
   ◯ INFRA - Infrastructure
5. Detect strategy: project-per-team
6. Map projects:
   backend/ → Jira BACKEND
   frontend/ → Jira FRONTEND
7. ✅ Jira integration configured!
   Strategy: project-per-team
   Projects: BACKEND, FRONTEND
```

---

## Consequences

### Positive

1. **No Manual Typing**: Auto-discover projects via API ✅
2. **Consistent UX**: Same flow as GitHub (multi-select checkbox) ✅
3. **No Plugin Messages**: Clean, minimal output ✅
4. **Universal Mapping**: SpecWeave → Jira hierarchy (Agile/CMMI/SAFe) ✅
5. **Multi-Project Support**: Like GitHub multi-repo ✅
6. **Intelligent Suggestions**: Auto-suggest project mappings ✅

### Negative

1. **API Dependency**: Requires working Jira API connection
2. **More Code**: Hierarchy mapping adds complexity

### Neutral

1. **Breaking Change**: Users must re-run init (but better UX!)

---

## Success Criteria

1. ✅ **No manual typing**: Projects selected via checkbox
2. ✅ **No plugin messages**: Clean output, no "already installed"
3. ✅ **Auto-discovery**: Fetch all accessible projects via API
4. ✅ **Strategy detection**: Single/multi-project auto-detected
5. ✅ **Hierarchy mapping**: Agile/CMMI/SAFe types detected
6. ✅ **Project mapping**: SpecWeave → Jira projects mapped correctly

---

## References

- **ADR-0032**: Universal Hierarchy Mapping
- **ADR-0048**: Repository Provider Architecture
- **Jira API**: https://developer.atlassian.com/cloud/jira/platform/rest/v3/

---

**Decision Date**: 2025-11-20
**Review Date**: 2025-12-01 (after implementation)
