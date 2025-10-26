---
name: create-increment
description: Create a new SpecWeave increment interactively with spec.md and tasks.md
---

# Create New Increment

You are helping the user create a new SpecWeave increment.

## Steps:

1. **Find next increment number**:
   - Scan `.specweave/increments/` directory
   - Find highest number (e.g., 002)
   - Next increment: 003

2. **Detect tech stack** (CRITICAL - framework-agnostic):
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

3. **Ask user for details**:
   - "What would you like to build?" (get high-level description)
   - "What's the short name?" (e.g., "user-authentication" for increment 003-user-authentication)
   - "Priority? (P1/P2/P3)" (default: P1)

4. **Activate role-orchestrator**:
   - Analyze user's description
   - Determine which strategic agents are needed:
     - pm-agent (product strategy)?
     - architect-agent (system design)?
     - devops-agent (infrastructure)?
     - security-agent (security review)?
     - qa-lead-agent (testing strategy)?

5. **Ask clarifying questions** (if needed):
   - Target users/scale?
   - Technology preferences? (if not detected)
   - Budget constraints?
   - Deployment platform?
   - Payment processing needed?
   - Authentication method?

6. **Run strategic agents** (with user approval):
   - **Pass detected tech stack to ALL agents** (CRITICAL!)
   - PM agent creates pm-analysis.md
   - Architect agent creates architecture.md, ADRs (using detected tech stack)
   - DevOps agent creates infrastructure.md (platform-specific)
   - Security agent creates security.md (framework-specific security)
   - QA agent creates test-strategy.md (framework-specific tests)

7. **Present strategic docs for review**:
   - Show summary of all strategic outputs
   - Ask: "Review docs with /review-docs or approve to continue?"
   - Wait for user approval

8. **Create spec.md** (based on strategic docs):
   - Frontmatter with increment number, title, priority, status, dependencies
   - **Include detected tech stack in frontmatter** (see format below)
   - Overview section
   - Business value
   - User stories with acceptance tests
   - Functional requirements
   - Out of scope
   - Success criteria
   - Dependencies

9. **Create tasks.md** (task-builder skill):
   - Analyze all strategic docs
   - Break down into phases (framework-specific)
   - Create tasks with:
     - Agent references (use framework-specific agents if available)
     - File paths (framework-specific paths: src/ for TS, app/ for Django, etc.)
     - Implementation snippets (framework-specific code)
     - Acceptance criteria
     - Documentation updates

10. **Save increment**:
    - Create `.specweave/increments/####-name/`
    - Save spec.md
    - Save tasks.md
    - Save strategic docs (pm-analysis.md, architecture.md, etc.)

11. **Output to user**:
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
       1. Review docs: /review-docs
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

- If `.specweave/` not found: "Error: Not a SpecWeave project. Run /create-project first."
- If user description too vague: Ask more clarifying questions
- If strategic agents not available: "Warning: Some agents missing. Continue with basic spec?"

---

**Important**: This is the main entry point for creating new work in SpecWeave.
