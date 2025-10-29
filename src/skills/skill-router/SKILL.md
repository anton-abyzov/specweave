---
name: skill-router
description: Intelligent routing system that parses ambiguous user requests and routes them to appropriate SpecWeave skills with >90% accuracy. Acts as the "traffic controller" for all skill invocations. Activates when user intent is unclear or when multiple skills could handle a request. Keywords: route, clarify, ambiguous, which skill, help me decide.
---

# Skill Router - Intelligent Request Routing

## Purpose

The skill-router is SpecWeave's **intelligent routing system** that:
1. Parses ambiguous or complex user requests
2. Determines which skill(s) should handle the request
3. Routes with >90% accuracy (target from constitution)
4. Learns from user feedback to improve routing
5. Handles multi-skill orchestration

## When to Activate

This skill activates when:
- User request is ambiguous ("Help me with payments")
- Multiple skills could handle the request
- specweave-detector needs clarification
- User explicitly asks "which skill should I use?"
- Request parsing confidence is <90%

## Routing Algorithm

### Phase 1: Intent Classification

```typescript
interface UserIntent {
  primary_action: 'create' | 'plan' | 'implement' | 'test' | 'document' | 'analyze' | 'sync' | 'optimize';
  domain: string[];  // ['payment', 'authentication', 'api']
  complexity: 'simple' | 'moderate' | 'complex';
  scope: 'greenfield' | 'brownfield' | 'unknown';
  confidence: number;  // 0.0 to 1.0
}
```

**Intent Extraction Examples**:

| User Says | Primary Action | Domain | Complexity | Confidence |
|-----------|---------------|--------|------------|-----------|
| "Add Stripe payments" | create | ['payment', 'stripe'] | moderate | 0.95 |
| "Help with auth" | unknown | ['authentication'] | unknown | 0.40 |
| "Build a SaaS" | create | ['saas', 'product'] | complex | 0.85 |
| "Optimize slow queries" | optimize | ['performance', 'database'] | moderate | 0.90 |
| "Document the API" | document | ['api', 'documentation'] | simple | 0.98 |

### Phase 2: Skill Mapping

```typescript
const skillMap = {
  // Core planning and specification
  'create + spec': 'spec-author',
  'create + plan': 'increment-planner',
  'create + architecture': 'architect-agent',

  // Implementation
  'implement + nodejs': 'nodejs-backend',
  'implement + python': 'python-backend',
  'implement + dotnet': 'dotnet-backend',
  'implement + frontend': 'frontend-agent',

  // Testing and quality
  'test + e2e': 'playwright-tester',
  'test + unit': 'qa-engineer',
  'analyze + quality': 'qa-lead-agent',

  // Operations
  'deploy + infrastructure': 'devops-agent',
  'optimize + performance': 'performance-agent',
  'secure + security': 'security-agent',

  // Sync and integration
  'sync + jira': 'jira-sync',
  'sync + ado': 'ado-sync',
  'sync + github': 'github-sync',

  // Documentation
  'document + code': 'docs-writer-agent',
  'update + docs': 'docs-updater',

  // Analysis
  'analyze + brownfield': 'brownfield-analyzer',
  'analyze + code': 'tech-lead-agent',

  // Orchestration
  'complex + multi-role': 'role-orchestrator',
  'create + tasks': 'task-builder'
};
```

### Phase 3: Confidence Assessment

```typescript
function assessConfidence(intent: UserIntent, matchedSkills: string[]): RoutingDecision {
  let confidence = 0.0;

  // Single skill match with high intent confidence
  if (matchedSkills.length === 1 && intent.confidence > 0.85) {
    confidence = intent.confidence;
  }

  // Multiple skills but clear priority
  else if (matchedSkills.length > 1) {
    const prioritySkill = determinePriority(matchedSkills, intent);
    confidence = 0.7;  // Multi-skill always has some ambiguity
  }

  // No clear match
  else {
    confidence = 0.3;
  }

  return {
    skill: matchedSkills[0] || 'unknown',
    confidence,
    alternatives: matchedSkills.slice(1),
    needsClarification: confidence < 0.90
  };
}
```

### Phase 4: Clarification (if needed)

When confidence < 0.90, ask user for clarification:

```markdown
Your request: "Help me with authentication"

I can route this to several skills. What would you like to do?

1. **Create specification** - Define authentication requirements (spec-author)
2. **Plan implementation** - Design auth architecture (architect-agent)
3. **Implement auth** - Build authentication system (backend skill)
4. **Secure existing auth** - Security review and hardening (security-agent)
5. **Test authentication** - E2E auth testing (playwright-tester)

Please select (1-5) or describe in more detail.
```

## Routing Workflows

### Simple Routing (High Confidence)

```
User: "Create a feature plan for payment processing"
    ↓
skill-router analyzes:
  Primary action: create + plan
  Domain: payment
  Complexity: moderate
  Confidence: 0.95
    ↓
Route to: increment-planner (direct)
    ↓
No clarification needed
```

### Ambiguous Routing (Low Confidence)

```
User: "Help with payments"
    ↓
skill-router analyzes:
  Primary action: unknown
  Domain: payment
  Complexity: unknown
  Confidence: 0.40
    ↓
Needs clarification
    ↓
Present options:
  1. spec-author (create spec)
  2. increment-planner (plan feature)
  3. architect-agent (design architecture)
  4. nodejs-backend (implement)
  5. security-agent (PCI compliance)
    ↓
User selects: 2
    ↓
Route to: increment-planner
```

### Multi-Skill Routing (Complex Request)

```
User: "Build a SaaS for project management"
    ↓
skill-router analyzes:
  Primary action: create
  Domain: saas, product, project-management
  Complexity: complex
  Confidence: 0.85 (high but complex)
    ↓
Route to: role-orchestrator
    ↓
role-orchestrator determines needed roles:
  - pm-agent (product strategy)
  - architect-agent (system design)
  - qa-lead-agent (test strategy)
  - devops-agent (infrastructure)
    ↓
Orchestrated execution
```

## Machine Learning Enhancement

### Training Data Collection

```typescript
interface RoutingFeedback {
  userInput: string;
  parsedIntent: UserIntent;
  routedSkill: string;
  userAccepted: boolean;  // Did user accept this routing?
  userSelectedInstead?: string;  // If rejected, what did user choose?
  timestamp: number;
}

// Store in .specweave/cache/routing-feedback.json
```

### Improvement Cycle

```
1. Collect routing decisions and user feedback
2. Analyze patterns:
   - Which phrases consistently map to which skills?
   - Which ambiguous cases were resolved by users?
   - What keywords are strong indicators?
3. Update routing confidence thresholds
4. Refine intent classification rules
5. Achieve >90% accuracy target
```

### Success Metrics

```typescript
// Stored in .specweave/cache/routing-metrics.json
interface RoutingMetrics {
  total_routings: number;
  correct_routings: number;  // User accepted
  accuracy: number;  // correct / total
  average_confidence: number;
  clarifications_needed: number;
  multi_skill_routes: number;
}

// Target: accuracy > 0.90 (90% from constitution)
```

## Skill Priority Matrix

When multiple skills could handle a request, use priority:

| Context | Priority Order |
|---------|---------------|
| **New Product/Feature** | pm-agent → architect-agent → increment-planner → implementation |
| **Brownfield Modification** | brownfield-analyzer → increment-planner → implementation |
| **Bug Fix** | tech-lead-agent → implementation → qa-engineer |
| **Performance Issue** | performance-agent → tech-lead-agent → implementation |
| **Security Issue** | security-agent → implementation → qa-engineer |
| **Documentation** | docs-writer-agent → docs-updater |
| **Testing** | qa-lead-agent → playwright-tester or qa-engineer |

## Integration Points

### 1. Called By

- **specweave-detector**: When initial parsing is ambiguous
- **Users**: Explicit routing questions
- **role-orchestrator**: For sub-routing within complex workflows

### 2. Calls

- Any SpecWeave skill based on routing decision
- **role-orchestrator**: For complex multi-skill requests

### 3. Updates

- `.specweave/cache/routing-feedback.json`: Training data
- `.specweave/cache/routing-metrics.json`: Performance metrics

## Configuration



## Examples

### Example 1: Stripe Integration

```
User: "I want to integrate Stripe for subscription billing"

skill-router analysis:
  Action: create + integrate
  Domain: stripe, payment, subscription
  Keywords: integrate (suggests implementation)
  Confidence: 0.88 (just below threshold)

Clarification:
  "I see you want to integrate Stripe for subscriptions.

  Would you like to:
  1. Plan the integration (increment-planner)
  2. Design the architecture (architect-agent)
  3. Start implementation (nodejs-backend)

  Recommendation: Start with #1 (Plan) for best practice."

User: "Yes, plan it first"

Route to: increment-planner
```

### Example 2: Performance Optimization

```
User: "The app is slow, especially the dashboard"

skill-router analysis:
  Action: optimize
  Domain: performance, dashboard, frontend
  Confidence: 0.92 (above threshold!)

Route to: performance-agent (direct, no clarification)

performance-agent:
  "I'll analyze the dashboard performance.
  [runs profiling, identifies issues]

  Found 3 issues:
  1. Unnecessary re-renders (React)
  2. Unoptimized database queries
  3. Large bundle size

  Routing optimization tasks:
  - Issue 1 → frontend-agent
  - Issue 2 → nodejs-backend
  - Issue 3 → tech-lead-agent (code splitting)"
```

### Example 3: Brownfield Documentation

```
User: "Document the existing payment processing code"

skill-router analysis:
  Action: document
  Domain: payment, existing-code
  Scope: brownfield
  Confidence: 0.75 (brownfield detection uncertain)

Clarification:
  "You want to document existing payment code.

  Options:
  1. Analyze & document current implementation (brownfield-analyzer)
  2. Update existing documentation (docs-updater)
  3. Write new developer guide (docs-writer-agent)

  If the code isn't documented yet, I recommend #1."

User: "1"

Route to: brownfield-analyzer
```

## Error Handling

### Unknown Domain

```
User: "What's for lunch?"

skill-router:
  Domain: food, lunch
  No matching SpecWeave skills

  "This seems outside SpecWeave's domain (software development).
  SpecWeave handles:
  - Feature planning
  - Code implementation
  - Testing and QA
  - Documentation
  - DevOps and deployment

  Would you like me to answer as regular Claude instead?"
```

### Confidence Collapse

```
If 5+ consecutive routings have confidence < 0.50:
  "I'm having trouble understanding your requests.

  Available SpecWeave skills:
  [list all installed skills with descriptions]

  Please try:
  1. Being more specific ("create a spec" vs "help")
  2. Including action keywords (plan, implement, test, etc.)
  3. Mentioning technology (Node.js, Python, React, etc.)"
```

## Testing

### Test Cases

**TC-001: High Confidence Routing**
- Given: "Create a plan for Stripe payment integration"
- When: skill-router parses request
- Then: Confidence > 0.90
- And: Routes to increment-planner without clarification

**TC-002: Low Confidence Clarification**
- Given: "Help with auth"
- When: skill-router parses request
- Then: Confidence < 0.90
- And: Asks user for clarification
- And: Presents 3-5 options

**TC-003: Multi-Skill Complex Request**
- Given: "Build a real-time collaboration SaaS"
- When: skill-router parses request
- Then: Recognizes complexity
- And: Routes to role-orchestrator
- And: Confidence recorded

**TC-004: Accuracy Tracking**
- Given: 100 routing decisions
- When: Users provide feedback (accept/reject)
- Then: Accuracy calculated correctly
- And: Metrics stored in cache
- And: Accuracy > 90% target

**TC-005: Learning from Feedback**
- Given: User rejects routing 3 times for "help with payments"
- When: User always selects "increment-planner"
- Then: Pattern learned
- And: Future "help with payments" routes to increment-planner
- And: Confidence increases

## Resources

### Natural Language Processing
- [spaCy](https://spacy.io/) - Industrial-strength NLP
- [compromise](https://github.com/spencermountain/compromise) - Natural language processing in JavaScript
- [natural](https://github.com/NaturalNode/natural) - Natural language facilities for Node.js

### Intent Classification
- [Rasa NLU](https://rasa.com/docs/rasa/nlu-training-data/) - Intent classification and entity extraction
- [Dialogflow](https://cloud.google.com/dialogflow/docs/intents) - Google's intent classification
- [LUIS](https://www.luis.ai/) - Microsoft Language Understanding

### Pattern Matching
- [string-similarity](https://github.com/aceakash/string-similarity) - Find similarity between strings
- [fuzzyset.js](https://github.com/Glench/fuzzyset.js) - Fuzzy string matching

### Machine Learning (Optional Enhancement)
- [TensorFlow.js](https://www.tensorflow.org/js) - ML in JavaScript
- [brain.js](https://brain.js.org/) - Neural networks in JavaScript
- [ml.js](https://github.com/mljs/ml) - Machine learning tools

---

## Summary

The skill-router is SpecWeave's **intelligent traffic controller** that:
- ✅ Parses user requests with intent classification
- ✅ Routes to appropriate skills with >90% accuracy (constitution target)
- ✅ Provides clarification when needed (confidence < 0.90)
- ✅ Learns from user feedback to improve over time
- ✅ Handles multi-skill orchestration for complex requests
- ✅ Tracks metrics for continuous improvement

**User benefit**: Natural language requests are intelligently routed to the right skill, making SpecWeave feel like a unified development assistant instead of fragmented tools.
