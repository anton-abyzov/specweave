---
name: specweave-detector
description: MANDATORY entry point for SpecWeave framework. Activates when .specweave/ exists OR when user mentions "SpecWeave", "increment", "feature", "/create-increment". All 10 agents and 35+ skills are PRE-INSTALLED during init - no auto-installation needed. Routes requests to increment-planner, skill-router, or appropriate agents. Keywords SpecWeave, spec-driven, increment, feature, spec, plan, task, create feature, build feature, new increment.
proactive: true
---

# SpecWeave Detector & Entry Point

This skill is the **MANDATORY entry point** for all SpecWeave operations. When Claude Code detects a `.specweave/config.yaml` file OR user mentions SpecWeave-related keywords, this skill MUST activate and orchestrate the framework.

## Purpose

Act as the "factory of agents" that:
1. **Detects SpecWeave projects automatically** (when .specweave/ exists)
2. **Parses user requests** and determines intent
3. **Routes to appropriate skills/agents** (all pre-installed!)
4. **Orchestrates nested skill calls** for complex operations
5. **Manages context loading** via context-loader skill

## Detection Logic (0.1.5 - Pre-Installation)

```javascript
// Pseudo-code for detection
if (fileExists('.specweave/config.yaml')) {
  // ACTIVATE SPECWEAVE MODE
  activateSpecWeaveMode();
  loadConfiguration();

  // ALL COMPONENTS ALREADY INSTALLED!
  // ✅ 10 agents in .claude/agents/
  // ✅ 35+ skills in .claude/skills/
  // ✅ 10 commands in .claude/commands/

  // NO AUTO-INSTALLATION NEEDED (pre-installed in 0.1.5)

  parseUserIntent();
  routeToSkills();
}
```

## Pre-Installed Components (0.1.5+)

**IMPORTANT**: SpecWeave 0.1.5+ uses **pre-installation** instead of auto-installation.

After `specweave init`, ALL components are ready:
- ✅ **10 agents**: PM, Architect, Security, QA Lead, DevOps, Tech Lead, SRE, Docs Writer, Performance, Diagrams Architect
- ✅ **35+ skills**: Technology stacks, integrations, utilities
- ✅ **10 slash commands**: /create-increment, /validate-increment, etc.

**No installation wait time** - components activate immediately!

### How It Works (0.1.5+)

1. **User makes a request** (e.g., "Create Next.js authentication")
2. **SpecWeave detector activates** (all components already installed!)
3. **Analyze user intent**:
   - "Create" → Route to increment-planner skill
   - "Next.js" → Will use nextjs skill (already installed)
   - "authentication" → Will involve security agent (already installed)
4. **Route to increment-planner**:
   - Creates increment folder
   - Generates spec.md, plan.md, tasks.md, tests.md
   - Coordinates with PM agent → Architect agent
5. **Implementation ready** - All skills/agents available immediately

### Example User Experience (0.1.5+)

**Example 1: Next.js Authentication**
```
User: "Create Next.js authentication with OAuth"

🔷 SpecWeave Active

🚀 Creating increment 0001-nextjs-authentication...
   📝 Using nextjs skill (already installed!)
   🤖 PM agent creating requirements...
   🏗️  Architect agent designing system...

✅ Increment created: .specweave/increments/0001-nextjs-authentication/
✅ Files: spec.md, plan.md, tasks.md, tests.md
```

**Example 2: Real Estate Platform**
```
User: "Build a real estate listing platform with Node.js/Express"

🔷 SpecWeave Active

🚀 Creating increment 0001-real-estate-platform...
   📝 Using nodejs-backend skill (already installed!)
   🤖 PM agent creating requirements...
   🏗️  Architect agent designing system...
   🛡️  Security agent reviewing authentication...

✅ Increment created with complete specifications
```

**Example 3: Python FastAPI**
```
User: "Create FastAPI backend with PostgreSQL"

🔷 SpecWeave Active

🚀 Creating increment 0001-fastapi-backend...
   📝 Using python-backend skill (already installed!)
   🤖 PM agent creating requirements...
   🏗️  Architect agent designing system...

✅ Increment created: .specweave/increments/0001-fastapi-backend/
```

### Benefits of Pre-Installation (0.1.5+)

- ✅ **Zero wait time** - all components ready immediately
- ✅ **No installation confusion** - everything works out of the box
- ✅ **Predictable** - same components every time
- ✅ **Simple mental model** - init once, use forever
- ✅ **Offline-friendly** - all components local after init

## Auto-Activation

**Key Feature**: This skill uses Claude Code's `proactive: true` feature to load automatically.

When a user opens a project with `.specweave/` directory:
1. Claude Code detects the directory
2. This skill loads proactively (no user action needed)
3. SpecWeave mode activates silently
4. User requests are automatically routed to appropriate skills

**User Experience**:
```
# User doesn't know SpecWeave is active
User: "I want to add payment processing"

# Behind the scenes:
# 1. specweave-detector intercepts request
# 2. Parses request: "add feature" + "payment processing"
# 3. Routes to: increment-planner skill
# 4. increment-planner creates Increment 0002
# 5. Returns result to user

# User sees:
✅ Increment created: .specweave/increments/0002-payment-processing/
```

## Request Parsing & Routing

### Simple Request (Single Skill)

| User Says | Request Type | Route To |
|-----------|--------|----------|
| "Plan a feature for..." | feature_planning | `increment-planner` |
| "Load context for..." | context_loading | `context-loader` |
| "Document this code..." | documentation | `docs-updater` |
| "Create a spec for..." | specification | `spec-author` |
| "Design architecture for..." | architecture | `architect` |
| "Implement feature 001" | development | `developer` |
| "Test this feature" | testing | `qa-engineer` |

### Complex Request (Multiple Skills)

**Example**: "Create and implement a new payment feature"

**Request Breakdown**:
1. Create increment → `increment-planner`
2. Load context → `context-loader`
3. Implement code → Coordinate with appropriate agents/skills
4. Generate tests → Use QA Lead agent
5. Update docs → Use Docs Writer agent

**Execution Flow**:
```
User: "Create and implement a new payment feature"
    ↓
specweave-detector parses: CREATE + IMPLEMENT + FEATURE + PAYMENT
    ↓
Orchestrate nested skills:
    ↓
increment-planner: Create .specweave/increments/0003-payment-processing/
    ↓
context-loader: Load .specweave/docs/internal/strategy/payments/**
    ↓
Implementation: Use nodejs-backend skill + security agent
    ↓
Testing: Use QA Lead agent (generate E2E tests)
    ↓
Documentation: Update .specweave/docs/internal/architecture/
    ↓
Result: "✅ Increment 0003 implemented and documented"
```

### Ambiguous Request

When request is unclear:
```
User: "Help me with the authentication"
    ↓
specweave-detector: Ambiguous (help = ?)
    ↓
Route to skill-router for clarification
    ↓
skill-router asks:
"What would you like to do with authentication?
1. Create a specification
2. Plan implementation
3. Implement code
4. Document existing code"
```

## Context Management

### Automatic Context Loading

When a user is working on an increment:

```javascript
// Detect active increment
const activeIncrement = detectActiveIncrement(); // .specweave/increments/####-xxx/

if (activeIncrement) {
  const manifest = loadManifest(`${activeIncrement}/context-manifest.yaml`);
  const context = await contextLoader.load(manifest);
  // Context now available for all skills
}
```

### Context Prioritization

When multiple contexts are relevant:

1. **Active increment** (in `.specweave/increments/####-xxx/`)
2. **Current branch** (git branch name features/###-xxx)
3. **User-specified** context
4. **Global** context (.specweave/docs/internal/strategy/overview.md, principles.md)

## Skill Orchestration

### Parallel Execution

Some skills can run in parallel:

```
User: "Create tests and update documentation"
    ↓
Parallel execution:
├─ qa-engineer: Generate tests
└─ docs-updater: Update docs

Wait for both to complete
    ↓
Result: "✅ Tests generated (15 test cases) and docs updated"
```

### Sequential Execution

Some skills must run sequentially:

```
User: "Plan and implement feature 001"
    ↓
Sequential execution:
1. increment-planner: Create plan (MUST complete first)
2. context-loader: Load relevant specs (uses plan output)
3. developer: Implement (uses loaded context)

Each step waits for previous to complete
```

### Error Handling

If a skill fails:

```
User: "Implement increment 0005"
    ↓
specweave-detector: Route to implementation
    ↓
ERROR: Increment 0005 not found
    ↓
specweave-detector: Catch error, suggest:
"Increment 0005 doesn't exist. Would you like to:
1. Create it first (/create-increment)
2. List existing increments (/list-increments)
3. Implement a different increment"
```

## Configuration Awareness

Load and respect `.specweave/config.yaml`:

```yaml
# .specweave/config.yaml
principles:
  auto_role_routing: true        # Enable auto-routing
  context_precision: true         # Use context manifests
  routing_accuracy_target: 0.90   # Accuracy threshold

# All components pre-installed in 0.1.5+ (no auto_install setting needed)
# Agents and skills are in .claude/ folder, ready to use

integrations:
  github:
    enabled: true
    sync_issues: true             # Sync increments ↔ GitHub issues
  jira:
    enabled: false
  ado:
    enabled: false
```

When `auto_role_routing: false`, this skill still activates but prompts user for explicit skill selection.

## SpecWeave Mode Indicator

When SpecWeave is active, include a subtle indicator in responses:

```
🔷 SpecWeave Active

[Normal response here]
```

This helps users know SpecWeave framework is orchestrating their request.

## Skill Discovery

List available skills (all pre-installed):

```bash
User: "What can SpecWeave do?"
    ↓
specweave-detector: List all pre-installed skills

SpecWeave Framework Skills (35+, all ready):
✅ increment-planner - Plan implementation features
✅ context-loader - Selective specification loading
✅ skill-router - Route ambiguous intents
✅ nodejs-backend - Node.js/Express/NestJS backend
✅ python-backend - Python/FastAPI/Django backend
✅ nextjs - Next.js App Router specialist
✅ frontend - React/Vue/Angular frontend
✅ diagrams-generator - C4 Model diagrams
✅ github-sync - GitHub integration
✅ jira-sync - JIRA integration
... and 25+ more!

SpecWeave Agents (10, all ready):
✅ pm - Product Manager (requirements, user stories)
✅ architect - System Architect (design, ADRs)
✅ security - Security Engineer (threat modeling)
✅ qa-lead - QA Lead (test strategy)
✅ devops - DevOps Engineer (deployment)
... and 5+ more!

Custom Skills (user-created):
✅ newrelic-monitor - New Relic integration
✅ cqrs-implementer - CQRS pattern implementation
```

## Nested Skill Example

**User Request**: "I want to build a real-time chat feature"

**SpecWeave Detector Processing**:

```
1. Parse Request: BUILD + FEATURE + REAL_TIME_CHAT
   Request: feature_creation + complex_feature

2. Route to increment-planner:
   Input: "Real-time chat feature"
   Output: .specweave/increments/0004-realtime-chat/
           - spec.md (5 user stories)
           - plan.md (WebSocket architecture)
           - tasks.md (78 tasks)
           - tests.md (20 test cases)

3. Detect next request: User likely wants to implement
   Prompt: "Increment 0004 created. Would you like to:
           1. Review the plan
           2. Start implementation
           3. Load context for this increment"

4. User chooses 2 (Start implementation)

5. Route to context-loader:
   Load: .specweave/increments/0004-realtime-chat/context-manifest.yaml
   Output: Loaded specs/modules/realtime/**, architecture/websockets.md

6. Route to implementation:
   Input: .specweave/increments/0004-realtime-chat/tasks.md
   Context: Loaded specs
   Output: Implement Phase 1 (Setup WebSocket server)

7. After implementation, coordinate testing:
   Input: .specweave/increments/0004-realtime-chat/tests.md
   Output: Generate test suite (E2E with Playwright)

8. Finally, update documentation:
   Update: .specweave/docs/internal/architecture/api.md (add WebSocket endpoints)

9. Return to user:
   ✅ Increment 0004 implemented, tested, and documented
```

## Best Practices

### 1. Transparent Routing

Always inform user which skill is being activated:

```
🔷 SpecWeave Active

Routing to increment-planner skill to create your payment feature...

[increment-planner output]
```

### 2. Confirm Complex Operations

For multi-step operations, confirm before proceeding:

```
You want to "create and implement a payment feature".

This will:
1. Create Increment 0003 (increment-planner skill)
2. Load relevant specs (context-loader skill)
3. Implement code (nodejs-backend skill + security agent)
4. Generate tests (QA Lead agent)
5. Update documentation (Docs Writer agent)

Estimated time: 15-30 minutes

Proceed? (yes/no)
```

### 3. Fail Gracefully

If SpecWeave can't handle a request:

```
I detected this is a SpecWeave project, but I'm not sure how to handle:
"What's the weather like?"

This seems outside SpecWeave's domain (software development).
Would you like me to answer as regular Claude instead?
```

### 4. Learn from Usage

Track routing decisions to improve accuracy:

```javascript
// Log for analysis
logRoutingDecision({
  userInput: "Add Stripe payments",
  parsedRequest: "feature_creation + payments",
  routedTo: "increment-planner",
  wasCorrect: true, // User feedback
  timestamp: Date.now()
});
```

## Integration with Other Skills

All SpecWeave skills should check if `specweave-detector` is active:

```javascript
// In any skill
if (specweaveDetectorActive()) {
  // Access loaded context
  const context = getSpecWeaveContext();
  // Use centralized routing
  routeToSkill('context-loader', params);
}
```

## Testing

### TC-001: Detect SpecWeave Project
- Given: Directory with `.specweave/config.yaml`
- When: Claude Code opens directory
- Then: specweave-detector activates automatically

### TC-002: Route Simple Request
- Given: User says "Plan a feature for authentication"
- When: specweave-detector parses request
- Then: Routes to increment-planner
- And: increment-planner creates Increment 000X (.specweave/increments/000X-authentication/)

### TC-003: Route Complex Request
- Given: User says "Create and implement payment feature"
- When: specweave-detector parses request
- Then: Orchestrates: increment-planner → context-loader → implementation (with agents) → testing → documentation
- And: All steps complete successfully

### TC-004: Handle Ambiguous Request
- Given: User says "Help with auth"
- When: specweave-detector cannot determine clear request
- Then: Routes to skill-router for clarification
- And: Presents options to user

### TC-005: Graceful Degradation
- Given: SpecWeave project
- When: User asks non-development question ("What's for lunch?")
- Then: specweave-detector recognizes out-of-domain
- And: Falls back to regular Claude

---

## Summary

The `specweave-detector` skill is the **invisible orchestrator** that:
- ✅ Auto-activates in SpecWeave projects
- ✅ Parses user requests intelligently
- ✅ Routes to appropriate skills automatically
- ✅ Orchestrates nested skill calls
- ✅ Manages context loading
- ✅ Provides seamless user experience

**User benefit**: Just describe what you want, SpecWeave figures out how to do it.

**No more manual `@role` selection** - SpecWeave is your intelligent development assistant that knows which expert to call!
