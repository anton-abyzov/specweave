# task-builder Skill

**Status**: To be developed
**Priority**: High

## Purpose

Converts high-level spec.md (user stories, epics, capabilities) into detailed tasks.md with:
- Technical implementation details
- File paths and code snippets
- Acceptance criteria per task
- Agent/skill references (which agent to use for each task)
- Documentation update requirements

## When It Activates

- After increment-planner creates increment
- After spec.md is created
- User says "create tasks for this feature"
- User says "break down implementation"

## What It Does

1. **Reads spec.md**: Understands user stories, acceptance tests
2. **Creates tasks.md**:
   - Maps user stories → tasks
   - Adds technical details (file paths, code)
   - Adds acceptance criteria per task
   - Specifies which agent/skills to use
   - Links to documentation
3. **Updates docs**: Marks sections as [DRAFT] that need updates
4. **Understands structure**: Adapts to JIRA, ADO, or simple user stories

## Task vs User Story

- **User Story**: Has acceptance TESTS (verify feature works)
- **Task**: Has acceptance CRITERIA (verify task complete)

## Example Output

```markdown
# tasks.md

## Task T001: Create StripeService

**Agent**: nodejs-backend
**Skills**: stripe-integration, api-design

**Description**: Create Stripe service class for payment processing

**File**: src/services/stripe-service.ts

**Implementation**:
```typescript
export class StripeService {
  async createSubscription(params) {
    // Implementation
  }
}
```

**Acceptance Criteria**:
- [ ] StripeService class exists in src/services/stripe-service.ts
- [ ] createSubscription method implemented
- [ ] Error handling added
- [ ] Unit tests passing

**Documentation Updates**:
- [ ] .specweave/docs/api/payments.md [DRAFT]
```

## Integration

- Called by: increment-planner (after spec.md created)
- Calls: docs-updater (to update documentation)
- Output: tasks.md in .specweave/increments/####-feature/

## Configuration

```yaml
# .specweave/config.yaml
task_builder:
  structure: "auto-detect"  # user-stories | jira | ado
  detail_level: "high"      # Include code snippets
  agent_references: true    # Specify which agent for each task
```

---

**To implement**: See task in .specweave/increments/
