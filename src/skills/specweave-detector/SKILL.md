---
name: specweave-detector
description: Entry point for SpecWeave framework. Automatically activates when .specweave directory is detected in the project. Acts as a factory of agents, parsing user requests and routing to appropriate skills. Supports nested skill calls and context management. This skill should ALWAYS be loaded first in SpecWeave projects. Activates for ANY user request in a SpecWeave project (auto-detects .specweave/).
proactive: true
---

# SpecWeave Detector & Entry Point

This skill is the **automatic entry point** for all SpecWeave operations. When Claude Code detects a `.specweave/config.yaml` file, this skill activates and orchestrates the SpecWeave framework.

## Purpose

Act as the "factory of agents" that:
1. Detects SpecWeave projects automatically
2. Parses user requests
3. Routes to appropriate skills
4. Orchestrates nested skill calls
5. Manages context loading

## Detection Logic

```javascript
// Pseudo-code for detection
if (fileExists('.specweave/config.yaml')) {
  activateSpecWeaveMode();
  loadConfiguration();
  parseUserIntent();
  routeToSkills();
}
```

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
# 3. Routes to: feature-planner skill
# 4. feature-planner creates Feature 002
# 5. Returns result to user

# User sees:
✅ Feature created: 002-payment-processing
```

## Request Parsing & Routing

### Simple Request (Single Skill)

| User Says | Request Type | Route To |
|-----------|--------|----------|
| "Plan a feature for..." | feature_planning | `feature-planner` |
| "Load context for..." | context_loading | `context-loader` |
| "Document this code..." | documentation | `docs-updater` |
| "Create a spec for..." | specification | `spec-author` |
| "Design architecture for..." | architecture | `architect` |
| "Implement feature 001" | development | `developer` |
| "Test this feature" | testing | `qa-engineer` |

### Complex Request (Multiple Skills)

**Example**: "Create and implement a new payment feature"

**Request Breakdown**:
1. Create feature → `feature-planner`
2. Implement code → Load context via `context-loader`
3. Implement code → `developer`
4. Generate tests → `qa-engineer`
5. Update docs → `docs-updater`

**Execution Flow**:
```
User: "Create and implement a new payment feature"
    ↓
specweave-detector parses: CREATE + IMPLEMENT + FEATURE + PAYMENT
    ↓
Orchestrate nested skills:
    ↓
feature-planner: Create 003-payment-processing/
    ↓
context-loader: Load specs/modules/payments/**
    ↓
developer: Implement based on tasks.md
    ↓
qa-engineer: Generate test cases
    ↓
docs-updater: Update README, docs/
    ↓
Result: "✅ Feature 003 implemented and documented"
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

When a user is working on a feature:

```javascript
// Detect active work
const activeIssue = detectActiveIssue(); // work/issues/###-xxx/

if (activeIssue) {
  const manifest = loadManifest(`${activeIssue}/context-manifest.yaml`);
  const context = await contextLoader.load(manifest);
  // Context now available for all skills
}
```

### Context Prioritization

When multiple contexts are relevant:

1. **Active work item** (in `work/issues/`)
2. **Current feature** (referenced in git branch)
3. **User-specified** context
4. **Global** context (specs/overview.md, principles.md)

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
1. feature-planner: Create plan (MUST complete first)
2. context-loader: Load relevant specs (uses plan output)
3. developer: Implement (uses loaded context)

Each step waits for previous to complete
```

### Error Handling

If a skill fails:

```
User: "Implement feature 005"
    ↓
specweave-detector: Route to developer
    ↓
developer: ERROR - Feature 005 not found
    ↓
specweave-detector: Catch error, suggest:
"Feature 005 doesn't exist. Would you like to:
1. Create it first (feature-planner)
2. List existing features
3. Implement a different feature"
```

## Configuration Awareness

Load and respect `.specweave/config.yaml`:

```yaml
# .specweave/config.yaml
principles:
  auto_role_routing: true        # Enable auto-routing
  context_precision: true         # Use context manifests
  routing_accuracy_target: 0.90   # Accuracy threshold

skills:
  install_location: "local"       # Where skills are installed
  auto_install: true              # Auto-install missing skills

integrations:
  github:
    enabled: true
    sync_issues: true             # Sync features ↔ GitHub issues
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

List available skills:

```bash
User: "What can SpecWeave do?"
    ↓
specweave-detector: List installed skills

SpecWeave Skills:
✅ feature-planner - Plan implementation features
✅ context-loader - Selective specification loading
✅ skill-router - Route ambiguous intents
📦 spec-author - Create specifications (install with: npx specweave install spec-author)
📦 architect - System design (install with: npx specweave install architect)

Custom Skills:
✅ newrelic-monitor - New Relic integration
✅ cqrs-implementer - CQRS pattern implementation
```

## Nested Skill Example

**User Request**: "I want to build a real-time chat feature"

**SpecWeave Detector Processing**:

```
1. Parse Request: BUILD + FEATURE + REAL_TIME_CHAT
   Request: feature_creation + complex_feature

2. Route to feature-planner:
   Input: "Real-time chat feature"
   Output: features/004-realtime-chat/
           - spec.md (5 user stories)
           - plan.md (WebSocket architecture)
           - tasks.md (78 tasks)
           - tests.md (20 test cases)

3. Detect next request: User likely wants to implement
   Prompt: "Feature 004 created. Would you like to:
           1. Review the plan
           2. Start implementation
           3. Load context for this feature"

4. User chooses 2 (Start implementation)

5. Route to context-loader:
   Load: features/004-realtime-chat/context-manifest.yaml
   Output: Loaded specs/modules/realtime/**, architecture/websockets.md

6. Route to developer:
   Input: features/004-realtime-chat/tasks.md
   Context: Loaded specs
   Output: Implement Phase 1 (Setup WebSocket server)

7. After implementation, route to qa-engineer:
   Input: features/004-realtime-chat/tests.md
   Output: Generate test suite

8. Finally, route to docs-updater:
   Update: docs/reference/api.md (add WebSocket endpoints)

9. Return to user:
   ✅ Feature 004 implemented, tested, and documented
```

## Best Practices

### 1. Transparent Routing

Always inform user which skill is being activated:

```
🔷 SpecWeave Active

Routing to feature-planner skill to create your payment feature...

[feature-planner output]
```

### 2. Confirm Complex Operations

For multi-step operations, confirm before proceeding:

```
You want to "create and implement a payment feature".

This will:
1. Create Feature 003 (feature-planner)
2. Load relevant specs (context-loader)
3. Implement code (developer)
4. Generate tests (qa-engineer)
5. Update documentation (docs-updater)

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
  routedTo: "feature-planner",
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
- Then: Routes to feature-planner
- And: feature-planner creates Feature 00X

### TC-003: Route Complex Request
- Given: User says "Create and implement payment feature"
- When: specweave-detector parses request
- Then: Orchestrates: feature-planner → context-loader → developer → qa-engineer → docs-updater
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
