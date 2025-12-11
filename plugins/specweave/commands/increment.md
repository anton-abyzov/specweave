---
name: specweave:increment
description: Plan new Product Increment - PM-led process (market research, spec, plan, auto-generate tasks). Auto-closes previous increment if PM gates pass.
---

# Plan Product Increment

**PM-Led Workflow**: From market research to ready-to-build increment.

You are helping the user create a new SpecWeave increment with automatic closure of previous increment if ready.

## Steps:

### Step 0A: STRICT Pre-Flight Check (MANDATORY - v0.6.0+)

**⛔ THE IRON RULE: Cannot start increment N+1 until increment N is DONE**

**THIS IS NOT NEGOTIABLE** - Enforce strict increment discipline!

```bash
# Run discipline check (exit codes: 0=pass, 1=violations, 2=error)
if ! specweave check-discipline; then
  echo ""
  echo "❌ Cannot create new increment! Discipline violations found."
  echo ""
  echo "💡 What would you like to do?"
  echo ""
  echo "1️⃣  Close incomplete increments:"
  echo "   /sw:done <id>"
  echo ""
  echo "2️⃣  Check status:"
  echo "   specweave check-discipline --verbose"
  echo ""
  echo "3️⃣  Force create (DANGEROUS - violates discipline!):"
  echo "   Add --force flag to bypass this check"
  echo ""
  echo "⚠️  The discipline exists for a reason:"
  echo "   - Prevents scope creep"
  echo "   - Ensures completions are tracked"
  echo "   - Maintains living docs accuracy"
  echo "   - Keeps work focused"
  echo ""
  exit 1
fi

# ✅ Discipline check passed - proceed with planning
echo "✅ Discipline check passed"
```

**Why This is Strict** (changed from v0.5.0):
- ❌ NO "suggest, don't force" - this IS forced
- ❌ NO options to defer - close previous first
- ❌ NO auto-closing gates - explicit closure required
- ✅ HARD BLOCK - cannot proceed without closing previous
- ✅ Clear next steps - use `/sw:close`
- ✅ Safety valve - `--force` flag for emergencies (logged)

**Rationale**:
- Increments pile up without discipline (see: 0002, 0003, 0006 all incomplete)
- "Suggest" approach failed - users ignore suggestions
- Living docs become stale when increments stay open
- Multiple incomplete increments = no source of truth
- Force discipline = force quality

### Step 0B: Smart Check Previous Increment (if applicable)

**🎯 ONLY RUNS IF Step 0A passes** (no incomplete increments)

This step handles auto-closing the previous increment if it's ready.

1. **Check for in-progress increments**:
   ```bash
   # Find increments with status: in-progress
   grep -r "status: in-progress" .specweave/increments/*/spec.md
   ```

2. **If previous increment found, validate PM gates**:
   - **Gate 1**: All P1 tasks completed?
   - **Gate 2**: Tests passing (>80% coverage)?
   - **Gate 3**: Documentation updated (CLAUDE.md, README.md)?

3. **Decision matrix**:
   ```
   All gates ✅ → Auto-close previous, create new (seamless)

   Any gate ❌ → This should never happen (caught by Step 0A)
                 → If it does, treat as incomplete and block
   ```

**NOTE**: Step 0B is now mostly redundant - Step 0A already blocks incomplete work.
This step remains for auto-closing "in-progress" increments that ARE complete.

4. **Auto-close output** (if gates pass):
   ```
   📊 Previous Increment Check

   Found: 0001-user-authentication (in-progress)

   PM Gate Validation:
   ├─ Gate 1 (Tasks): 8/8 P1 completed ✅
   ├─ Gate 2 (Tests): 5/5 passing (85% coverage) ✅
   └─ Gate 3 (Docs): CLAUDE.md ✅, README.md ✅

   ✅ Auto-closing increment 0001...

   Proceeding with new increment 0002...
   ```

5. **Prompt output** (if gates fail):
   ```
   ⚠️ Previous Increment Incomplete

   Found: 0001-user-authentication (in-progress)

   PM Gate Validation:
   ├─ Gate 1 (Tasks): 6/8 P1 completed ❌ (2 P1 tasks remaining)
   ├─ Gate 2 (Tests): 3/5 passing (60% coverage) ❌
   └─ Gate 3 (Docs): CLAUDE.md ✅, README.md ⏳

   Options:
   A. Complete 0001 first (recommended)
      → Run `/do 0001` to finish remaining tasks

   B. Force close 0001 and defer tasks to 0002
      → Transfer T006, T007 to new increment

   C. Cancel and stay on 0001
      → Continue working on authentication

   What would you like to do? (A/B/C)
   ```

**Why suggest, not force?**
- ✅ User stays in control (no surprises)
- ✅ Natural flow in happy path (auto-close if ready)
- ✅ Clear options when incomplete (complete, defer, or cancel)
- ✅ Enforces quality awareness (can't ignore incomplete work)
- ✅ No manual `/done` needed when gates pass

### Step 0C: Simplified WIP Enforcement (v0.7.0+ Redesigned)

**NEW PHILOSOPHY: Default to 1 active increment (maximum focus), allow 2 only for emergencies.**

After passing pre-flight checks (Step 0A, 0B), enforce WIP limits based on simplified config.

**Implementation**:
```typescript
import { MetadataManager } from '../core/metadata-manager';
import { ConfigManager } from '../core/config-manager';
import { IncrementType } from '../core/types';

// 1. Load config (defaults: maxActiveIncrements=1, hardCap=3, allowEmergencyInterrupt=true)
const config = ConfigManager.load();
const limits = config.limits || {
  maxActiveIncrements: 1,
  hardCap: 3,
  allowEmergencyInterrupt: true,
  typeBehaviors: {
    canInterrupt: ['hotfix', 'bug']
  }
};

// 2. Count active increments (NOT paused/completed/abandoned)
const active = MetadataManager.getAllActive();
const activeCount = active.length;

// 3. Ask user for increment type (or detect from title)
const incrementType = await promptForType(); // hotfix, feature, bug, change-request, refactor, experiment

// 4. HARD CAP WARNING (negotiable - user decides!)
if (activeCount >= limits.hardCap) {
  console.log(chalk.yellow.bold('\n⚠️  WIP LIMIT EXCEEDED\n'));
  console.log(chalk.yellow(`You have ${activeCount} active increments (configured limit: ${limits.hardCap})\n`));

  console.log(chalk.dim('Active increments:'));
  active.forEach(inc => {
    console.log(chalk.dim(`  • ${inc.id} [${inc.type}]`));
  });

  console.log(chalk.blue('\n💡 Options:\n'));
  console.log(chalk.white('1️⃣  Complete an increment: /sw:done <id>'));
  console.log(chalk.white('2️⃣  Pause an increment: /sw:pause <id>'));
  console.log(chalk.white('3️⃣  Increase limit: Edit .specweave/config.json limits.hardCap'));
  console.log(chalk.white('4️⃣  Continue anyway (confirm below)\n'));

  console.log(chalk.dim('Research: 3+ concurrent tasks = 40% slower + more bugs\n'));

  // ASK user instead of blocking
  const proceed = await promptConfirm('Continue with new increment anyway?');
  if (!proceed) {
    console.log(chalk.dim('Cancelled. Complete or pause existing work first.'));
    process.exit(0);
  }
  console.log(chalk.green('✓ Proceeding with new increment...\n'));
}

// 5. SOFT ENFORCEMENT (activeCount >= maxActiveIncrements)
if (activeCount >= limits.maxActiveIncrements) {
  const canInterrupt = limits.typeBehaviors?.canInterrupt || ['hotfix', 'bug'];
  const isEmergency = canInterrupt.includes(incrementType);

  if (isEmergency && limits.allowEmergencyInterrupt) {
    // ✅ ALLOW - Emergency interrupt
    console.log(chalk.yellow.bold('\n⚠️  EMERGENCY INTERRUPT\n'));
    console.log(chalk.yellow(`Starting ${incrementType} increment (emergency exception allowed)\n`));
    console.log(chalk.dim('You have 1 active increment. This will be your 2nd (emergency ceiling).\n'));

    console.log(chalk.blue('📋 Active increments:'));
    active.forEach(inc => {
      console.log(chalk.dim(`  • ${inc.id} [${inc.type}]`));
    });

    console.log(chalk.yellow('\n💡 Recommendation: After emergency, complete or pause it before resuming normal work.\n'));

    // Continue to Step 1
  } else {
    // ❌ SOFT BLOCK - Warn and offer options
    console.log(chalk.yellow.bold('\n⚠️  WIP LIMIT REACHED\n'));
    console.log(chalk.yellow(`You have ${activeCount} active increment(s) (recommended limit: ${limits.maxActiveIncrements})\n`));

    console.log(chalk.yellow('Active increments:'));
    active.forEach(inc => {
      console.log(chalk.dim(`  • ${inc.id} [${inc.type}]`));
    });

    console.log(chalk.dim('\n🧠 Focus Principle: ONE active increment = maximum productivity'));
    console.log(chalk.dim('Starting a 2nd increment reduces focus and velocity.\n'));

    console.log(chalk.blue('💡 What would you like to do?\n'));
    console.log(chalk.white('1️⃣  Complete current work (recommended)'));
    console.log(chalk.dim('   Finish active increment before starting new\n'));
    console.log(chalk.white('2️⃣  Pause current work'));
    console.log(chalk.dim('   Pause active increment to focus on new work\n'));
    console.log(chalk.white('3️⃣  Start 2nd increment anyway'));
    console.log(chalk.dim('   Accept productivity cost (20% slower)\n'));

    const choice = await prompt({
      type: 'select',
      message: 'Choose an option:',
      choices: [
        { name: 'Complete current work', value: 'complete' },
        { name: 'Pause current work', value: 'pause' },
        { name: 'Start 2nd increment anyway', value: 'continue' }
      ]
    });

    if (choice === 'complete') {
      console.log(chalk.green('\n✅ Smart choice! Finish current work first.\n'));
      console.log(chalk.dim('Use /sw:do to continue work\n'));
      process.exit(0);
    } else if (choice === 'pause') {
      console.log(chalk.blue('\n⏸️  Pausing current increment...\n'));
      const pauseReason = await prompt({
        type: 'input',
        message: 'Reason for pausing:',
        default: 'Paused to start new work'
      });

      for (const inc of active) {
        await MetadataManager.pause(inc.id, pauseReason);
        console.log(chalk.green(`✅ Paused ${inc.id}`));
      }
      console.log(chalk.green('\n✅ Proceeding with new increment...\n'));
    } else {
      // choice === 'continue'
      console.log(chalk.yellow('\n⚠️  Starting 2nd increment (20% productivity cost)\n'));
      console.log(chalk.dim('Research: Context switching reduces velocity significantly.\n'));
    }
  }
}

// 6. If activeCount < maxActiveIncrements, no warnings - proceed directly
if (activeCount === 0) {
  console.log(chalk.green('✅ No active increments. Starting fresh!\n'));
}

// Proceed to Step 1 (find next increment number)
```

**Example Output - Hard Cap (2 active)**:
```
❌ HARD CAP REACHED

You have 2 active increments (absolute maximum: 2)

Active increments:
  • 0005-authentication [feature]
  • 0006-security-hotfix [hotfix]

💡 You MUST complete or pause existing work first:

1️⃣  Complete an increment:
   /sw:done <id>

2️⃣  Pause an increment:
   /sw:pause <id> --reason="..."

3️⃣  Check status:
   /sw:status

📝 Multiple hotfixes? Combine them into ONE increment!
   Example: 0009-security-fixes (SQL + XSS + CSRF)

⛔ This limit is enforced for your productivity.
Research: 3+ concurrent tasks = 40% slower + more bugs
```

**Example Output - Soft Warning (1 active, starting 2nd)**:
```
⚠️  WIP LIMIT REACHED

You have 1 active increment(s) (recommended limit: 1)

Active increments:
  • 0005-authentication [feature]

🧠 Focus Principle: ONE active increment = maximum productivity
Starting a 2nd increment reduces focus and velocity.

💡 What would you like to do?

1️⃣  Complete current work (recommended)
   Finish active increment before starting new

2️⃣  Pause current work
   Pause active increment to focus on new work

3️⃣  Start 2nd increment anyway
   Accept productivity cost (20% slower)

Choose an option: 1

✅ Smart choice! Finish current work first.

Use /sw:do to continue work
```

**Example Output - Emergency Interrupt (hotfix)**:
```
⚠️  EMERGENCY INTERRUPT

Starting hotfix increment (emergency exception allowed)

You have 1 active increment. This will be your 2nd (emergency ceiling).

📋 Active increments:
  • 0005-authentication [feature]

💡 Recommendation: After emergency, complete or pause it before resuming normal work.

Proceeding with hotfix 0006...
```

**Type-Based Limits** (from `TYPE_LIMITS` in `increment-metadata.ts`):
- **Hotfix**: Unlimited (critical production fixes)
- **Bug**: Unlimited (production bugs need immediate attention)
- **Feature**: Max 2 active (standard development)
- **Change Request**: Max 2 active (stakeholder requests)
- **Refactor**: Max 1 active (requires focus)
- **Experiment**: Unlimited (POCs, spikes)

**Bypassing Warnings** (not recommended):
- Users can answer "yes" to continue anyway
- Hotfixes and bugs bypass context switching warnings (emergency work)
- Use sparingly - discipline exists for a reason!

### Step 0D: Get Project Context (MANDATORY - RUN FIRST!)

**⛔ THIS STEP MUST BE COMPLETED BEFORE ANY SPEC GENERATION!**

**🚨 YOU MUST USE THE BASH TOOL TO RUN THIS COMMAND:**

```bash
specweave context projects
```

**CAPTURE THE OUTPUT AND STORE IT:**

```json
// Example 1-level output:
{
  "level": 1,
  "projects": [{"id": "frontend-app"}, {"id": "backend-api"}, {"id": "shared"}]
}

// Example 2-level output:
{
  "level": 2,
  "projects": [{"id": "acme-corp"}],
  "boardsByProject": {
    "acme-corp": [{"id": "digital-ops"}, {"id": "mobile-team"}]
  }
}
```

**STORE THESE VALUES FOR USE IN STEP 5:**
```
STRUCTURE_LEVEL = 1 or 2
AVAILABLE_PROJECTS = ["frontend-app", "backend-api", "shared"]
AVAILABLE_BOARDS = {...}  // for 2-level only
```

**WHY THIS IS MANDATORY:**
- Without this data, spec.md will have `{{PROJECT_ID}}` placeholders
- Placeholders WILL BE BLOCKED by `spec-project-validator.sh` hook
- Living docs sync and external tool sync WILL FAIL
- User will get frustrated with blocked edits

**YOU MUST ACTUALLY RUN THE COMMAND** - reading documentation about it is NOT enough!

---

### Step 1: Find next increment number

- Scan `.specweave/increments/` directory (active increments)
- Scan `.specweave/increments/_archive/` directory (archived/abandoned increments)
- Find highest number across both directories (e.g., 032)
- Next increment: 033

### Step 1.5: Detect Structure Level & Select Project/Board (v0.31.0+ MANDATORY!)

**⚠️ MANDATORY CHECK before generating spec.md!**

**Structure Level Detection** (use `src/utils/structure-level-detector.ts`):

```typescript
import { detectStructureLevel } from './utils/structure-level-detector.js';

const structureConfig = detectStructureLevel(projectRoot);
// structureConfig.level: 1 or 2
// structureConfig.projects: available projects
// structureConfig.boardsByProject: boards per project (if 2-level)
```

**Detection Sources** (priority order):
1. ADO area path mapping (`sync.profiles.*.config.areaPathMapping`)
2. ADO `areaPaths` array
3. JIRA board mapping (`sync.profiles.*.config.boardMapping`)
4. Umbrella teams (`umbrella.teams`)
5. Umbrella repos (`umbrella.childRepos`)
6. Multi-project config (`multiProject.enabled`)
7. Existing folder structure (fallback)

**Project/Board Selection - ULTRA-SMART LOGIC:**

**⚠️ CORE PRINCIPLE: Each User Story belongs to exactly ONE project (1-level) or ONE project+board (2-level). An increment can contain USs spanning MULTIPLE projects/boards.**

---

#### SMART SELECTION RULES

**RULE 1: NO QUESTION IF ONLY 1 OPTION**
```
IF 1-level AND only 1 project → AUTO-SELECT silently, NO question
IF 2-level AND only 1 project AND only 1 board → AUTO-SELECT silently, NO question
```

**RULE 2: KEYWORD-BASED AUTO-DETECTION**

Analyze feature description for keywords before asking:

**Project-Level Keywords (1-level and 2-level):**
```
Frontend (FE): UI, form, button, page, component, React, Vue, Angular,
               Next.js, CSS, style, responsive, chart, dashboard, view,
               modal, widget, Tailwind, Material-UI, Recharts

Backend (BE): API, endpoint, REST, GraphQL, database, query, migration,
              service, controller, authentication, JWT, session, middleware,
              CRUD, Redis, PostgreSQL, MongoDB, microservice

Mobile: mobile, iOS, Android, React Native, Flutter, Expo, app, native,
        push notification, offline, AsyncStorage, screen, touch, gesture

Infrastructure: deploy, CI/CD, Docker, Kubernetes, terraform, monitoring,
                logging, pipeline, AWS, Azure, GCP, nginx, Helm, ArgoCD

Shared: types, interfaces, utilities, validators, shared, common, library,
        SDK, models, constants, helpers
```

**Board-Level Keywords (2-level structures only):**
```
When project has multiple boards, also match board-specific keywords:

analytics/reporting: analytics, metrics, KPI, dashboard, report, chart, graph
user-management: user, auth, login, registration, profile, permissions, roles
integrations: integration, webhook, API, third-party, sync, import, export
payments: payment, billing, subscription, invoice, stripe, checkout
notifications: notification, alert, email, SMS, push, messaging
devops/platform: deploy, infrastructure, monitoring, CI/CD, pipeline
```

**RULE 3: CONFIDENCE CALCULATION FORMULA**
```
confidence = (matched_keywords / total_feature_keywords) × 100

Example: "Add React login form with JWT authentication"
  Keywords found: React (FE), login (FE), form (FE), JWT (BE), authentication (BE)
  FE matches: 3, BE matches: 2
  FE confidence: 3/5 = 60%
  BE confidence: 2/5 = 40%
  → Primary: FE (60%), Secondary: BE (40%)
  → SUGGEST: "Frontend (60%), but also touches Backend (40%)"

If multiple projects have similar confidence (within 15%):
  → Treat as MULTI-PROJECT feature
  → Auto-split USs by detected keywords
```

**RULE 4: CONFIDENCE-BASED DECISION**
```
>80% single project → AUTO-SELECT with notification (no question)
50-80% single project → SUGGEST with quick confirm option
Multiple projects within 15% → AUTO-SPLIT across projects
<50% OR ambiguous → ASK user with ALL options listed
```

**RULE 5: FALLBACK TO DEFAULTS**
```
IF US has explicit **Project**: field → USE IT
ELSE IF frontmatter has default_project → USE default_project
ELSE → ASK user (should not happen if flow followed correctly)

Same logic applies to **Board**: and default_board for 2-level
```

---

#### DECISION FLOWCHART

```
START
  │
  ▼
┌─────────────────────────────────────┐
│ 1. Detect structure level (1 or 2) │
│ 2. Count available projects/boards │
└─────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────┐
│ ONLY 1 OPTION?                      │
│ (1-level: 1 project)                │
│ (2-level: 1 project + 1 board)      │
└─────────────────────────────────────┘
  │
  ├── YES ──► AUTO-SELECT SILENTLY
  │           "✅ Project: {name} (auto-selected)"
  │           NO QUESTION ASKED
  │
  ▼ NO
┌─────────────────────────────────────┐
│ ANALYZE KEYWORDS in feature desc    │
│ Calculate confidence per project    │
└─────────────────────────────────────┘
  │
  ├── HIGH (>80% single) ──► AUTO-SELECT + NOTIFY
  │   "✅ Detected: {project} (keywords: React, form)"
  │
  ├── MULTI-PROJECT (within 15%) ──► AUTO-SPLIT USs
  │   "🔀 Multi-project detected:
  │    • US-001 (Login UI) → web-app (60%)
  │    • US-002 (Auth API) → api-service (55%)
  │    Proceed? (Y/n)"
  │
  ├── MEDIUM (50-80%) ──► SUGGEST + CONFIRM
  │   "📍 Suggested: {project}. Confirm? (Y/n)"
  │
  ▼ LOW (<50%)
┌─────────────────────────────────────┐
│ ASK with ALL options (multiSelect)  │
│ Never truncate, never hide options  │
└─────────────────────────────────────┘
```

---

#### PER-USER-STORY ASSIGNMENT

**CRITICAL: Assignment is at USER STORY level, not increment level!**

Each US has its own project (and board for 2-level):
```markdown
### US-001: Login Form UI
**Project**: web-app
**Board**: frontend  <!-- 2-level only -->

### US-002: Auth API Endpoints
**Project**: api-service
**Board**: backend  <!-- 2-level only -->

### US-003: Mobile Login
**Project**: mobile-app
**Board**: mobile-team  <!-- 2-level only -->
```

**User can manually edit project/board per US in spec.md anytime!**

---

#### EXAMPLE SCENARIOS

**Scenario 1: Single Project (NO QUESTION)**
```
Config: 1 project (my-app)
Feature: "Add dark mode toggle"

→ AUTO-SELECT: my-app
→ Output: "✅ Project: my-app (single project - auto-selected)"
→ NO question asked
```

**Scenario 2: Multiple Projects, Clear Keywords (AUTO-DETECT)**
```
Config: 3 projects (web-app, api-service, mobile-app)
Feature: "Add React dashboard with charts"

→ Keywords: "React" (FE), "dashboard" (FE), "charts" (FE)
→ Confidence: 95% → web-app
→ Output: "✅ Detected: web-app (keywords: React, dashboard, charts)"
→ NO question (high confidence)
```

**Scenario 3: Multi-Area Feature (SMART SPLIT)**
```
Config: 3 projects (web-app, api-service, shared-lib)
Feature: "User authentication with JWT"

→ This spans FE (login form) + BE (auth API) + shared (types)
→ Output:
  "🔍 This feature spans multiple projects. Auto-assigning:
   • US-001: Login UI → web-app
   • US-002: Auth API → api-service
   • US-003: Auth types → shared-lib

   ✅ Proceed? You can modify per-US in spec.md"
```

**Scenario 4: 2-Level, Single Project, Multiple Boards**
```
Config: 1 project (enterprise-corp), 5 boards
Feature: "Add reporting dashboard"

→ Project: AUTO-SELECT (only 1)
→ Board keywords: "reporting" + "dashboard"
→ Output:
  "✅ Project: enterprise-corp (auto-selected)
   📍 Suggested board: analytics (keyword: reporting)
   Confirm or select: [1] analytics [2] frontend [3] backend..."
```

**Scenario 5: Ambiguous (ASK WITH ALL OPTIONS)**
```
Config: 4 projects
Feature: "Improve system performance"

→ No clear keyword match
→ ASK with ALL options listed (multiSelect: true)
→ Never hide behind "see all"
```

---

#### VALIDATION RULES

```
❌ FORBIDDEN: Asking when only 1 project/board exists
❌ FORBIDDEN: Hiding options behind "Let me see all"
❌ FORBIDDEN: Truncating project/board lists
❌ FORBIDDEN: Assigning ALL USs to same project when content differs
✅ REQUIRED: Auto-select when only 1 option
✅ REQUIRED: Use keyword matching before asking
✅ REQUIRED: Each US has explicit project/board assignment
✅ REQUIRED: When asking, show ALL options with descriptions
✅ REQUIRED: Allow user to modify per-US in spec.md
```

---

#### SPEC.MD YAML FORMAT

**1-Level Structure:**
```yaml
---
increment: 0045-user-auth
title: "User Authentication"
default_project: web-app  # Optional default for USs that don't specify
---
```

**2-Level Structure:**
```yaml
---
increment: 0045-user-auth
title: "User Authentication"
default_project: enterprise-corp
default_board: backend  # Optional defaults
---
```

**Pass detected/selected values to increment-planner skill!**

### Step 2: Detect tech stack (CRITICAL - framework-agnostic)
   - Settings auto-detected
   - If not found, detect from project files:
     - `package.json` → TypeScript/JavaScript
     - `requirements.txt` or `pyproject.toml` → Python
     - `go.mod` → Go
     - `Cargo.toml` → Rust
     - `pom.xml` or `build.gradle` → Java
     - `*.csproj` → C#/.NET
   - Detect framework (NextJS, Django, FastAPI, Spring Boot, etc.)
   - If detection fails, ask user: "What language/framework are you using?"
   - Store detected tech stack for later use

### Step 3: Ask user for details

- "What would you like to build?" (get high-level description)
- "What's the short name?" (e.g., "user-authentication" for increment 003-user-authentication)
- "Priority? (P1/P2/P3)" (default: P1)

### Step 4: Detect Suggested Plugins (T-019 - Plugin Auto-Detection)

**🔌 NEW IN v0.4.0**: Auto-detect plugins based on increment description

Before planning, analyze the feature description for plugin keywords and suggest relevant plugins:

```bash
# Example feature descriptions and their plugin suggestions:
"Deploy to Kubernetes" → kubernetes plugin
"Add Stripe payments" → payment-processing plugin
"Create React dashboard" → frontend-stack plugin
"Build FastAPI backend" → backend-stack plugin
"Sync with GitHub issues" → github plugin
"Integrate with Jira" → jira plugin
```

**Detection Logic**:
1. Extract keywords from feature description
2. Match against plugin triggers (from manifest.json)
3. Check if plugin already enabled
4. Suggest new plugins only

**Output Format**:
```
💡 Plugin Detection

Analyzing feature: "Add authentication with NextJS and Stripe"

Suggested plugins:
✅ frontend-stack (NextJS detected)
✅ payment-processing (Stripe detected)

Would you like to enable these plugins? (Y/n)
```

**If user confirms**:
- Enable plugins via PluginManager
- Plugins become available for increment planning
- Skills/agents from plugins can be used immediately

**If user declines**:
- Continue without plugins
- User can enable later: `specweave plugin enable <name>`

### Step 5: Activate Increment Planning Workflow

**🚨 CRITICAL - YOU MUST USE THE SKILL TOOL:**

**DO NOT** manually create files. **DO NOT** skip this step. **DO NOT** write spec.md or plan.md directly.

You MUST invoke the increment-planner skill to orchestrate the full PM-led workflow:

```
Use the Skill tool:
command: "increment-planner"
```

The increment-planner skill will:
1. Invoke PM agent (via Task tool with subagent_type="pm")
2. Invoke Architect agent (via Task tool with subagent_type="architect")
3. Invoke other strategic agents as needed
4. Create living documentation in .specweave/docs/internal/
5. Create increment files that reference living docs
6. Auto-generate tasks.md using task-builder skill
7. Create context-manifest.yaml
8. Apply validation hooks
9. Trigger post-increment hooks (doc sync)

**WHY THIS IS MANDATORY:**
- ✅ Living docs get created (source of truth)
- ✅ Agents collaborate properly (PM → Architect flow)
- ✅ Tasks auto-generated from plan
- ✅ Hooks run (validation, doc sync)
- ✅ Quality gates enforced
- ❌ Direct file writing bypasses entire workflow

### Step 6: Skill Tool Invocation (MANDATORY)

**BEFORE PROCEEDING, USE THE SKILL TOOL:**

You must literally call the Skill tool like this:
```
Skill(command: "increment-planner")
```

Wait for the skill to complete. Do NOT continue to Step 7 until the increment-planner skill returns.

### Step 7: Alternative Approach (ONLY IF SKILL FAILS)

**Only use this if Skill tool is unavailable or fails:**

Manually invoke agents using Task tool:

1. **Invoke PM Agent:**
   ```
   Task(
     subagent_type: "specweave:pm:pm",
     prompt: "Create product strategy for: [user description]
             Detect tech stack from: [detected tech info]
             Create living docs in .specweave/docs/internal/strategy/
             Create increment spec.md that references strategy docs",
     description: "PM product strategy"
   )
   ```

2. **Invoke Architect Agent:**
   ```
   Task(
     subagent_type: "specweave:architect:architect",
     prompt: "Read PM's strategy docs from .specweave/docs/internal/strategy/
             Create technical architecture for: [user description]
             Tech stack: [detected tech stack]
             Create living docs in .specweave/docs/internal/architecture/
             Create ADRs for all technical decisions
             Create increment plan.md that references architecture docs",
     description: "Architect technical design"
   )
   ```

3. **Auto-generate tasks.md:**
   ```
   Skill(command: "task-builder")
   ```

**Pass detected tech stack to ALL agents** (CRITICAL!)

### Step 7: Verify Increment Creation

After the increment-planner skill completes, verify:

1. **Living docs created:**
   - `.specweave/docs/internal/strategy/{module}/` exists
   - `.specweave/docs/internal/architecture/adr/` has ADRs

2. **Increment files created:**
   - `.specweave/increments/####-name/spec.md` (references strategy docs, AC-IDs)
   - `.specweave/increments/####-name/plan.md` (references architecture docs, test strategy)
   - `.specweave/increments/####-name/tasks.md` (implementation + embedded tests in BDD format, v0.7.0+)
   - `.specweave/increments/####-name/context-manifest.yaml`

3. **Hooks executed:**
   - Validation hooks ran
   - Post-increment hooks ran
   - Living documentation synced

### Step 8: Output to user
    ```
    ✅ Created increment 0003-user-authentication

       Detected tech stack:
       - Language: {detected-language} (e.g., Python, TypeScript, Go, Java)
       - Framework: {detected-framework} (e.g., Django, FastAPI, NextJS, Spring Boot)
       - Database: {specified-database} (e.g., PostgreSQL, MySQL, MongoDB)
       - Platform: {specified-platform} (e.g., AWS, Hetzner, Vercel, self-hosted)

       Location: .specweave/increments/0003-user-authentication/

       📋 Files created:
       - spec.md (6 user stories, 15 requirements)
       - tasks.md (42 implementation tasks using {framework} patterns)
       - pm-analysis.md (product strategy)
       - architecture.md (system design for {framework})
       - infrastructure.md ({platform} deployment)
       - security.md ({framework}-specific security)
       - test-strategy.md (E2E tests for {framework})

       ⏱️  Estimated effort: 3-4 weeks
    ```

### Step 9: Sync Strategic Docs to Living Docs

**🔥 CRITICAL: After increment planning, sync to living docs**

```
🔊 [Playing celebration sound...]

📝 Now syncing strategic documentation to living docs...
```

**Run `/sw:sync-docs update` to create initial documentation**:

```bash
/sw:sync-docs update
```

This will:
- Create ADRs from architectural decisions in plan.md (status: Proposed)
- Add new features to `.specweave/docs/public/overview/features.md`
- Add architecture diagrams to `.specweave/docs/internal/architecture/diagrams/`
- Update infrastructure docs in `.specweave/docs/internal/operations/`
- Update security docs in `.specweave/docs/internal/security/`
- May prompt for conflict resolution if needed

**After `/sw:sync-docs update` completes**:

```
✅ Strategic documentation synchronized!
```

### Step 10: Trigger Living Docs & External Tool Sync (v0.32.2+)

**🔄 CRITICAL: After increment files are created, sync to living docs AND external tools:**

```
🔄 Syncing increment to living docs...
📡 Syncing to external tools (GitHub/JIRA/ADO)...
```

**🚨 MANDATORY - USE SlashCommand TOOL:**

You MUST invoke the sync-specs command using the SlashCommand tool:

```
SlashCommand(command: "/sw:sync-specs {increment-id}")
```

**DO NOT** just mention the command in output - you MUST actually execute it!

**WHY THIS IS MANDATORY (Bug Fix v0.33.0):**
- Without explicit SlashCommand call, living docs get out of sync
- Increments folder and specs folder diverge
- External tool sync doesn't happen
- User sees stale documentation

**Alternative** - call LivingDocsSync directly in TypeScript implementations:

```typescript
import { LivingDocsSync } from './src/core/living-docs/living-docs-sync.js';

const sync = new LivingDocsSync(projectRoot);
const result = await sync.syncIncrement(incrementId, { dryRun: false });

if (result.success) {
  console.log(`✅ Living docs synced: ${result.featureId}`);
  console.log(`   Created: ${result.filesCreated.length} files`);
} else {
  console.log(`⚠️  Living docs sync had errors (non-blocking): ${result.errors.join(', ')}`);
}
```

**What `syncIncrement()` does automatically (Step 7 in the sync flow):**

1. Creates living docs (FS-XXX folder with FEATURE.md and us-*.md files)
2. Calls `syncToExternalTools()` which detects GitHub/JIRA/ADO from config
3. Checks permissions (`canUpsertInternalItems`) before creating issues
4. Creates issues in external tools via existing sync infrastructure:
   - GitHub: `GitHubFeatureSync.syncFeatureToGitHub(featureId)`
   - JIRA: `JiraFeatureSync.syncFeatureToJira(featureId)`
   - ADO: `ADOFeatureSync.syncFeatureToADO(featureId)`

**Expected output:**

```
🔄 Syncing increment to living docs...
✅ Living docs synced: FS-118E
   Created: 4 files (FEATURE.md, us-001.md, us-002.md, us-003.md)

📡 Syncing to external tools: github
   📋 Permissions: upsert=true, update=true, status=true
   ✅ Synced to GitHub: 0 updated, 3 created
```

**Permission-aware sync (v0.32.2+):**

Before calling external sync, `syncToExternalTools()` checks permissions from `.specweave/config.json`:

| Permission | Controls | When Required |
|------------|----------|---------------|
| `canUpsertInternalItems` | CREATE new issues for SpecWeave-created items | Creating increment issues |
| `canUpdateExternalItems` | UPDATE issues imported from external tools | Updating imported items |
| `canUpdateStatus` | UPDATE issue status (open/closed) | Closing completed items |

If `canUpsertInternalItems: false`:
```
⚠️ Skipping external sync - canUpsertInternalItems is disabled in config
💡 Enable in .specweave/config.json: sync.settings.canUpsertInternalItems: true
```

**Error handling:**

External tool sync failures are **NON-BLOCKING** (increment creation succeeds):

```
⚠️ External sync failed: Rate limit exceeded
💡 Run /sw:sync-specs {increment-id} to retry
```

**After Step 10 completes:**

```
✅ Increment created and synced!

Next steps:
1. Review the increment plan and strategic docs
2. Start implementation: /sw:do {increment-id}
3. Monitor external tool status: /sw:status {increment-id}
```

## Frontmatter Format (spec.md):

**IMPORTANT**: Tech stack is AUTO-DETECTED from project files (package.json, requirements.txt, etc.), NOT hardcoded!

**IMPORTANT (v0.31.0+)**: `project:` (and `board:` for 2-level) fields are MANDATORY. See Step 1.5.

```yaml
---
increment: 003-user-authentication
title: "User Authentication System"
priority: P1
status: planned
created: 2025-10-26
dependencies: []
structure: user-stories

# PROJECT/BOARD (v0.31.0+ MANDATORY)
project: web-app                           # REQUIRED - target project for living docs sync
board: digital-operations                  # REQUIRED only for 2-level structures (ADO/JIRA boards)

# Tech stack is DETECTED, not hardcoded
tech_stack:
  detected_from: "package.json"  # or "requirements.txt", "go.mod", etc.
  language: "{detected-language}"          # e.g., "typescript", "python", "go", "java", "rust"
  framework: "{detected-framework}"        # e.g., "nextjs", "django", "fastapi", "spring-boot", "gin"
  database: "{specified-database}"         # e.g., "postgresql", "mysql", "mongodb", "sqlite"
  orm: "{detected-orm}"                    # e.g., "prisma", "django-orm", "sqlalchemy", "hibernate"

# Platform is SPECIFIED by user or detected from config
platform: "{specified-platform}"           # e.g., "hetzner", "aws", "vercel", "self-hosted"
estimated_cost: "{calculated-based-on-platform}"
---
```

**Example for TypeScript/NextJS project**:
```yaml
tech_stack:
  detected_from: "package.json"
  language: "typescript"
  framework: "nextjs"
  database: "postgresql"
  orm: "prisma"
platform: "vercel"
estimated_cost: "$20/month"
```

**Example for Python/Django project**:
```yaml
tech_stack:
  detected_from: "requirements.txt"
  language: "python"
  framework: "django"
  database: "postgresql"
  orm: "django-orm"
platform: "hetzner"
estimated_cost: "$12/month"
```

**Example for Go/Gin project**:
```yaml
tech_stack:
  detected_from: "go.mod"
  language: "go"
  framework: "gin"
  database: "postgresql"
  orm: "gorm"
platform: "aws"
estimated_cost: "$25/month"
```

## Frontmatter Format (tasks.md):

```yaml
---
increment: 003-event-booking-saas
status: planned
dependencies:
  - 001-skills-framework
  - 002-role-based-agents
phases:
  - infrastructure
  - backend
  - frontend
  - testing
  - deployment
estimated_tasks: 42
estimated_weeks: 3-4
---
```

## Autonomous Mode (Advanced):

If user says "autonomous mode" or "full automation":
1. Run all strategic agents
2. Create increment
3. **Start implementation immediately** (with permission)
4. Ask clarification questions only when critical
5. Suggest doc updates when needed
6. Complete full implementation autonomously

## Error Handling:

- If `.specweave/` not found: "Error: Not a SpecWeave project. Run specweave init first."
- If user description too vague: Ask more clarifying questions
- If strategic agents not available: "Warning: Some agents missing. Continue with basic spec?"

---

**Important**: This is the main entry point for creating new work in SpecWeave.
