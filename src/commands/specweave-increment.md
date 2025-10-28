---
name: specweave-increment
description: Plan new Product Increment - PM-led process (market research, spec, plan, auto-generate tasks). Auto-closes previous increment if PM gates pass.
---

# Plan Product Increment

**PM-Led Workflow**: From market research to ready-to-build increment.

You are helping the user create a new SpecWeave increment with automatic closure of previous increment if ready.

## Steps:

### Step 0: Smart Check Previous Increment (if applicable)

**🎯 CRITICAL: Suggest, don't force** - help user make informed decision!

1. **Check for in-progress increments**:
   ```bash
   # Find increments with status: in-progress
   grep -r "status: in-progress" .specweave/increments/*/spec.md
   ```

2. **If previous increment found, validate PM gates**:
   - **Gate 1**: All P1 tasks completed?
   - **Gate 2**: Tests passing (>80% coverage)?
   - **Gate 3**: Documentation updated (CLAUDE.md, README.md)?

3. **Decision matrix** (NEVER force, ALWAYS suggest):
   ```
   All gates ✅ → Auto-close previous, create new (seamless)

   Any gate ❌ → STOP and present options (user decides):
      Option A: Complete 0001 first (recommended)
         → Finish remaining work before starting new

      Option B: Move incomplete tasks to 0002
         → Transfer T006, T007 to new increment
         → Close 0001 as "completed with deferrals"

      Option C: Cancel new increment
         → Stay on 0001, continue working
         → User will retry /inc when ready
   ```

**CRITICAL**: NEVER auto-close with incomplete work! Always give user control.

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

### Step 1: Find next increment number

- Scan `.specweave/increments/` directory
- Find highest number (e.g., 002)
- Next increment: 003

### Step 2: Detect tech stack (CRITICAL - framework-agnostic)
   - Check `.specweave/config.yaml` for tech_stack configuration
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

### Step 4: Activate role-orchestrator

- Analyze user's description
- Determine which strategic agents are needed:
  - pm-agent (product strategy)?
  - architect-agent (system design)?
  - devops-agent (infrastructure)?
  - security-agent (security review)?
  - qa-lead-agent (testing strategy)?

### Step 5: Ask clarifying questions (if needed)

- Target users/scale?
- Technology preferences? (if not detected)
- Budget constraints?
- Deployment platform?
- Payment processing needed?
- Authentication method?

### Step 6: Run strategic agents (with user approval)

- **Pass detected tech stack to ALL agents** (CRITICAL!)
- PM agent creates pm-analysis.md
- Architect agent creates architecture.md, ADRs (using detected tech stack)
- DevOps agent creates infrastructure.md (platform-specific)
- Security agent creates security.md (framework-specific security)
- QA agent creates test-strategy.md (framework-specific tests)

### Step 7: Present strategic docs for review

- Show summary of all strategic outputs
- Ask: "Review docs with /sync-docs or approve to continue?"
- Wait for user approval

### Step 8: Create spec.md (based on strategic docs)
   - Frontmatter with increment number, title, priority, status, dependencies
   - **Include detected tech stack in frontmatter** (see format below)
   - Overview section
   - Business value
   - User stories with acceptance tests
   - Functional requirements
   - Out of scope
   - Success criteria
   - Dependencies

### Step 9: Create tasks.md (task-builder skill)

**🎯 CRITICAL: Auto-generate tasks from plan.md**

- Analyze all strategic docs
- Break down into phases (framework-specific)
- Create tasks with:
  - Agent references (use framework-specific agents if available)
  - File paths (framework-specific paths: src/ for TS, app/ for Django, etc.)
  - Implementation snippets (framework-specific code)
  - Acceptance criteria
  - Documentation updates

### Step 10: Save increment

- Create `.specweave/increments/####-name/`
- Save spec.md
- Save tasks.md (auto-generated!)
- Save strategic docs (pm-analysis.md, architecture.md, etc.)

### Step 11: Output to user
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

       Next steps:
       1. Review docs: /sync-docs
       2. Start implementation: Begin with Task T001 in tasks.md
       3. Sync to GitHub: /sync-github
    ```

## Frontmatter Format (spec.md):

**IMPORTANT**: Tech stack is DETECTED from `.specweave/config.yaml` or project files, NOT hardcoded!

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
  detected_from: ".specweave/config.yaml"  # or "package.json", "requirements.txt", etc.
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
