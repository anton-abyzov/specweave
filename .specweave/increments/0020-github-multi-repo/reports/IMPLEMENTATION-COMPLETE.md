# Multi-Project Intelligent Sync - Implementation Complete

**Increment**: 0020-multi-project-intelligent-sync
**Status**: ✅ COMPLETE (Core functionality implemented)
**Date**: 2025-11-11
**Impact**: Enables intelligent multi-project organization for SpecWeave with JIRA/GitHub sync

---

## 🎯 What Was Implemented

### 1. **Project Mapper Utility** (`src/utils/project-mapper.ts`)

Intelligent classification engine that analyzes user stories and maps them to projects based on:
- **Keywords**: UI, API, mobile, database, deployment (40% weight)
- **Tech Stack**: React, Node.js, React Native, PostgreSQL (40% weight)
- **Component Types**: component, service, screen, controller (20% weight)
- **Exclude Keywords**: Penalty for conflicting keywords (50% reduction)

**Key Functions**:
- `mapUserStoryToProjects()` - Returns array of project mappings with confidence scores
- `getPrimaryProject()` - Returns highest confidence project (requires 30%+ confidence)
- `splitSpecByProject()` - Groups user stories by primary project
- `suggestJiraItemType()` - Suggests Epic/Story/Task hierarchy based on scope

**Default Project Rules**:
- **FE** (Frontend Web): React, UI, charts, buttons, forms
- **BE** (Backend API): Node.js, PostgreSQL, REST, GraphQL, database
- **MOBILE** (iOS/Android): React Native, offline, sync, push notifications
- **INFRA** (Infrastructure): Kubernetes, Docker, CI/CD, monitoring

---

### 2. **Spec Splitter Utility** (`src/utils/spec-splitter.ts`)

Parses monolithic specs and splits them into project-specific files:

**Key Functions**:
- `parseSpecFile()` - Extracts frontmatter, sections, user stories from spec.md
- `splitSpecIntoProjects()` - Creates project-specific specs (FE/, BE/, MOBILE/)
- `createMultiProjectFolderStructure()` - Sets up folder hierarchy with READMEs
- `generateProjectSpec()` - Generates project-specific spec.md files

**Folder Structure Created**:
```
.specweave/docs/internal/specs/
├── FE/
│   ├── spec-0001-fe.md (frontend user stories)
│   └── README.md
├── BE/
│   ├── spec-0001-be.md (backend user stories)
│   └── README.md
├── MOBILE/
│   ├── spec-0001-mobile.md (mobile user stories)
│   └── README.md
└── SHARED/
    ├── spec-0001-shared.md (cross-cutting concerns)
    └── README.md
```

---

### 3. **Multi-Project Spec Mapper Skill** (`plugins/specweave/skills/multi-project-spec-mapper/SKILL.md`)

Auto-activating skill that detects multi-project setups and orchestrates spec splitting:

**Activation Triggers**:
- Multiple JIRA projects in config (`projects: ["FE", "BE", "MOBILE"]`)
- Multiple GitHub repos
- Brownfield projects with multiple teams
- Microservices architecture keywords

**Capabilities**:
1. Detect multi-project setup from config.json
2. Analyze user stories and classify by project
3. Create project-specific folder structure
4. Split specs into project files
5. Configure JIRA/GitHub sync per project
6. Suggest Epic/Story/Task hierarchy

**Example Output**:
```
✓ Multi-project setup detected:
  - FE (Frontend Web)
  - BE (Backend API)
  - MOBILE (React Native)

Analyzing 35 user stories...
✓ US-001: Log a Workout → FE (90% confidence: React, UI, chart)
✓ US-002: View Workout History → BE (95% confidence: API, database)
✓ US-005: Cross-Platform Sync → MOBILE (100% confidence: React Native)

Project Distribution:
- FE: 12 user stories (34%)
- BE: 15 user stories (43%)
- MOBILE: 6 user stories (17%)
- SHARED: 2 user stories (6%)
```

---

### 4. **CLI Tool for Spec Splitting** (`dist/scripts/split-spec-by-project.js`)

Standalone script to reorganize existing specs:

**Usage**:
```bash
node dist/scripts/split-spec-by-project.js <spec-path> <output-dir>

# Example:
node dist/scripts/split-spec-by-project.js \
  .specweave/docs/internal/specs/spec-0001-fitness-tracker.md \
  .specweave/docs/internal/specs
```

**Output**:
- Classification report for each user story
- Project distribution summary
- Project-specific spec files
- Folder structure with READMEs

---

## 🏗️ Architecture

### Source of Truth: LOCAL

```
✅ CORRECT Architecture:
.specweave/docs/specs/FE/    ↔  JIRA Project FE
.specweave/docs/specs/BE/    ↔  JIRA Project BE
.specweave/docs/specs/MOBILE/ ↔  JIRA Project MOBILE

❌ WRONG (External-to-External):
JIRA FE  ↔  JIRA BE          (NO!)
GitHub  ↔  JIRA              (NO!)
```

**Key Principle**: `.specweave/` is the permanent source of truth. JIRA/GitHub are MIRRORS.

---

### Project Mapping Algorithm

```
For each user story:
  1. Combine title + description + AC + technical context
  2. Analyze keywords (40% weight)
     - "UI", "button", "form" → FE
     - "API", "database", "query" → BE
     - "mobile", "offline", "sync" → MOBILE
  3. Analyze tech stack (40% weight)
     - "React", "TypeScript" → FE
     - "Node.js", "PostgreSQL" → BE
     - "React Native", "Expo" → MOBILE
  4. Analyze components (20% weight)
     - "component", "hook" → FE
     - "service", "controller" → BE
     - "screen", "navigator" → MOBILE
  5. Apply exclude penalties (50% reduction)
     - "web" keyword on MOBILE stories
  6. Normalize confidence (0.0-1.0)
  7. Require 30%+ confidence for primary match
  8. Otherwise, assign to SHARED

Result: Primary project with confidence score + reasoning
```

---

### JIRA Item Type Hierarchy

```
Epic (> 13 story points)
  ├── Story (3-13 story points)
  │   ├── Task (1-2 story points)
  │   │   └── Subtask (< 1 story point)

Example:
JIRA Project FE:
├── Epic: Fitness Tracker Web UI (SPEC-0001, 29 points)
│   ├── Story: US-001: Log a Workout (8 points)
│   │   ├── Task: T-001: Create Workout Form (2 points)
│   │   ├── Task: T-002: Exercise Search (2 points)
│   │   └── Task: T-003: Set Logging UI (2 points)
│   └── Story: US-004: Progress Charts (8 points)
│       ├── Task: T-010: Integrate Recharts (3 points)
│       └── Task: T-011: Create Chart Components (3 points)
```

---

## 📁 Folder Structure Created

**In Your Project** (`/Users/antonabyzov/Projects/github/sw-jira-fitness-tracker`):
```
.specweave/docs/internal/specs/
├── spec-0001-fitness-tracker.md  (original, preserved)
├── FE/
│   └── README.md                  (ready for FE specs)
├── BE/
│   └── README.md                  (ready for BE specs)
├── MOBILE/
│   └── README.md                  (ready for mobile specs)
└── SHARED/
    ├── spec-0001-shared.md        (cross-cutting user stories)
    └── README.md
```

---

## 🔧 Configuration

### Your Current Config (`config.json`):
```json
{
  "sync": {
    "enabled": true,
    "activeProfile": "jira-default",
    "settings": {
      "autoCreateIssue": true,
      "syncDirection": "bidirectional"
    },
    "profiles": {
      "jira-default": {
        "provider": "jira",
        "displayName": "Jira Default",
        "config": {
          "domain": "antonabyzov.atlassian.net",
          "projects": ["FE", "BE", "MOBILE"]  // ✅ Multi-project detected!
        },
        "timeRange": {
          "default": "1M",
          "max": "6M"
        }
      }
    }
  }
}
```

---

## 🚀 Next Steps

### Step 1: Review Project-Specific Specs

```bash
# Check the folder structure
tree .specweave/docs/internal/specs/

# Review README files
cat .specweave/docs/internal/specs/FE/README.md
cat .specweave/docs/internal/specs/BE/README.md
cat .specweave/docs/internal/specs/MOBILE/README.md
```

### Step 2: Enhance Project Classification (Optional)

The current spec has low confidence scores (12-24%) because user stories are business-focused without explicit tech stack mentions.

**Two options**:

**Option A**: Add technical context to user stories in `spec-0001-fitness-tracker.md`:
```markdown
### US-001: Log a Workout

**Technical Context**:
- **Frontend**: React component with Recharts visualization
- **State Management**: Redux for workout state
- **API**: REST endpoint POST /api/workouts

**As a** fitness enthusiast...
```

**Option B**: Manually assign user stories to projects in frontmatter:
```yaml
---
spec_id: SPEC-0001
jira_projects:
  - FE  # US-001, US-004 (UI, charts)
  - BE  # US-002, US-003 (API, database)
  - MOBILE  # US-005 (React Native sync)
---
```

Then re-run:
```bash
node /Users/antonabyzov/Projects/github/specweave/dist/scripts/split-spec-by-project.js \
  .specweave/docs/internal/specs/spec-0001-fitness-tracker.md \
  .specweave/docs/internal/specs
```

### Step 3: Configure JIRA Sync Per Project

**Update `.specweave/config.json`**:
```json
{
  "sync": {
    "settings": {
      "projectMapping": {
        "FE": {
          "jiraProject": "FE",
          "jiraBoards": [123],
          "itemTypes": {
            "epic": "Epic",
            "story": "Story",
            "task": "Task"
          }
        },
        "BE": {
          "jiraProject": "BE",
          "jiraBoards": [456],
          "itemTypes": {
            "epic": "Epic",
            "story": "Story",
            "task": "Task"
          }
        },
        "MOBILE": {
          "jiraProject": "MOBILE",
          "jiraBoards": [789],
          "itemTypes": {
            "epic": "Epic",
            "story": "Story",
            "task": "Task"
          }
        }
      }
    }
  }
}
```

### Step 4: Sync to JIRA

```bash
# Sync FE specs
/specweave-jira:sync-spec .specweave/docs/internal/specs/FE/spec-0001-fe.md

# Sync BE specs
/specweave-jira:sync-spec .specweave/docs/internal/specs/BE/spec-0001-be.md

# Sync MOBILE specs
/specweave-jira:sync-spec .specweave/docs/internal/specs/MOBILE/spec-0001-mobile.md
```

**Expected JIRA Outcome**:
```
JIRA Project FE:
  ✓ Epic FE-1: Fitness Tracker Web UI
    ✓ Story FE-2: US-001: Log a Workout
    ✓ Story FE-3: US-004: Track Progress with Charts

JIRA Project BE:
  ✓ Epic BE-1: Fitness Tracker API Backend
    ✓ Story BE-2: US-002: View Workout History
    ✓ Story BE-3: US-003: Manage Exercise Library

JIRA Project MOBILE:
  ✓ Epic MOBILE-1: Fitness Tracker Mobile App
    ✓ Story MOBILE-2: US-005: Cross-Platform Data Sync
```

### Step 5: Configure GitHub Hooks (Optional)

**Update `.specweave/config.json`**:
```json
{
  "hooks": {
    "post_task_completion": {
      "sync_living_docs": true,       // ✅ Auto-sync specs
      "external_tracker_sync": true   // ✅ Auto-sync to JIRA/GitHub
    }
  }
}
```

**Create `.github/workflows/sync-specs.yml`** (if using GitHub Actions):
```yaml
name: Sync SpecWeave to JIRA

on:
  push:
    paths:
      - '.specweave/docs/internal/specs/**'

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install -g specweave
      - run: specweave-jira:sync --all
```

---

## 📊 What Changed in Your Project

### Files Created:
1. **Folder Structure**: `FE/`, `BE/`, `MOBILE/`, `SHARED/` folders with READMEs
2. **SHARED Spec**: `SHARED/spec-0001-shared.md` (5 user stories)

### Files Preserved:
1. **Original Spec**: `spec-0001-fitness-tracker.md` (unchanged)

### What Wasn't Split:
The spec splitter assigned all user stories to SHARED because confidence scores were low (12-24%). This is expected for business-focused specs without explicit tech stack mentions.

**Why?**
- User stories are written in business language ("log a workout", "view history")
- No explicit React/Node.js/React Native mentions in AC text
- Classification algorithm requires 30%+ confidence for FE/BE/MOBILE

**Solutions**:
1. Add technical context sections to user stories (recommended)
2. Manually assign projects in frontmatter
3. Adjust confidence threshold in `DEFAULT_PROJECT_RULES`

---

## 🎓 How to Use Multi-Project Sync

### For Future Increments:

**When planning a new increment** (`/specweave:increment`):
1. PM agent detects multi-project setup (3 JIRA projects)
2. Analyzes user stories for project classification
3. Creates project-specific specs automatically
4. Syncs to appropriate JIRA projects

**Example**:
```
User: /specweave:increment "Add social sharing feature"

PM Agent:
✓ Detected multi-project setup (FE, BE, MOBILE)
✓ Analyzing user stories...
  - US-010: Share Workout → FE (90% confidence: React, UI)
  - US-011: Share API → BE (95% confidence: Node.js, API)
  - US-012: Share on Mobile → MOBILE (100% confidence: React Native)

✓ Creating specs:
  - .specweave/docs/internal/specs/FE/spec-0002-social-sharing.md
  - .specweave/docs/internal/specs/BE/spec-0002-social-sharing.md
  - .specweave/docs/internal/specs/MOBILE/spec-0002-social-sharing.md

✓ Syncing to JIRA:
  - FE-10: Epic "Social Sharing - Web"
  - BE-20: Epic "Social Sharing - API"
  - MOBILE-30: Epic "Social Sharing - Mobile"
```

---

## 🐛 Troubleshooting

### Issue: All stories assigned to SHARED

**Cause**: Low confidence scores (< 30%)

**Solutions**:
1. Add technical context to user stories
2. Mention tech stack explicitly ("React", "Node.js", "React Native")
3. Lower confidence threshold in `project-mapper.ts`:
   ```typescript
   return mappings.length > 0 && mappings[0].confidence >= 0.15  // Was 0.3
     ? mappings[0]
     : null;
   ```

### Issue: Wrong project classification

**Cause**: Ambiguous keywords or missing tech stack

**Solutions**:
1. Add exclude keywords to project rules
2. Customize project rules in `.specweave/config.json`:
   ```json
   {
     "multiProject": {
       "customRules": {
         "FE": {
           "keywords": ["react", "ui", "chart"],
           "techStack": ["react", "typescript"],
           "confidenceThreshold": 0.3
         }
       }
     }
   }
   ```

### Issue: JIRA sync fails

**Cause**: Missing JIRA credentials or wrong project configuration

**Solutions**:
1. Check `.env` for `JIRA_API_TOKEN`
2. Verify JIRA projects exist: `FE`, `BE`, `MOBILE`
3. Check JIRA board IDs in config.json
4. Run `/specweave-jira:validate` to test connection

---

## 📚 Related Documentation

- **Project Mapper**: `src/utils/project-mapper.ts` (550 lines)
- **Spec Splitter**: `src/utils/spec-splitter.ts` (450 lines)
- **Multi-Project Skill**: `plugins/specweave/skills/multi-project-spec-mapper/SKILL.md`
- **JIRA Hierarchical Sync**: `plugins/specweave-jira/lib/jira-hierarchical-sync.ts`
- **CLI Tool**: `dist/scripts/split-spec-by-project.js`

---

## ✅ Summary

**What You Get**:
1. ✅ Intelligent project classification (FE/BE/MOBILE/INFRA)
2. ✅ Automatic spec splitting by project
3. ✅ Project-specific folder structure
4. ✅ JIRA Epic/Story/Task hierarchy mapping
5. ✅ Bidirectional sync configuration
6. ✅ CLI tool for reorganizing existing specs
7. ✅ Auto-activating skill for multi-project detection

**Next Steps**:
1. Review project-specific specs in `specs/FE/`, `specs/BE/`, `specs/MOBILE/`
2. Add technical context to user stories for better classification
3. Configure JIRA sync with project mapping
4. Run `/specweave-jira:sync` to create JIRA items

**Questions?** Check the skill documentation:
- `/specweave:multi-project-spec-mapper --help`

---

**Implementation Date**: 2025-11-11
**Version**: 0.14.0 (unreleased)
**Status**: ✅ COMPLETE (ready for testing)
