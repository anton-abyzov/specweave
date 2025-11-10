---
name: specweave:increment
description: Plan new Product Increment - PM-led process (market research, spec, plan, auto-generate tasks). Auto-closes previous increment if PM gates pass.
---

# Plan Product Increment

**PM-Led Workflow**: From market research to ready-to-build increment.

You are helping the user create a new SpecWeave increment with automatic closure of previous increment if ready.

## Steps:

### Step 0: Plugin Validation (MANDATORY - ALWAYS FIRST! v0.9.4+)

🚨 **CRITICAL**: Before ANY planning or execution, validate SpecWeave plugin installation.

**Why This Matters**:
- Ensures SpecWeave marketplace is registered in Claude Code
- Ensures core `specweave` plugin is installed
- Detects and suggests context-specific plugins based on your increment description
- Prevents cryptic "command not found" errors
- Enables seamless environment migration (local → VM → Cloud IDE)

**Implementation**:

Use the Bash tool to run:
```bash
npx specweave validate-plugins --auto-install --context="$(cat <<'EOF'
$USER_INCREMENT_DESCRIPTION
EOF
)"
```

**Replace `$USER_INCREMENT_DESCRIPTION`** with the actual increment description provided by the user.

**Expected Output (Success)**:
```
✅ All plugins validated!
   • Core plugin: installed (v0.9.4)
   • Context plugins: specweave-github (detected from "GitHub sync")
```

**Expected Output (Missing Components)**:
```
❌ Missing components detected:
   • SpecWeave marketplace not registered
   • Core plugin (specweave) not installed
   • Context plugin (specweave-github) not installed

📦 Installing missing components...
   ✅ Marketplace registered (.claude/settings.json)
   ✅ Core plugin installed (specweave)
   ✅ Context plugin installed (specweave-github)

🎉 Environment ready! Proceeding with increment planning...
```

**What to Do After Validation**:

1. ✅ **If validation passes**: Proceed to Step 0A
2. ⚠️ **If validation fails with errors**: Show error messages and STOP (do NOT proceed)
3. 🔄 **If auto-install succeeded**: Proceed to Step 0A
4. ⚠️ **If auto-install failed**: Show manual instructions (see below) and STOP

**Manual Installation Instructions** (if auto-install fails):
```
❌ Auto-install failed. Please install manually:

1. Register SpecWeave marketplace:
   Edit ~/.claude/settings.json and add:
   {
     "extraKnownMarketplaces": {
       "specweave": {
         "source": {
           "source": "github",
           "repo": "anton-abyzov/specweave",
           "path": ".claude-plugin"
         }
       }
     }
   }

2. Install core plugin:
   Run: /plugin install specweave

3. Restart Claude Code

4. Re-run this command
```

**DO NOT PROCEED** to Step 0A until plugin validation passes!

---

### Step 0A: STRICT Pre-Flight Check (MANDATORY - v0.6.0+)

**⛔ THE IRON RULE: Cannot start increment N+1 until increment N is DONE**

**THIS IS NOT NEGOTIABLE** - Enforce strict increment discipline!

```typescript
// Import increment status detector
import { IncrementStatusDetector } from '../core/increment-status';

// Check for incomplete increments
const detector = new IncrementStatusDetector();
const incomplete = await detector.getAllIncomplete();

if (incomplete.length > 0) {
  // ❌ BLOCK IMMEDIATELY - Show error and exit
  console.log(chalk.red.bold('\n❌ Cannot create new increment!\n'));

  console.log(chalk.yellow('Previous increments are incomplete:\n'));

  incomplete.forEach(status => {
    console.log(chalk.yellow(`📋 Increment ${status.id}`));
    console.log(`   Status: ${status.percentComplete}% complete (${status.completedTasks}/${status.totalTasks} tasks)`);

    if (status.pendingTasks.length <= 5) {
      console.log('   Pending:');
      status.pendingTasks.forEach(task => {
        console.log(`     - ${task.id}: ${task.title}`);
      });
    } else {
      console.log(`   Pending: ${status.pendingTasks.length} tasks`);
    }
    console.log('');
  });

  console.log(chalk.blue('💡 What would you like to do?\n'));
  console.log(chalk.white('1️⃣  Close incomplete increments:'));
  console.log(chalk.dim('   /specweave:close\n'));

  console.log(chalk.white('2️⃣  Check status:'));
  console.log(chalk.dim('   /specweave:status\n'));

  console.log(chalk.white('3️⃣  Force create (DANGEROUS - violates discipline!):'));
  console.log(chalk.dim('   Add --force flag to bypass this check\n'));

  console.log(chalk.yellow.bold('⚠️  The discipline exists for a reason:'));
  console.log(chalk.yellow('   - Prevents scope creep'));
  console.log(chalk.yellow('   - Ensures completions are tracked'));
  console.log(chalk.yellow('   - Maintains living docs accuracy'));
  console.log(chalk.yellow('   - Keeps work focused\n'));

  // Exit - do NOT proceed
  process.exit(1);
}
```

**Why This is Strict** (changed from v0.5.0):
- ❌ NO "suggest, don't force" - this IS forced
- ❌ NO options to defer - close previous first
- ❌ NO auto-closing gates - explicit closure required
- ✅ HARD BLOCK - cannot proceed without closing previous
- ✅ Clear next steps - use `/specweave:close`
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

// 1. Load config (defaults: maxActiveIncrements=1, hardCap=2, allowEmergencyInterrupt=true)
const config = ConfigManager.load();
const limits = config.limits || {
  maxActiveIncrements: 1,
  hardCap: 2,
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

// 4. HARD CAP ENFORCEMENT (never >2 active)
if (activeCount >= limits.hardCap) {
  console.log(chalk.red.bold('\n❌ HARD CAP REACHED\n'));
  console.log(chalk.red(`You have ${activeCount} active increments (absolute maximum: ${limits.hardCap})\n`));

  console.log(chalk.yellow('Active increments:'));
  active.forEach(inc => {
    console.log(chalk.dim(`  • ${inc.id} [${inc.type}]`));
  });

  console.log(chalk.blue('\n💡 You MUST complete or pause existing work first:\n'));
  console.log(chalk.white('1️⃣  Complete an increment:'));
  console.log(chalk.dim('   /specweave:done <id>\n'));
  console.log(chalk.white('2️⃣  Pause an increment:'));
  console.log(chalk.dim('   /specweave:pause <id> --reason="..."\n'));
  console.log(chalk.white('3️⃣  Check status:'));
  console.log(chalk.dim('   /specweave:status\n'));

  console.log(chalk.yellow('📝 Multiple hotfixes? Combine them into ONE increment!'));
  console.log(chalk.dim('   Example: 0009-security-fixes (SQL + XSS + CSRF)\n'));

  console.log(chalk.red.bold('⛔ This limit is enforced for your productivity.'));
  console.log(chalk.dim('Research: 3+ concurrent tasks = 40% slower + more bugs\n'));

  // NO force override at hard cap - absolute maximum
  process.exit(1);
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
      type: 'list',
      message: 'Choose an option:',
      choices: [
        { name: 'Complete current work', value: 'complete' },
        { name: 'Pause current work', value: 'pause' },
        { name: 'Start 2nd increment anyway', value: 'continue' }
      ]
    });

    if (choice === 'complete') {
      console.log(chalk.green('\n✅ Smart choice! Finish current work first.\n'));
      console.log(chalk.dim('Use /specweave:do to continue work\n'));
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
   /specweave:done <id>

2️⃣  Pause an increment:
   /specweave:pause <id> --reason="..."

3️⃣  Check status:
   /specweave:status

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

Use /specweave:do to continue work
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

### Step 1: Find next increment number

- Scan `.specweave/increments/` directory
- Find highest number (e.g., 002)
- Next increment: 003

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
     subagent_type: "pm",
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
     subagent_type: "architect",
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

**Run `/specweave:sync-docs update` to create initial documentation**:

```bash
/specweave:sync-docs update
```

This will:
- Create ADRs from architectural decisions in plan.md (status: Proposed)
- Add new features to `.specweave/docs/public/overview/features.md`
- Add architecture diagrams to `.specweave/docs/internal/architecture/diagrams/`
- Update infrastructure docs in `.specweave/docs/internal/operations/`
- Update security docs in `.specweave/docs/internal/security/`
- May prompt for conflict resolution if needed

**After `/specweave:sync-docs update` completes**:

```
✅ Strategic documentation synchronized!

Next steps:
1. Review the increment plan and strategic docs
2. Start implementation: /specweave:do 0003
3. (Optional) Sync to GitHub: /sync-github
    ```

## Frontmatter Format (spec.md):

**IMPORTANT**: Tech stack is AUTO-DETECTED from project files (package.json, requirements.txt, etc.), NOT hardcoded!

```yaml
---
increment: 003-user-authentication
title: "User Authentication System"
priority: P1
status: planned
created: 2025-10-26
dependencies: []
structure: user-stories

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
