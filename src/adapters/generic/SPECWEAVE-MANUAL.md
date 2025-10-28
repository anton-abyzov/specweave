# SpecWeave Manual Workflow Guide

**For**: ChatGPT, Claude web, Gemini, or ANY AI tool
**Automation**: Manual (you orchestrate each step)
**Compatibility**: 100% (works with literally any AI)

---

## What is "Manual" Workflow?

**Manual = You Orchestrate, AI Executes**

You follow this guide step-by-step:
1. Read instructions
2. Copy templates/prompts
3. Paste to your AI tool (ChatGPT, Gemini, etc.)
4. Copy AI's response
5. Save to files manually

**Benefits**:
- ✅ Works with ANY AI tool
- ✅ No tool lock-in
- ✅ Complete control over each step

**Trade-off**:
- ⚠️ Slower than automated adapters (Claude Code, Cursor)
- ⚠️ More manual steps

---

## Quick Reference Card

**Creating a Feature** (Typical Workflow):

```
1. mkdir -p .specweave/increments/####-feature-name
2. Copy spec.md template → Paste to AI → Save response to spec.md
3. Copy plan.md template → Paste to AI → Save response to plan.md
4. Copy tasks.md template → Paste to AI → Save response to tasks.md
5. Copy context-manifest template → Fill manually → Save

Total time: 30-60 minutes per feature (vs 5 minutes with Claude Code)
```

---

## Step-by-Step: Creating Your First Feature

### Step 1: Create Increment Folder

**You do this** (in your terminal):

```bash
# List existing increments to find next number
ls .specweave/increments/

# Create new increment (auto-increment number)
mkdir -p .specweave/increments/0001-user-authentication
cd .specweave/increments/0001-user-authentication
```

**Result**: Empty folder ready for files

---

### Step 2: Create spec.md (WHAT & WHY)

**Purpose**: Define business requirements (technology-agnostic)

#### Template to Copy

Copy this **ENTIRE prompt** and paste to your AI (ChatGPT, Claude, Gemini, etc.):

```
I'm using SpecWeave framework. Create spec.md for [FEATURE NAME] feature.

Use this exact structure:

---
increment: ####-feature-name
title: "[Feature Title]"
priority: P1
status: planned
created: 2025-10-27
---

# Increment ####: [Feature Name]

## Overview

**Problem**: [What problem does this solve?]

**Solution**: [High-level solution approach]

**Key Insight**: [Any important insight]

## User Stories

### US-001: [User Story Title]

**As a** [role]
**I want to** [action]
**So that** [benefit]

**Acceptance Criteria**:
- [ ] **TC-0001**: [Testable condition - WHAT must be true]
- [ ] **TC-0002**: [Another testable condition]

[Add 3-5 user stories, each with 2-5 acceptance criteria]

## Functional Requirements

### FR-001: [Requirement Title]
**Description**: [WHAT must the system do - technology-agnostic]

[Add 5-10 functional requirements]

## Non-Functional Requirements

### NFR-001: [Requirement Title]
**Description**: [Performance, security, scalability requirement]

[Add 3-5 non-functional requirements]

## Success Criteria

### SC-001: [Success Metric]
**Metric**: [What to measure]
**Target**: [Specific goal]
**Verification**: [How to validate]

[Add 3-5 success criteria]

---

IMPORTANT:
- Technology-agnostic (WHAT and WHY, not HOW)
- No technical implementation details (those go in plan.md)
- Test case IDs: TC-0001, TC-0002 format
- User stories: US-001, US-002 format

My feature requirements:
[DESCRIBE YOUR FEATURE HERE - BE DETAILED]

Example: "User authentication system with email/password login, Google OAuth, password reset flow, JWT tokens, and session management."
```

#### What the AI Will Do

The AI will generate a complete spec.md following SpecWeave patterns.

#### What You Do Next

1. **Copy the AI's response**
2. **Save to file**: `spec.md`
3. **Verify**: Check that it has YAML frontmatter, user stories, acceptance criteria

---

### Step 3: Create plan.md (HOW)

**Purpose**: Define technical implementation

#### Template to Copy

Copy this prompt to your AI:

```
Based on this spec.md:

[PASTE THE ENTIRE spec.md CONTENT HERE]

Create plan.md with technical implementation details.

Use this structure:

# Technical Plan: [Feature Name]

## Architecture

### System Overview
[High-level architecture description]

### Components
| Component | Responsibility | Technology |
|-----------|----------------|------------|
| [Name] | [What it does] | [Tech stack] |

### Data Model
[Database schema, entities, relationships]

Example:
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### API Contracts
[Endpoints, request/response formats]

Example:
- POST /api/auth/login
  Request: { email, password }
  Response: { token, user }

## Implementation Strategy

### Phase 1: [Phase Name]
[Step-by-step approach]

### Phase 2: [Phase Name]
[Step-by-step approach]

## Architecture Decision Records (ADRs)

### ADR-0001: [Decision Title]
**Status**: Accepted
**Context**: [Why this decision is needed]
**Decision**: [What we decided]
**Consequences**: [Trade-offs]

## Security Considerations
[Authentication, authorization, data protection]

## Performance Considerations
[Caching, optimization strategies]

## Error Handling
[How errors are handled]

---

IMPORTANT:
- Technology-specific (HOW with technical details)
- Reference ADRs
- Include diagrams if needed (Mermaid format)
```

#### What You Do Next

1. **Copy AI's response**
2. **Save to file**: `plan.md`
3. **Verify**: Check architecture, data model, API contracts included

---

### Step 4: Create tasks.md (Implementation Checklist)

#### Template to Copy

Copy this prompt to your AI:

```
Based on this plan.md:

[PASTE THE ENTIRE plan.md CONTENT HERE]

Create tasks.md with implementation checklist.

Use this structure:

---
increment: ####-feature-name
total_tasks: [count]
completed_tasks: 0
completion_rate: 0
---

# Implementation Tasks: [Feature Name]

## Phase 1: [Phase Name] (P1) - Day 1

### T001: [Task Description]
- [ ] Subtask 1
- [ ] Subtask 2
- [ ] Subtask 3

**Estimated**: [hours/days]
**Dependencies**: None

### T002: [Task Description]
- [ ] Subtask 1
- [ ] Subtask 2

**Estimated**: [hours/days]
**Dependencies**: T001

[Continue with all phases]

---

## Priorities

**P1 (MUST HAVE)**:
- T001-T005: [Description]

**P2 (SHOULD HAVE)**:
- T006-T010: [Description]

**P3 (NICE TO HAVE)**:
- T011+: [Description]

---

IMPORTANT:
- Each task < 1 day (break down larger tasks)
- Use checkboxes: - [ ] for tracking
- Task IDs: T001, T002, T003 format
- List dependencies explicitly
```

#### What You Do Next

1. **Copy AI's response**
2. **Save to file**: `tasks.md`
3. **Verify**: Tasks are < 1 day, dependencies listed

---

### Step 5: Create context-manifest.yaml (CRITICAL)

**Purpose**: Load ONLY relevant files (70%+ token savings)

#### Manual Template (Fill This In)

Create file `context-manifest.yaml`:

```yaml
---
# Context Manifest: Load ONLY These Files

increment: ####-feature-name
created: 2025-10-27

spec_sections:
  # List ONLY relevant strategy docs (not all!)
  - .specweave/docs/internal/strategy/[module]/spec.md
  - .specweave/docs/internal/strategy/[module]/requirements.md

documentation:
  # List ONLY relevant architecture docs
  - .specweave/docs/internal/architecture/[module]/design.md
  - .specweave/docs/internal/architecture/adr/0001-[decision].md

max_context_tokens: 10000
priority: high
auto_refresh: false

---
```

**How to Fill**:
1. Look at your feature (e.g., authentication)
2. List ONLY docs related to that module
3. Don't list entire .specweave/docs/ folder!

**Why Important**:
- Full docs: 500 pages (50k tokens)
- Manifest docs: 50 pages (5k tokens)
- **Savings: 90% = 45k tokens!**

---

### Step 6: Verify Structure

Check that you have:

```
.specweave/increments/0001-user-authentication/
├── spec.md                 ✅
├── plan.md                 ✅
├── tasks.md                ✅
└── context-manifest.yaml   ✅
```

**Done!** You've created a complete SpecWeave increment manually.

---

## Using Context Manifests (Token Savings)

### Why Context Manifests Matter

**Problem**:
- Your specs might be 500+ pages total
- Loading all of them = 50k tokens
- Most aren't relevant to current feature

**Solution**:
- context-manifest.yaml lists ONLY relevant files
- Load only 50 pages = 5k tokens
- **Savings: 90%!**

### How to Use with Your AI

**When implementing a feature**:

1. **Open context-manifest.yaml**
2. **See which files are relevant**:
   ```yaml
   spec_sections:
     - .specweave/docs/internal/strategy/auth/spec.md
   documentation:
     - .specweave/docs/internal/architecture/auth/design.md
   ```
3. **Load ONLY those 2 files** (not entire docs/ folder)
4. **Paste to your AI** with this prompt:
   ```
   I'm implementing authentication feature.
   Here's the relevant context (from context-manifest.yaml):

   [Paste auth/spec.md content]
   [Paste auth/design.md content]

   Now help me implement [specific task].
   ```

**Result**: AI has relevant context without token waste!

---

## Working with ANY AI Tool

### ChatGPT (web)

**Pros**:
- ✅ Easy to use
- ✅ Great for generating content

**Cons**:
- ❌ No file system access (must copy-paste)
- ❌ Limited context window (use manifests!)

**Workflow**:
1. Copy template from this manual
2. Paste to ChatGPT
3. Copy response
4. Save to file manually

### Claude (web)

**Pros**:
- ✅ Large context window (200k tokens)
- ✅ Good at following structured formats

**Cons**:
- ❌ No file system access (must copy-paste)

**Workflow**: Same as ChatGPT

### Gemini

**Pros**:
- ✅ Very large context (2M tokens!)
- ✅ Can handle large specs

**Cons**:
- ❌ No file system access

**Workflow**: Same as ChatGPT, but can paste more context

### Perplexity, You.com, etc.

**Pros**:
- ✅ Web search capabilities
- ✅ Can find references

**Cons**:
- ❌ No file system access

**Workflow**: Same as ChatGPT

---

## Simulating Skills Manually

### What are Skills?

**In Claude Code**: Auto-activating capabilities
**In Manual Workflow**: YOU follow skill workflows manually

### Example: increment-planner Skill

**Claude Code (automatic)**:
```
User: "create increment for auth"
→ increment-planner skill activates automatically
→ Creates spec, plan, tasks, manifest
```

**Manual Workflow (you)**:
```
You: Read this manual
You: Follow Step 1 (create folder)
You: Follow Step 2 (create spec.md using AI)
You: Follow Step 3 (create plan.md using AI)
You: Follow Step 4 (create tasks.md using AI)
You: Follow Step 5 (create manifest manually)
```

You manually execute the workflow that increment-planner does automatically!

---

## Simulating Agents Manually

### What are Agents?

**In Claude Code**: Specialized roles (PM, Architect, DevOps, etc.)
**In Manual Workflow**: YOU tell AI which role to adopt

### Example: PM Agent

**Claude Code (automatic)**:
```typescript
Task({ subagent_type: "pm", prompt: "create spec" })
→ PM agent creates spec.md
```

**Manual Workflow (you)**:
```
You paste to AI:
"Act as Product Manager and create spec.md.

As PM, focus on:
- WHAT and WHY (not HOW)
- Technology-agnostic requirements
- User stories with acceptance criteria

[Paste requirements]"
```

You tell AI to adopt PM perspective!

### All Agent Roles You Can Use

| Role | When to Use | Focus |
|------|-------------|-------|
| **PM** | Creating specs | WHAT/WHY, user stories |
| **Architect** | Creating plans | HOW, technical design |
| **DevOps** | Infrastructure | Deployment, monitoring |
| **QA Lead** | Testing | Test strategy, coverage |
| **Security** | Security review | Threats, vulnerabilities |

**Prompt Template**:
```
Act as [ROLE] and [ACTION].

As [ROLE], focus on:
- [Key responsibility 1]
- [Key responsibility 2]

[Context/requirements]
```

---

## Tips for Success

### 1. Use Context Manifests Always
Don't paste entire 500-page specs → Use manifests to list relevant 50 pages

### 2. Be Explicit About Roles
"Act as PM" or "Act as Architect" → AI understands perspective

### 3. Copy Exact Templates
This manual has tested templates → Use them as-is for best results

### 4. Iterate
First pass might not be perfect → Ask AI to refine/improve

### 5. Save Frequently
Don't lose AI responses → Copy and save immediately

### 6. Reference SPECWEAVE.md
For complete technical documentation, see SPECWEAVE.md in project root

---

## Common Workflows

### Creating a Feature (Complete)

Total time: 30-60 minutes

1. ✅ Create folder (1 min)
2. ✅ Create spec.md (10 min - AI generation + review)
3. ✅ Create plan.md (15 min - AI generation + review)
4. ✅ Create tasks.md (10 min - AI generation + review)
5. ✅ Create context-manifest (5 min - manual)

### Implementing a Task

1. ✅ Read context-manifest.yaml
2. ✅ Load ONLY listed files
3. ✅ Paste to AI with implementation request
4. ✅ Copy AI's code
5. ✅ Save to files
6. ✅ Test
7. ✅ Update tasks.md (mark checkbox complete)

### Updating Documentation

1. ✅ Change code
2. ✅ Ask AI: "Update spec.md to reflect this change"
3. ✅ Review AI's update
4. ✅ Save updated spec.md

(In Claude Code, this happens automatically via hooks!)

---

## Comparison: Manual vs Automated

| Task | Claude Code | Manual (This Adapter) |
|------|-------------|-----------------------|
| **Create increment** | 30 seconds | 30-60 minutes |
| **Load context** | Automatic | Manual (copy files) |
| **Update docs** | Automatic (hooks) | Manual (ask AI) |
| **Skills activate** | Automatic | Manual (follow guide) |
| **Agents** | Separate context | Manual (tell AI role) |

**Manual = 10-20x slower**, but **works with ANY AI!**

---

## When to Upgrade

**Consider upgrading to automated adapters if**:

✅ **To Claude Code (full automation)** - If you can use Claude Code
- 10-20x faster
- Skills auto-activate
- Agents with separate context
- Hooks auto-update docs

✅ **To Cursor (semi-automation)** - If you use Cursor editor
- 5-10x faster
- .cursorrules guide workflows
- @ context shortcuts
- Composer multi-file editing

✅ **To Copilot (basic automation)** - If you use VS Code + Copilot
- 2-3x faster
- Better code suggestions
- Workspace instructions

**Stay with Generic if**:
- You prefer ChatGPT/Claude web/Gemini
- You want maximum tool flexibility
- You don't mind manual workflows
- Simple projects (few increments)

---

## Need Help?

**Stuck? Reference these**:
1. **This file** (SPECWEAVE-MANUAL.md) - Manual workflow
2. **SPECWEAVE.md** (project root) - Complete technical documentation
3. **.specweave/docs/** - Project documentation

**Ask your AI**:
"I'm using SpecWeave with generic adapter. How do I [task]?"

The AI can read this manual and help you!

---

**Good luck building with SpecWeave! 🚀**

Remember: Manual = Slower, but 100% compatible with ANY AI tool!
