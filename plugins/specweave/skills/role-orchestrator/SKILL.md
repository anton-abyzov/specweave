---
name: role-orchestrator
description: Multi-agent orchestration system that coordinates specialized agents (PM, Architect, DevOps, QA, Tech Lead, Security) to work together on complex tasks. Implements hierarchical orchestrator-worker pattern. Activates for complex multi-step requests requiring multiple roles/skills. Keywords: build product, create SaaS, full implementation, end-to-end, multi-agent, orchestrate, coordinate roles, complex project.
---

# Role Orchestrator - Multi-Agent Coordination

**Self-contained orchestration that works in ANY user project after `specweave init`.**

---

## Purpose

Coordinate multiple specialized agents for complex, multi-step tasks through intelligent decomposition and role assignment.

**Architecture**: Hierarchical Orchestrator-Worker Pattern
```
User Request → Orchestrator → PM → Architect → Tech Lead → Implement → QA → Deploy
```

---

## When to Activate

Activates for requests requiring **3+ agents** or **full product development**:

| User Says | Agents Needed | Pattern |
|-----------|---------------|---------|
| "Build a SaaS for X" | PM → Architect → Tech Lead → Implement → QA → DevOps | Sequential |
| "Create real-time chat" | Architect → Backend + Frontend (parallel) → QA | Parallel |
| "Secure authentication" | Security → Tech Lead → Backend → QA | Sequential |
| "Optimize performance" | Tech Lead → Performance → Backend → DevOps | Iterative |

---

## Agent Roles

### Strategic Layer

**PM Agent (pm-agent)**
- Product strategy, user stories, prioritization
- **When**: Starting new products/features

**Architect Agent (architect-agent)**
- System design, ADRs, technology stack
- **When**: Designing systems or major features

### Execution Layer

**Tech Lead Agent (tech-lead-agent)**
- Technical planning, code review, quality standards
- **When**: Complex technical decisions

**Backend Agents**
- nodejs-backend, python-backend, dotnet-backend
- **When**: Server-side implementation

**Frontend Agent (frontend-agent)**
- React/Next.js, UI/UX implementation
- **When**: Building user interfaces

### Quality & Operations Layer

**QA Lead Agent (qa-lead-agent)**
- Test strategy, quality assurance, coverage
- **When**: Defining testing approach

**Security Agent (security-agent)**
- Security architecture, threat modeling, compliance
- **When**: Security-critical features

**DevOps Agent (devops-agent)**
- Infrastructure, CI/CD, deployment, monitoring
- **When**: Operations tasks

---

## CRITICAL: Safe Orchestration Pattern

**Rule**: Orchestrator creates structure, guides user to invoke agents in MAIN context (NOT nested spawning).

### Phase 0: Create Increment Structure FIRST

Before invoking ANY agents, create increment folder:

```typescript
// 1. Parse user request
const projectName = extractProjectName(userRequest);
// "event management" → "event-management"

// 2. Get next number
const nextNumber = getNextIncrementNumber();
// e.g., 0001, 0002, 0003

// 3. Create structure
const incrementPath = `.specweave/increments/${nextNumber}-${projectName}/`;
mkdir -p ${incrementPath}
mkdir -p ${incrementPath}logs/
mkdir -p ${incrementPath}scripts/
mkdir -p ${incrementPath}reports/

// 4. Create placeholder files (ORDER MATTERS!)
// metadata.json MUST be created FIRST (metadata-json-guard.sh blocks spec.md otherwise)
write ${incrementPath}metadata.json (MANDATORY - CREATE FIRST!)
write ${incrementPath}spec.md (basic template)
write ${incrementPath}plan.md (basic template)
write ${incrementPath}tasks.md (basic template)
```

**metadata.json template** (CREATE FIRST!):
```json
{
  "id": "0001-project-name",
  "status": "planned",
  "type": "feature",
  "priority": "P1",
  "created": "2025-11-24T12:00:00Z",
  "lastActivity": "2025-11-24T12:00:00Z"
}
```

**spec.md template** (create AFTER metadata.json):
```yaml
---
increment: 0001-project-name
title: "Project Name"
type: feature
priority: P1
status: planned
created: 2025-11-24
---

# Project Name

## Overview
(To be filled by PM Agent)

## User Stories
(To be filled by PM Agent)
```

### Phase 1: Guide User Through Agent Workflow

**Output this workflow to user**:

```
✅ Increment structure created: .specweave/increments/0001-project-name/

🎯 Complete workflow (run these commands in MAIN conversation):

STEP 1: Product Strategy & Requirements
Tell Claude: "Complete the spec for increment 0001-project-name"
(PM agent will activate automatically)

STEP 2: Architecture & Design
Tell Claude: "Design architecture for increment 0001-project-name"
(Architect agent will create ADRs and system design)

STEP 3: Technical Planning
Tell Claude: "Create technical plan for increment 0001-project-name"
(Tech Lead agent will create implementation approach)

STEP 4: Implementation Tasks
Tell Claude: "Create tasks for increment 0001-project-name"
(Test-aware planner will generate tasks with tests)

STEP 5: Security Review (if needed)
Tell Claude: "Review security for increment 0001-project-name"
(Security agent will perform threat modeling)

STEP 6: Implementation
Tell Claude: "Implement increment 0001-project-name"
(Backend/Frontend agents will implement code)

STEP 7: Quality Assurance
Tell Claude: "Run QA for increment 0001-project-name"
(QA agent will verify tests and coverage)

STEP 8: Deployment Planning
Tell Claude: "Plan deployment for increment 0001-project-name"
(DevOps agent will create infrastructure)

⚠️  Run these sequentially in MAIN conversation to prevent context explosion!
```

**DO NOT spawn all agents from this skill using Task() tool!**

---

## Orchestration Patterns

### Pattern 1: Sequential (Default)

**When**: Dependencies between steps
```
PM → Architect → Tech Lead → Backend → Frontend → QA → DevOps
```

**User workflow**:
1. Create increment structure
2. Guide user to invoke agents one by one
3. Each agent completes before next starts
4. User tracks progress

### Pattern 2: Parallel Execution

**When**: Independent work streams
```
PM + Architect (parallel)
    ↓
Backend + Frontend (parallel)
    ↓
QA + DevOps (parallel)
```

**User workflow**:
1. Create increment structure
2. Identify parallel opportunities
3. Guide user: "You can run these in parallel: [list]"
4. User invokes agents concurrently

### Pattern 3: Adaptive (Context-Aware)

**When**: Requirements discovered during execution
```
PM → Architect → [Discover need] → Security → Tech Lead → ...
```

**User workflow**:
1. Start with basic plan
2. Agent discovers additional needs
3. Inject new agents mid-workflow
4. Adjust plan dynamically

---

## Quality Gates (Checkpoints)

### Gate 1: After PM (Requirements Complete)
**Check**:
- [ ] User stories defined with AC-IDs
- [ ] Success criteria measurable
- [ ] Dependencies identified
- [ ] Out of scope defined

**Decision**: Proceed to architecture OR refine requirements

### Gate 2: After Architect (Design Complete)
**Check**:
- [ ] System design documented
- [ ] ADRs created (≥3)
- [ ] Technology stack chosen
- [ ] Data model defined

**Decision**: Proceed to implementation OR redesign

### Gate 3: After Implementation (Code Complete)
**Check**:
- [ ] All P1 tasks completed
- [ ] Tests passing (≥80% coverage)
- [ ] Code reviewed
- [ ] Documentation updated

**Decision**: Proceed to deployment OR fix issues

### Gate 4: Before Deployment (Production Ready)
**Check**:
- [ ] Security review passed
- [ ] Performance acceptable
- [ ] Monitoring configured
- [ ] Rollback plan exists

**Decision**: Deploy OR address blockers

---

## Error Handling

### Agent Failure
```
If agent fails:
1. Capture error details
2. Retry with backoff (max 3 attempts)
3. Try fallback agent if available
4. If critical: pause and notify user
5. NEVER fail silently
```

### Graceful Degradation
```
If PM fails → Use basic template
If Architect fails → Tech Lead creates simple design
If Backend fails → Create manual implementation guide
If DevOps fails → Create manual deployment steps
```

### User Intervention
```
If orchestrator stuck:
1. Show current state
2. Present options to user
3. Let user decide next step
4. Resume from checkpoint
```

---

## Progress Tracking

### Real-Time Updates

Show user current phase and progress:
```
🚀 Building SaaS for Event Management

Progress: 3/8 phases complete (37.5%)

✅ Phase 1: Requirements (PM) - COMPLETE
✅ Phase 2: Architecture (Architect) - COMPLETE
✅ Phase 3: Technical Planning (Tech Lead) - COMPLETE
🔄 Phase 4: Implementation (Backend + Frontend) - IN PROGRESS
⏳ Phase 5: QA - PENDING
⏳ Phase 6: Security Review - PENDING
⏳ Phase 7: DevOps - PENDING
⏳ Phase 8: Deployment - PENDING

Current: Backend implementing user authentication (T-015/45)
```

---

## Example Workflows

### Example 1: Build SaaS Product

**User request**: "Build a SaaS for event management"

**Orchestrator response**:
```
🎯 Creating increment for Event Management SaaS

Created: .specweave/increments/0001-event-management/

📋 8-Phase Workflow:

Phase 1: Requirements & Strategy
Tell Claude: "Complete spec for increment 0001"
→ PM will define user stories, features, success criteria

Phase 2: System Architecture
Tell Claude: "Design architecture for increment 0001"
→ Architect will create system design and ADRs

Phase 3: Technical Planning
Tell Claude: "Create technical plan for increment 0001"
→ Tech Lead will plan implementation approach

Phase 4: Test Strategy
Tell Claude: "Create test strategy for increment 0001"
→ QA Lead will define testing approach

Phase 5: Backend Implementation
Tell Claude: "Implement backend for increment 0001"
→ Backend agent will build APIs and services

Phase 6: Frontend Implementation
Tell Claude: "Implement frontend for increment 0001"
→ Frontend agent will build UI

Phase 7: Security Review
Tell Claude: "Review security for increment 0001"
→ Security agent will validate security

Phase 8: Deployment Setup
Tell Claude: "Setup deployment for increment 0001"
→ DevOps agent will create infrastructure

Start with Phase 1!
```

### Example 2: Critical Hotfix

**User request**: "Fix critical security vulnerability CVE-2024-1234"

**Orchestrator response**:
```
🚨 CRITICAL HOTFIX WORKFLOW

Created: .specweave/increments/0016-security-fix-cve-2024-1234/
Type: hotfix (expedited workflow)

⚡ 4-Phase Fast Track:

Phase 1: Security Assessment (5 min)
Tell Claude: "Assess security vulnerability for increment 0016"

Phase 2: Fix Implementation (15 min)
Tell Claude: "Implement security fix for increment 0016"

Phase 3: Validation (10 min)
Tell Claude: "Validate security fix for increment 0016"

Phase 4: Emergency Deploy (5 min)
Tell Claude: "Deploy hotfix for increment 0016"

Total estimated time: 35 minutes
```

---

## Best Practices

**✅ DO**:
- Create increment structure FIRST
- Guide user through sequential workflow
- Use quality gates between phases
- Track progress and show user updates
- Handle errors gracefully with retry
- Allow user to skip optional phases

**❌ DON'T**:
- Spawn all agents at once (context explosion)
- Skip increment creation
- Proceed without quality gate checks
- Fail silently on agent errors
- Assume agents are infallible
- Block user from manual intervention

---

## Integration with SpecWeave Commands

**After orchestration complete**:

```bash
# Check status
/sw:status

# Sync to external tools
/sw:sync-progress 0001

# Validate quality
/sw:qa 0001

# Close increment
/sw:done 0001
```

---

**This skill is self-contained and works in ANY user project after `specweave init`.**
