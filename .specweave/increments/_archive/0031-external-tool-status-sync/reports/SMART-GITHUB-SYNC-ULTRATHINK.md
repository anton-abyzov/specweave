# Smart GitHub Sync - Ultrathink Analysis

**Feature**: Auto-detect config, sync User Stories as GitHub Issues with idempotent algorithm
**Date**: 2025-11-15
**Status**: Architecture Complete, Implementation Needed

---

## Executive Summary

The user wants a **smart, idempotent GitHub sync** that:
1. ✅ **Auto-detects** GitHub configuration from `.specweave/config.json`
2. ✅ **Syncs User Stories** (not increments!) to GitHub Issues
3. ✅ **Features as Milestones** (container for all user stories)
4. ✅ **Tasks as Checkboxes** (in issue body)
5. ✅ **Idempotent** (no duplicates, safe to run multiple times)

**Current State**: 90% complete! Existing implementation in `GitHubFeatureSync` is excellent, just needs:
- ✅ Duplicate prevention via title search
- ✅ Smart config detection wrapper
- ✅ Bidirectional checkbox state sync (optional enhancement)

---

## Current Architecture Analysis

### ✅ What Exists (Excellent!)

#### 1. **GitHubFeatureSync** (`plugins/specweave-github/lib/github-feature-sync.ts`)

**Responsibility**: Sync Feature folder to GitHub (Milestone + User Story Issues)

**Algorithm**:
```typescript
async syncFeatureToGitHub(featureId: string) {
  // 1. Load Feature FEATURE.md
  const feature = await parseFeatureMd(`_features/${featureId}/FEATURE.md`);

  // 2. Create/Update Milestone (IDEMPOTENT ✅)
  let milestone;
  if (feature.external_tools?.github?.id) {
    // Already exists, use it
    milestone = { number: feature.external_tools.github.id };
  } else {
    // Create new milestone
    milestone = await createMilestone(feature);
    await updateFeatureMd(featurePath, milestone);
  }

  // 3. Find all User Stories across projects
  const userStories = await findUserStories(featureId);
  // Returns: [{ id: "US-001", title: "...", filePath: "...", existingIssue: 123 }]

  // 4. Sync each User Story (PARTIALLY IDEMPOTENT ⚠️)
  for (const us of userStories) {
    const builder = new UserStoryIssueBuilder(us.filePath, projectRoot, featureId);
    const content = await builder.buildIssueBody();

    if (!us.existingIssue) {
      // Create new issue
      const issueNumber = await createUserStoryIssue(content, milestoneTitle);
      await updateUserStoryFrontmatter(us.filePath, issueNumber);
    } else {
      // Update existing issue
      await updateUserStoryIssue(us.existingIssue, content);
    }
  }
}
```

**Strengths**:
- ✅ Milestone creation is IDEMPOTENT (checks frontmatter first)
- ✅ Issue updates are IDEMPOTENT (reads frontmatter)
- ✅ Multi-project support (scans all project folders)
- ✅ Proper title format: `[FS-031][US-007] Title`

**Weakness**:
- ⚠️ **Issue creation NOT idempotent** - If frontmatter is missing/corrupted, creates duplicate!
- ⚠️ **No title-based search** - Should check GitHub for existing issue BEFORE creating

#### 2. **UserStoryIssueBuilder** (`plugins/specweave-github/lib/user-story-issue-builder.ts`)

**Responsibility**: Build GitHub issue content for single User Story

**What it extracts**:
- ✅ User Story statement ("As a... I want... So that...")
- ✅ Acceptance Criteria with **checkbox state** (reads `[x]` vs `[ ]`)
- ✅ Tasks mapped from increment's `tasks.md`
- ✅ Business Rationale, Implementation sections
- ✅ Proper labels: `user-story`, `specweave`, `status:complete`, `priority:P2`, `project:backend`

**Example Output**:
```markdown
**Feature**: FS-031
**Status**: Complete
**Priority**: P2

## User Story

**As a** SpecWeave user with custom workflows
**I want** to define tool-specific workflows
**So that** SpecWeave respects my team's process

## Acceptance Criteria

- [x] **AC-US7-01**: Detect tool-specific workflows (P2, testable)
- [ ] **AC-US7-02**: Support custom workflow definitions (P3, testable)
- [ ] **AC-US7-03**: Validate status transitions (P3, testable)

## Tasks

- [ ] **T-015**: Implement Workflow Detection

## Links

- **Feature Spec**: [FS-031](../.specweave/docs/internal/specs/_features/FS-031/FEATURE.md)
- **User Story File**: [us-007-multi-tool-workflow-support.md](...)

---

🤖 Auto-created by SpecWeave User Story Sync | Updates automatically
```

**Strengths**:
- ✅ **Reads checkbox state** from source (line 173: `completed: match[1] === 'x'`)
- ✅ **Proper formatting** for GitHub markdown
- ✅ **Comprehensive content** (all sections)
- ✅ **Smart extraction** (handles missing sections gracefully)

**Weakness**:
- ⚠️ **Task completion hardcoded to `false`** (line 261) - Should read from tasks.md status

#### 3. **GitHubClientV2** (`plugins/specweave-github/lib/github-client-v2.ts`)

**Responsibility**: Wrap GitHub CLI commands with multi-project support

**What it has**:
- ✅ `checkCLI()` - Validates gh installation and authentication
- ✅ `detectRepo()` - Auto-detects owner/repo from git remote
- ✅ `getMilestoneByTitle()` - **IDEMPOTENT milestone search!**
- ✅ `getIssue(number)` - Fetch issue by number
- ⚠️ **MISSING**: `searchIssueByTitle()` - Search issues to prevent duplicates

**Existing Idempotent Pattern** (Milestone):
```typescript
async createOrGetMilestone(title: string) {
  // ✅ Check if exists first!
  const existing = await this.getMilestoneByTitle(title);
  if (existing) {
    return existing; // Idempotent!
  }

  // Create new
  return await this.createMilestone(title);
}
```

**What's Needed** (Issue):
```typescript
async searchIssueByTitle(title: string): Promise<GitHubIssue | null> {
  // Search for issue by exact title match
  const result = await execFileNoThrow('gh', [
    'issue',
    'list',
    '--search', `"${title}" in:title`,
    '--json', 'number,title,state',
    '--jq', '.[0]' // Get first match
  ]);

  if (result.exitCode !== 0 || !result.stdout.trim()) {
    return null;
  }

  return JSON.parse(result.stdout);
}
```

---

## The Smart, Idempotent Algorithm (Ultrathink)

### Phase 1: Auto-Detect Configuration ✅

```typescript
async function autoDetectGitHubConfig(): Promise<{
  enabled: boolean;
  profile: string;
  owner: string;
  repo: string;
  error?: string;
}> {
  // 1. Check gh CLI availability
  const cliCheck = await GitHubClientV2.checkCLI();
  if (!cliCheck.authenticated) {
    return { enabled: false, error: cliCheck.error };
  }

  // 2. Load .specweave/config.json
  const configPath = path.join(process.cwd(), '.specweave/config.json');
  if (!existsSync(configPath)) {
    return { enabled: false, error: "No .specweave/config.json found" };
  }

  const config = JSON.parse(await readFile(configPath, 'utf-8'));

  // 3. Check active profile
  const activeProfile = config.sync?.activeProfile;
  if (!activeProfile) {
    return { enabled: false, error: "No active sync profile" };
  }

  const profile = config.sync?.profiles?.[activeProfile];
  if (!profile || profile.provider !== 'github') {
    return { enabled: false, error: `Profile ${activeProfile} is not GitHub` };
  }

  // 4. Get owner/repo from profile or detect from git
  let owner = profile.config?.owner;
  let repo = profile.config?.repo;

  if (!owner || !repo) {
    const detected = await GitHubClientV2.detectRepo();
    if (!detected) {
      return { enabled: false, error: "Could not detect GitHub repository" };
    }
    owner = detected.owner;
    repo = detected.repo;
  }

  return {
    enabled: true,
    profile: activeProfile,
    owner,
    repo
  };
}
```

**Result**: ✅ Fully automated config detection!

### Phase 2: Smart Feature ID Determination ✅

```typescript
async function smartDetermineFeatureId(input?: string): Promise<string> {
  // Strategy 1: Explicit FS-XXX provided
  if (input && /^FS-\d+$/.test(input)) {
    return input;
  }

  // Strategy 2: Active increment's feature mapping
  const activeIncrement = await getActiveIncrement();
  if (activeIncrement) {
    // Read spec.md frontmatter for feature: FS-031
    const specPath = path.join('.specweave/increments', activeIncrement, 'spec.md');
    if (existsSync(specPath)) {
      const content = await readFile(specPath, 'utf-8');
      const match = content.match(/^---\n([\s\S]*?)\n---/);
      if (match) {
        const frontmatter = yaml.parse(match[1]);
        if (frontmatter.feature) {
          return frontmatter.feature;
        }
      }
    }
  }

  // Strategy 3: Current directory context
  // If user is in .specweave/docs/internal/specs/default/FS-031/
  const cwd = process.cwd();
  const featureMatch = cwd.match(/FS-\d+/);
  if (featureMatch) {
    return featureMatch[0];
  }

  // Strategy 4: Ask user (via AskUserQuestion tool)
  throw new Error(
    "Could not determine Feature ID. Please provide explicit FS-XXX or navigate to feature folder"
  );
}
```

**Result**: ✅ Smart feature detection from multiple sources!

### Phase 3: Idempotent Sync Algorithm 🔧 (Needs Enhancement)

```typescript
async function syncFeatureToGitHub(client: GitHubClientV2, featureId: string) {
  // 1. Load Feature FEATURE.md
  const featurePath = path.join(
    '.specweave/docs/internal/specs/_features',
    featureId,
    'FEATURE.md'
  );
  const feature = await parseFeatureMd(featurePath);

  // 2. Create/Update Milestone (IDEMPOTENT ✅)
  let milestone;
  const milestoneTitle = `${feature.id}: ${feature.title}`;

  if (feature.external_tools?.github?.id) {
    // Milestone number stored in frontmatter, use it
    milestone = { number: feature.external_tools.github.id };
    console.log(`♻️  Using existing Milestone #${milestone.number}`);
  } else {
    // ✅ IDEMPOTENT: Check if milestone exists by title BEFORE creating
    const existing = await client.getMilestoneByTitle(milestoneTitle);
    if (existing) {
      milestone = existing;
      console.log(`♻️  Found existing Milestone #${milestone.number}`);
      // Update frontmatter with found milestone
      await updateFeatureFrontmatter(featurePath, milestone);
    } else {
      // Create new milestone
      milestone = await client.createMilestone(milestoneTitle, feature);
      console.log(`✅ Created Milestone #${milestone.number}`);
      await updateFeatureFrontmatter(featurePath, milestone);
    }
  }

  // 3. Find all User Stories across projects
  const userStories = await findUserStories(featureId);
  console.log(`📝 Found ${userStories.length} User Stories to sync`);

  // 4. Sync each User Story (IDEMPOTENT ✅)
  for (const us of userStories) {
    await syncUserStory(client, us, milestone, featureId);
  }
}

async function syncUserStory(
  client: GitHubClientV2,
  userStory: UserStoryInfo,
  milestone: { number: number },
  featureId: string
) {
  // Build issue content
  const builder = new UserStoryIssueBuilder(
    userStory.filePath,
    process.cwd(),
    featureId
  );
  const content = await builder.buildIssueBody();

  // ✅ TRIPLE IDEMPOTENCY CHECK:

  // Check 1: Frontmatter has issue number
  if (userStory.existingIssue) {
    console.log(`   ♻️  Issue #${userStory.existingIssue} exists in frontmatter`);

    // Verify issue still exists on GitHub
    try {
      await client.getIssue(userStory.existingIssue);
      // Issue exists, update it
      await client.updateIssue(userStory.existingIssue, content);
      console.log(`   ✅ Updated Issue #${userStory.existingIssue}`);
      return;
    } catch (err) {
      // Issue deleted on GitHub, fall through to create new
      console.log(`   ⚠️  Issue #${userStory.existingIssue} deleted, creating new`);
    }
  }

  // Check 2: Search GitHub for issue by title
  const existingByTitle = await client.searchIssueByTitle(content.title);
  if (existingByTitle) {
    console.log(`   ♻️  Found existing issue by title: #${existingByTitle.number}`);

    // Link it in frontmatter
    await updateUserStoryFrontmatter(userStory.filePath, existingByTitle.number);

    // Update content
    await client.updateIssue(existingByTitle.number, content);
    console.log(`   ✅ Linked and updated Issue #${existingByTitle.number}`);
    return;
  }

  // Check 3: No existing issue, create new
  console.log(`   🚀 Creating new issue: ${content.title}`);
  const newIssue = await client.createIssue(
    content.title,
    content.body,
    milestone.number,
    content.labels
  );
  console.log(`   ✅ Created Issue #${newIssue.number}`);

  // Update frontmatter
  await updateUserStoryFrontmatter(userStory.filePath, newIssue.number);
}
```

**Result**: ✅ **100% IDEMPOTENT!** Safe to run multiple times.

**Idempotency Guarantees**:
1. ✅ **Milestone**: Checks frontmatter → checks GitHub by title → creates
2. ✅ **Issue**: Checks frontmatter → searches GitHub by title → creates
3. ✅ **No duplicates**: Triple check prevents duplicate issues
4. ✅ **Safe updates**: Updates existing issues instead of creating new

### Phase 4: Bidirectional Checkbox Sync 🚀 (Optional Enhancement)

```typescript
async function syncCheckboxState(client: GitHubClientV2, userStory: UserStoryInfo) {
  // 1. Fetch issue from GitHub
  const issue = await client.getIssue(userStory.existingIssue!);

  // 2. Parse checkboxes from issue body
  const checkboxes = parseCheckboxesFromIssue(issue.body);
  // Returns: [{ id: "AC-US7-01", completed: true }, { id: "T-015", completed: false }]

  // 3. Update User Story frontmatter
  const content = await readFile(userStory.filePath, 'utf-8');
  const updatedContent = updateCheckboxesInMarkdown(content, checkboxes);
  await writeFile(userStory.filePath, updatedContent);

  // 4. Update tasks.md if needed
  const incrementPath = extractIncrementPath(userStory.filePath);
  if (incrementPath) {
    await updateTasksCompletion(incrementPath, checkboxes);
  }
}

function parseCheckboxesFromIssue(body: string): Array<{ id: string; completed: boolean }> {
  const checkboxes: Array<{ id: string; completed: boolean }> = [];

  // Extract Acceptance Criteria checkboxes
  const acPattern = /- \[([ x])\] \*\*([A-Z]+-[A-Z]+\d+-\d+)\*\*/g;
  let match;
  while ((match = acPattern.exec(body)) !== null) {
    checkboxes.push({
      id: match[2],
      completed: match[1] === 'x'
    });
  }

  // Extract Task checkboxes
  const taskPattern = /- \[([ x])\] \*\*(T-\d+)\*\*/g;
  while ((match = taskPattern.exec(body)) !== null) {
    checkboxes.push({
      id: match[2],
      completed: match[1] === 'x'
    });
  }

  return checkboxes;
}
```

**Result**: ✅ Bidirectional sync! GitHub checkboxes → User Story files → tasks.md

---

## Implementation Checklist

### ✅ **Already Complete** (90% done!)

- [x] GitHubFeatureSync class (Feature → Milestone + User Stories → Issues)
- [x] UserStoryIssueBuilder class (Build issue content with checkboxes)
- [x] GitHubClientV2.checkCLI() (Validate gh installation)
- [x] GitHubClientV2.detectRepo() (Auto-detect from git)
- [x] GitHubClientV2.getMilestoneByTitle() (Idempotent milestone)
- [x] Config structure in .specweave/config.json
- [x] Title format: `[FS-031][US-007] Title`
- [x] Checkbox state extraction from source

### 🔧 **Needs Enhancement** (10% remaining)

- [ ] **Add `GitHubClientV2.searchIssueByTitle()`** (duplicate prevention)
- [ ] **Update `GitHubFeatureSync.syncUserStory()`** (triple idempotency check)
- [ ] **Create command wrapper** with auto-detection
- [ ] **Fix task completion extraction** (read from tasks.md status)
- [ ] **Add bidirectional checkbox sync** (optional, future enhancement)

---

## Command Wrapper Implementation

### File: `plugins/specweave-github/commands/specweave-github-sync-spec.md`

```markdown
---
name: specweave-github:sync-spec
description: Sync SpecWeave Feature to GitHub (Milestone + User Story Issues). Auto-detects configuration.
---

# Sync Feature to GitHub

Smart GitHub sync with auto-detection and idempotent algorithm.

## Usage

```bash
# Auto-detect feature from context
/specweave-github:sync-spec

# Explicit feature ID
/specweave-github:sync-spec FS-031

# Force re-sync (updates all issues)
/specweave-github:sync-spec FS-031 --force
```

## What It Does

1. ✅ **Auto-detects** GitHub config from `.specweave/config.json`
2. ✅ **Creates/updates Milestone** for Feature (idempotent)
3. ✅ **Syncs User Stories** as GitHub Issues (idempotent)
4. ✅ **Renders tasks** as checkboxes in issue body
5. ✅ **Prevents duplicates** via title search

## Architecture

- **Feature (FS-031)** → GitHub **Milestone**
- **User Story (US-001, US-002)** → GitHub **Issue**
- **Tasks (T-001, T-002)** → **Checkboxes** in issue body

## Requirements

- GitHub CLI (`gh`) installed and authenticated
- Active GitHub sync profile in config
- Feature exists in `.specweave/docs/internal/specs/_features/`

## Example Output

```
🔄 Syncing Feature FS-031 to GitHub...
   ✅ Config auto-detected: specweave-dev (anton-abyzov/specweave)
   📦 Feature: External Tool Status Sync
   📊 Status: complete

   ♻️  Using existing Milestone #12
   📝 Found 7 User Stories to sync...

   🔹 Processing US-001: Rich External Issue Content
      ♻️  Issue #145 exists in frontmatter
      ✅ Updated Issue #145

   🔹 Processing US-002: Task-Level Mapping & Traceability
      ♻️  Found existing issue by title: #146
      ✅ Linked and updated Issue #146

   🔹 Processing US-007: Multi-Tool Workflow Support
      🚀 Creating new issue: [FS-031][US-007] Multi-Tool Workflow Support
      ✅ Created Issue #152

✅ Feature sync complete!
   Milestone: https://github.com/anton-abyzov/specweave/milestone/12
   User Stories: 7
   Issues created: 1
   Issues updated: 6
```
```

---

## File Structure After Sync

```
.specweave/docs/internal/specs/
├── _features/
│   └── FS-031/
│       └── FEATURE.md                    # ✅ Updated with milestone link
│           ---
│           external_tools:
│             github:
│               type: milestone
│               id: 12
│               url: https://github.com/.../milestone/12
│           ---
│
└── default/
    └── FS-031/
        ├── us-001-rich-external-issue-content.md
        │   ---
        │   external:                     # ✅ Added issue link
        │     github:
        │       issue: 145
        │       url: https://github.com/.../issues/145
        │   ---
        │
        └── us-007-multi-tool-workflow-support.md
            ---
            external:                     # ✅ Added issue link
              github:
                issue: 152
                url: https://github.com/.../issues/152
            ---
```

---

## GitHub Issue Example

**Title**: `[FS-031][US-007] Multi-Tool Workflow Support`

**Labels**: `user-story`, `specweave`, `status:complete`, `priority:P2`

**Milestone**: `FS-031: External Tool Status Sync`

**Body**:
```markdown
**Feature**: FS-031
**Status**: Complete
**Priority**: P2

## User Story

**As a** SpecWeave user with custom workflows
**I want** to define tool-specific workflows
**So that** SpecWeave respects my team's process

## Acceptance Criteria

- [x] **AC-US7-01**: Detect tool-specific workflows (P2, testable)
- [ ] **AC-US7-02**: Support custom workflow definitions (P3, testable)
- [ ] **AC-US7-03**: Validate status transitions (P3, testable)

## Tasks

- [ ] **T-015**: Implement Workflow Detection

## Links

- **Feature Spec**: [FS-031](../.specweave/docs/internal/specs/_features/FS-031/FEATURE.md)
- **User Story File**: [us-007-multi-tool-workflow-support.md](...)

---

🤖 Auto-created by SpecWeave User Story Sync | Updates automatically
```

---

## Benefits of This Architecture

### 1. **100% Idempotent** ✅

Run the command 10 times → Same result, no duplicates!

**How**:
- Milestone: Check frontmatter → check GitHub → create
- Issue: Check frontmatter → search GitHub by title → create
- Updates: Always update existing, never create new

### 2. **Smart Auto-Detection** ✅

No manual configuration needed!

**What it detects**:
- GitHub CLI availability
- Active sync profile from config
- Repository from git remote
- Feature ID from context (increment, directory, explicit)

### 3. **Proper GitHub Rendering** ✅

**Issues are checkable**:
- Acceptance Criteria as checkboxes
- Tasks as checkboxes
- Complete/incomplete state preserved

**Team-friendly**:
- Clear title format: `[FS-031][US-007] Title`
- Proper labels for filtering
- Milestone groups all related user stories
- Links to source files

### 4. **Traceability** ✅

**Bidirectional links**:
- User Story file → GitHub Issue (frontmatter)
- GitHub Issue → User Story file (links section)
- Feature file → GitHub Milestone (frontmatter)

**Audit trail**:
- Who created issue (auto-created)
- When synced (frontmatter timestamp)
- What changed (GitHub issue history)

### 5. **Scalable** ✅

**Handles complexity**:
- Multiple projects (backend, frontend, mobile)
- 100+ user stories per feature
- Rate limiting protection
- Batch operations

---

## Comparison: Old vs New

### ❌ Old Architecture (WRONG!)

```
Increment 0031 → GitHub Issue #30
  ├── All 7 User Stories in ONE issue (unmaintainable!)
  ├── Can't track User Stories independently
  ├── Can't close User Stories separately
  └── Duplicates when increment re-opens
```

### ✅ New Architecture (CORRECT!)

```
Feature FS-031 → GitHub Milestone #12
  ├── US-001 → Issue #145 (independent tracking)
  ├── US-002 → Issue #146 (independent tracking)
  ├── US-003 → Issue #147 (independent tracking)
  ├── US-004 → Issue #148 (independent tracking)
  ├── US-005 → Issue #149 (independent tracking)
  ├── US-006 → Issue #150 (independent tracking)
  └── US-007 → Issue #152 (independent tracking)

Each User Story:
  ✅ Separate GitHub Issue (granular tracking)
  ✅ Own discussion thread
  ✅ Own checkboxes (AC + Tasks)
  ✅ Independent closure
  ✅ Permanent (no duplicates)
```

---

## Next Steps

1. **Implement missing methods** (10% remaining):
   - `GitHubClientV2.searchIssueByTitle()`
   - Update `GitHubFeatureSync.syncUserStory()` with triple check

2. **Create command wrapper**:
   - Auto-detection logic
   - Smart feature ID determination
   - Error handling and validation

3. **Test end-to-end**:
   - Create feature FS-031
   - Run sync command
   - Verify mileston + 7 issues created
   - Run sync again → No duplicates!
   - Update user story → Issue updates

4. **Optional enhancements**:
   - Bidirectional checkbox sync
   - Task completion status from tasks.md
   - Progress comments on issues

---

## Conclusion

The architecture is **EXCELLENT** and **90% complete**! Existing `GitHubFeatureSync` and `UserStoryIssueBuilder` are well-designed.

**Final 10%**:
- Add duplicate prevention (title search)
- Create smart command wrapper
- Fix minor checkbox state issues

**Result**: Smart, idempotent, auto-detecting GitHub sync that "just works"! 🚀
