---
name: increment-planner
description: Creates comprehensive implementation plans for ANY type of SpecWeave increment (feature, hotfix, bug, change-request, refactor, experiment). Supports all work types from features to bug investigations to POCs. Activates for: increment planning, feature planning, hotfix, bug investigation, root cause analysis, SRE investigation, change request, refactor, POC, prototype, spike work, experiment, implementation plan, create increment, organize work, break down work, new product, build project, MVP, SaaS, app development, tech stack planning, production issue, critical bug, stakeholder request.
---

# Increment Planner Skill

**Self-contained increment planning that works in ANY user project after `specweave init`.**

---

## Purpose

Automates creation of increment structure for ANY type of work:
- ✅ Auto-numbered directories (`0001-9999`)
- ✅ Duplicate detection (prevents conflicts)
- ✅ Complete file templates (spec.md, plan.md, tasks.md, metadata.json)
- ✅ Proper YAML frontmatter
- ✅ Works in all user projects (self-contained)

---

## Increment Types

| Type | Description | Use When | WIP Limit |
|------|-------------|----------|-----------|
| **feature** | New functionality | Adding features | Max 2 active |
| **hotfix** | Critical production fixes | Production broken | Unlimited |
| **bug** | Bug investigation with RCA | Needs root cause analysis | Unlimited |
| **change-request** | Stakeholder requests | Business changes | Max 2 active |
| **refactor** | Code improvement | Technical debt | Max 1 active |
| **experiment** | POC/spike work | Exploring options | Unlimited |

---

## When to Use

✅ **USE** when:
- Creating features, hotfixes, bug investigations, refactors, POCs
- Planning structured work in user projects
- Need complete increment scaffold with templates

❌ **DON'T USE** when:
- User asking general questions
- Another skill already handling request
- Already in active increment planning

---

## Critical Rules

### 1. Increment Naming (MANDATORY)

**Format**: `####-descriptive-kebab-case-name`

✅ **CORRECT**:
```
0001-user-authentication
0002-payment-processing
0003-email-notifications
```

❌ **WRONG**:
```
0001              ← No description
0002-feature      ← Too generic
my-feature        ← No number
```

### 2. NO Agent Spawning from Skills (CRITICAL)

**Skills MUST NOT spawn content-generating agents via Task() tool.**

**Why**: Context explosion causes Claude Code crashes:
- Skill (1500 lines) loads into context
- Agent (600 lines) spawned
- Agent output (2000+ lines) generated
- **Total: 4000+ lines = CRASH** 💥

**✅ SAFE Workflow**:
```
1. Skill creates basic templates (50 lines each)
2. Skill outputs: "Tell Claude: 'Complete spec for increment 0005'"
3. Agent activates in MAIN context (NOT nested) = SAFE
```

### 3. metadata.json is MANDATORY

Every increment MUST have `metadata.json` or:
- ❌ Status tracking broken
- ❌ WIP limits don't work
- ❌ External sync fails (GitHub/Jira/ADO)
- ❌ All increment commands fail

**Complete template** (values from `.specweave/config.json`):
```json
{
  "id": "0001-feature-name",
  "status": "planned",
  "type": "feature",
  "priority": "P1",
  "created": "2025-11-24T12:00:00Z",
  "lastActivity": "2025-11-24T12:00:00Z",
  "testMode": "<FROM config.testing.defaultTestMode OR 'TDD'>",
  "coverageTarget": <FROM config.testing.defaultCoverageTarget OR 95>,
  "feature_id": null,
  "epic_id": null,
  "externalLinks": {}
}
```

**NOTE**: Always read `testMode` and `coverageTarget` from config, don't hardcode!

### 4. Increment Structure

**Directory structure**:
```
.specweave/increments/0001-feature-name/
├── spec.md          # WHAT & WHY (user stories, acceptance criteria) - REQUIRED
├── plan.md          # HOW (technical design, architecture) - OPTIONAL
├── tasks.md         # STEPS (implementation tasks with embedded tests) - REQUIRED
└── metadata.json    # Metadata - REQUIRED
```

**plan.md is OPTIONAL** - create only for complex features with architecture decisions. Skip for bug fixes, migrations, hotfixes.

**NO separate tests.md** - tests embedded in tasks.md (v0.7.0+)

---

## Workflow (Safe, Self-Contained)

### STEP 0: Detect Multi-Project Mode (MANDATORY FIRST!)

**⚠️ CRITICAL: Before creating ANY user stories, detect if this is a multi-project (umbrella) setup!**

```bash
# 1. Check config.json for umbrella mode
UMBRELLA_ENABLED=$(cat .specweave/config.json 2>/dev/null | jq -r '.umbrella.enabled // false')

# 2. Check for childRepos
CHILD_REPOS=$(cat .specweave/config.json 2>/dev/null | jq -r '.umbrella.childRepos[]?.id // empty' | tr '\n' ',')

# 3. Check for project folders in specs/
PROJECT_FOLDERS=$(ls -1 .specweave/docs/internal/specs/ 2>/dev/null | grep -v "^_" | head -5)

echo "Multi-project mode: $UMBRELLA_ENABLED"
echo "Child repos: $CHILD_REPOS"
echo "Project folders: $PROJECT_FOLDERS"
```

**If multi-project detected (`umbrella.enabled: true` OR multiple project folders exist):**
- ✅ **MUST** generate project-scoped user stories: `US-FE-001`, `US-BE-001`, `US-SHARED-001`
- ✅ **MUST** use project-scoped AC-IDs: `AC-FE-US1-01`, `AC-BE-US1-01`
- ✅ **MUST** group user stories by project in spec.md
- ✅ **MUST** infer project from repo name if available (e.g., `sw-app-fe` → FE, `sw-app-be` → BE)

**Project Prefix Detection from Repo Names:**
```
sw-thumbnail-ab-fe     → prefix: FE (frontend)
sw-thumbnail-ab-be     → prefix: BE (backend)
sw-thumbnail-ab-shared → prefix: SHARED (shared library)
my-app-mobile          → prefix: MOBILE (mobile app)
infra-terraform        → prefix: INFRA (infrastructure)
```

**Store this for use in STEP 4 (spec.md generation)!**

---

### STEP 0A: Read Config Values (MANDATORY)

```bash
# Read testMode (default: "TDD")
testMode=$(cat .specweave/config.json | jq -r '.testing.defaultTestMode // "TDD"')

# Read coverageTarget (default: 95)
coverageTarget=$(cat .specweave/config.json | jq -r '.testing.defaultCoverageTarget // 95')

echo "Using testMode: $testMode"
echo "Using coverageTarget: $coverageTarget"
```

**Store these values for use in STEP 4 and STEP 7!**

### STEP 1: Get Next Increment Number

Use helper script:
```bash
node plugins/specweave/skills/increment-planner/scripts/feature-utils.js next
# Returns: "0021"
```

Or manually scan:
```bash
ls -1 .specweave/increments/ | grep -E '^[0-9]{4}-' | sort | tail -1
# Get highest number, add 1
```

### STEP 2: Check for Duplicates

```bash
node plugins/specweave/skills/increment-planner/scripts/feature-utils.js check-increment 0021
# If exists: STOP and inform user
```

### STEP 3: Create Directory Structure

```bash
mkdir -p .specweave/increments/0021-feature-name
```

### STEP 4: Create spec.md Template

Create `.specweave/increments/0021-feature-name/spec.md`:

**⚠️ IMPORTANT: Use the correct template based on STEP 0 detection!**

#### 4A: Single-Project Template (umbrella.enabled: false)

**Template File**: `templates/spec-single-project.md`

Replace placeholders: `{{INCREMENT_ID}}`, `{{FEATURE_TITLE}}`, `{{TYPE}}`, `{{PRIORITY}}`, `{{DATE}}`, `{{TEST_MODE}}`, `{{COVERAGE_TARGET}}`

#### 4B: Multi-Project Template (umbrella.enabled: true) - USE THIS!

**Template File**: `templates/spec-multi-project.md`

Replace placeholders: `{{INCREMENT_ID}}`, `{{FEATURE_TITLE}}`, `{{PROJECT_FE_ID}}`, `{{PROJECT_BE_ID}}`, `{{PROJECT_SHARED_ID}}`, etc.

**Key Rules for Multi-Project spec.md:**
1. **User stories MUST be grouped by project** (Frontend, Backend, Shared, etc.)
2. **User story IDs MUST have project prefix**: `US-FE-001`, `US-BE-001`, `US-SHARED-001`
3. **AC-IDs MUST have project prefix**: `AC-FE-US1-01`, `AC-BE-US1-01`
4. **Each user story MUST have `Related Repo` field**
5. **Frontmatter MUST include `multi_project: true` and `projects` list**

### STEP 5: Create plan.md Template

Create `.specweave/increments/0021-feature-name/plan.md`:

**Template File**: `templates/plan.md`

Replace `{{FEATURE_TITLE}}` placeholder. plan.md is OPTIONAL - create only for complex features with architecture decisions.

### STEP 6: Create tasks.md Template

Create `.specweave/increments/0021-feature-name/tasks.md`:

**⚠️ IMPORTANT: Use the correct template based on STEP 0 detection!**

#### 6A: Single-Project Template

**Template File**: `templates/tasks-single-project.md`

Replace `{{FEATURE_TITLE}}` placeholder.

#### 6B: Multi-Project Template (umbrella.enabled: true) - USE THIS!

**Template File**: `templates/tasks-multi-project.md`

Replace placeholders: `{{FEATURE_TITLE}}`, `{{PROJECT_FE_ID}}`, `{{PROJECT_BE_ID}}`, `{{PROJECT_SHARED_ID}}`

**Key Rules for Multi-Project tasks.md:**
1. **Tasks MUST reference project-scoped user stories**: `US-FE-001`, `US-BE-001`
2. **Tasks MUST reference project-scoped ACs**: `AC-FE-US1-01`, `AC-BE-US1-01`
3. **Group tasks by project/phase** (Shared first, then BE, then FE)
4. **Test file paths MUST include project folder**: `sw-app-be/tests/`, `sw-app-fe/tests/`
5. **Dependencies between projects should be explicit**

### STEP 7: Create metadata.json (MANDATORY)

**IMPORTANT**: Read `testMode` and `coverageTarget` from `.specweave/config.json`:

```bash
# Read config to get defaultTestMode and defaultCoverageTarget
cat .specweave/config.json | jq -r '.testing.defaultTestMode // "TDD"'
cat .specweave/config.json | jq -r '.testing.defaultCoverageTarget // 95'
```

Create `.specweave/increments/0021-feature-name/metadata.json`:

```json
{
  "id": "0021-feature-name",
  "status": "planned",
  "type": "feature",
  "priority": "P1",
  "created": "2025-11-24T12:00:00Z",
  "lastActivity": "2025-11-24T12:00:00Z",
  "testMode": "<VALUE FROM config.testing.defaultTestMode OR 'TDD'>",
  "coverageTarget": <VALUE FROM config.testing.defaultCoverageTarget OR 95>,
  "feature_id": null,
  "epic_id": null,
  "externalLinks": {}
}
```

**Use Write tool to create this file immediately after creating increment.**

**Example Logic**:
```javascript
// Read config
const config = JSON.parse(fs.readFileSync('.specweave/config.json', 'utf8'));
const testMode = config?.testing?.defaultTestMode || 'TDD';
const coverageTarget = config?.testing?.defaultCoverageTarget || 95;

// Create metadata with config values
const metadata = {
  id: "0021-feature-name",
  status: "planned",
  type: "feature",
  priority: "P1",
  created: new Date().toISOString(),
  lastActivity: new Date().toISOString(),
  testMode: testMode,  // ← FROM CONFIG!
  coverageTarget: coverageTarget,  // ← FROM CONFIG!
  feature_id: null,
  epic_id: null,
  externalLinks: {}
};
```

### STEP 8: Guide User to Complete Planning

**Output this guidance to user**:

```
✅ Increment structure created: .specweave/increments/0021-feature-name/

📋 Basic templates created:
   • spec.md (user stories, acceptance criteria)
   • plan.md (technical design, architecture)
   • tasks.md (implementation steps with test plans)
   • metadata.json (increment metadata)

🚀 To complete planning, run these commands in sequence:

1. Complete product specification:
   Tell Claude: "Complete the spec for increment 0021-feature-name"
   (PM expertise will activate automatically in main conversation)

2. Create technical architecture:
   Tell Claude: "Design architecture for increment 0021-feature-name"
   (Architect will create detailed design in main conversation)

3. Generate implementation tasks:
   Tell Claude: "Create tasks for increment 0021-feature-name"
   (Test-aware planner will generate tasks with embedded tests)

⚠️  These commands run in MAIN conversation (NOT nested agents) to prevent crashes!
```

**DO NOT invoke Task() tool to spawn agents from this skill!**

---

## Model Selection for Tasks

When creating tasks, assign optimal models:

**⚡ Haiku** (fast, cheap):
- Clear instructions with specific file paths
- Detailed acceptance criteria (3+ points)
- Simple CRUD, configuration, setup
- Mechanical work with defined approach

**🧠 Sonnet** (thinking, balanced):
- Architecture decisions
- Multiple valid approaches
- Integration between components
- Complex business logic
- Error handling strategies

**💎 Opus** (critical, expensive):
- Critical system architecture
- Security-critical decisions
- Performance-critical algorithms
- Novel problem-solving

---

## Validation Checklist

Before marking increment planning complete, verify:

**Increment Structure**:
- [ ] Directory exists: `.specweave/increments/####-name/`
- [ ] spec.md has valid YAML frontmatter
- [ ] plan.md has technical design
- [ ] tasks.md has embedded test plans (NO separate tests.md)
- [ ] metadata.json exists and is valid

**spec.md Content**:
- [ ] User stories with AC-IDs (AC-US1-01, etc.)
- [ ] Functional requirements
- [ ] Success criteria (measurable)
- [ ] Out of scope defined
- [ ] Dependencies identified

**plan.md Content**:
- [ ] Components identified
- [ ] Data model defined
- [ ] API contracts specified
- [ ] Technology choices explained
- [ ] Architecture decisions documented

**tasks.md Content**:
- [ ] All tasks have embedded test plans
- [ ] Test cases in BDD format (Given/When/Then)
- [ ] All AC-IDs from spec covered by tasks
- [ ] Model hints assigned (⚡🧠💎)
- [ ] Dependencies explicitly stated

**metadata.json Content**:
- [ ] Valid JSON syntax
- [ ] All required fields present
- [ ] Status is "planned"
- [ ] Type matches increment purpose
- [ ] Timestamps in ISO-8601 format

---

## Helper Scripts

Located in `plugins/specweave/skills/increment-planner/scripts/`:

**Get next increment number**:
```bash
node plugins/specweave/skills/increment-planner/scripts/feature-utils.js next
```

**Check for duplicates**:
```bash
node plugins/specweave/skills/increment-planner/scripts/feature-utils.js check-increment 0021
```

**Generate short name from description**:
```bash
node plugins/specweave/skills/increment-planner/scripts/generate-short-name.js "Add user authentication"
# Returns: "user-authentication"
```

---

## Common Patterns

### Pattern 1: Simple Feature

**User request**: "Add user authentication"

**Process**:
1. Get next number: `0015`
2. Generate short name: `user-authentication`
3. Create: `.specweave/increments/0015-user-authentication/`
4. Create templates (spec.md, plan.md, tasks.md, metadata.json)
5. Guide user to complete in main conversation

### Pattern 2: Critical Hotfix

**User request**: "Fix critical security vulnerability CVE-2024-1234"

**Process**:
1. Get next number: `0016`
2. Short name: `security-fix-cve-2024-1234`
3. Type: `hotfix` (in metadata.json)
4. Priority: `P1`
5. Create templates with urgency markers
6. Guide user to complete quickly

### Pattern 3: Bug Investigation

**User request**: "Investigate memory leak in production API"

**Process**:
1. Get next number: `0017`
2. Short name: `memory-leak-investigation`
3. Type: `bug` (in metadata.json)
4. spec.md focuses on: What's broken? Expected vs actual? Impact?
5. plan.md focuses on: Investigation approach, tools, hypothesis
6. tasks.md focuses on: Investigation steps, fix implementation, verification

---

## Troubleshooting

**Issue**: Feature number conflict
**Solution**: Always run duplicate check before creating increment

**Issue**: metadata.json missing after creation
**Solution**: Verify Write tool succeeded, check file exists with Read tool

**Issue**: Claude Code crashes during planning
**Solution**: This skill creates templates only - completion happens in main conversation (NOT via nested agent spawning)

**Issue**: User stories don't have AC-IDs
**Solution**: Ensure AC-IDs follow format: `AC-US{number}-{criteria}` (e.g., `AC-US1-01`)

**Issue**: Tasks missing test plans
**Solution**: Each testable task MUST have Test Plan section with BDD format (Given/When/Then)

---

## Integration with External Tools

**GitHub Issues**: After increment creation, optionally sync to GitHub:
```bash
/specweave-github:create-issue 0021
```

**Jira Epics**: Sync to Jira:
```bash
/specweave-jira:sync 0021
```

**Azure DevOps**: Sync to ADO work items:
```bash
/specweave-ado:create-workitem 0021
```

---

## Best Practices

**✅ DO**:
- Always create metadata.json (MANDATORY)
- Always create spec.md and tasks.md (MANDATORY)
- Create plan.md only for complex features with architecture decisions
- Use descriptive increment names
- Include AC-IDs in all acceptance criteria
- Embed tests in tasks.md (NO separate tests.md)
- Guide user to complete in main conversation
- Check for duplicates before creating

**❌ DON'T**:
- Use bare numbers (0001) without description
- Spawn agents from this skill (causes crashes)
- Skip metadata.json creation
- Create plan.md for bug fixes, simple migrations, or hotfixes
- Create separate tests.md (deprecated v0.7.0+)
- Reference SpecWeave internal docs/ADRs (users won't have them)
- Over-plan in skill (keep templates simple)

---

**This skill is self-contained and works in ANY user project after `specweave init`.**
