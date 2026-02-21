# Phase 0: Deep Interview Mode

**Load this phase when Deep Interview Mode is enabled.**

## Smart Interview Gate (v1.0.243+)

The `user-prompt-submit.sh` hook now injects a **Smart Interview Gate** on every prompt when:
1. `deepInterview.enabled: true` in config
2. No active increment exists

The gate instructs the LLM to **assess prompt completeness** before deciding whether to interview or proceed. This replaces the old "always ask 5-40 questions" approach.

**How it works:**
- Gate fires on every prompt, accumulating context across messages
- LLM evaluates technical signals (stack, integrations, auth, deployment) AND product signals (users, flows, business model)
- If the user's prompt is comprehensive enough for the detected complexity → skip interview, proceed to `sw:increment`
- If gaps exist → ask 2-5 targeted questions about what's missing (NOT a full interview)

**As PM skill, your role when gate is active:**
- If the gate determined the prompt is complete → proceed directly to spec creation
- If the gate flagged missing areas → ask about ONLY those areas, then proceed
- Never re-ask questions the user already answered in prior messages

## Detection

Check config before proceeding with spec creation:

```bash
# Check if deep interview mode is enabled
deepInterview=$(jq -r '.planning.deepInterview.enabled // false' .specweave/config.json 2>/dev/null)
enforcement=$(jq -r '.planning.deepInterview.enforcement // "advisory"' .specweave/config.json 2>/dev/null)

if [ "$deepInterview" = "true" ]; then
  echo "DEEP INTERVIEW MODE ACTIVE"
  echo "Enforcement: $enforcement"
  if [ "$enforcement" = "strict" ]; then
    echo "⚠️ STRICT MODE: spec.md BLOCKED until all categories covered!"
  fi
fi
```

## Strict Enforcement (v1.0.198+)

When `enforcement: "strict"` is configured, spec.md creation is BLOCKED by `interview-enforcement-guard.sh` until all categories are marked as covered.

**To track category completion:**

1. **Initialize interview state** (done by increment skill):
   ```bash
   mkdir -p .specweave/state
   echo '{"incrementId":"XXXX-name","startedAt":"'$(date -Iseconds)'","coveredCategories":{}}' > .specweave/state/interview-XXXX-name.json
   ```

2. **Mark categories as covered** after discussing each:
   ```bash
   # Mark a category as covered with summary
   jq '.coveredCategories.architecture = {"coveredAt": "'$(date -Iseconds)'", "summary": "Microservices with event-driven communication"}' \
     .specweave/state/interview-XXXX-name.json > tmp && mv tmp .specweave/state/interview-XXXX-name.json
   ```

3. **Check progress**:
   ```bash
   jq '.coveredCategories | keys' .specweave/state/interview-XXXX-name.json
   ```

## Interview Categories

Cover ALL these areas before creating the specification:

### 1. Architecture (MANDATORY)

Ask about:
- System design patterns (monolith, microservices, serverless)
- Component responsibilities and boundaries
- Data flow between components
- State management approach
- Caching strategy
- Background processing needs

**Example questions:**
- "Will this feature need to communicate with other services? Which ones?"
- "How should we handle state - server-side, client-side, or both?"
- "Do you anticipate this becoming a bottleneck? Should we design for horizontal scaling?"

### 2. Integrations (MANDATORY)

Ask about:
- External APIs and services
- Authentication providers (OAuth, SAML, custom)
- Payment processors
- Email/notification services
- Analytics and tracking
- Third-party SDKs
- Database connections (existing vs new)

**Example questions:**
- "What external services does this feature need to integrate with?"
- "Do you have existing API keys/credentials for these services?"
- "How should we handle API rate limits or failures?"

### 3. UI/UX (MANDATORY)

Ask about:
- User flow and journey
- Loading states and feedback
- Error messages and recovery
- Accessibility requirements
- Mobile/responsive design
- Animation and transitions
- Form validation rules
- Empty states and edge cases

**Example questions:**
- "What happens when the user submits the form but the network is slow?"
- "How should validation errors be displayed?"
- "What does the user see if there's no data yet?"

### 4. Performance (MANDATORY)

Ask about:
- Expected load and traffic
- Response time requirements
- Data volume expectations
- Caching needs
- CDN requirements
- Lazy loading strategy
- Bundle size concerns

**Example questions:**
- "How many concurrent users do you expect?"
- "Is real-time updates a requirement, or is eventual consistency acceptable?"
- "Are there any performance SLAs we need to meet?"

### 5. Security (MANDATORY)

Ask about:
- Authentication requirements
- Authorization/permissions
- Data encryption (at rest, in transit)
- PII handling
- Audit logging needs
- Rate limiting
- Input validation
- CORS requirements

**Example questions:**
- "Who should have access to this feature? Any role restrictions?"
- "Does this handle sensitive data that needs special protection?"
- "Do we need to log user actions for compliance?"

### 6. Edge Cases (MANDATORY)

Ask about:
- Failure scenarios
- Network errors
- Timeout handling
- Concurrent modification
- Race conditions
- Data consistency
- Rollback procedures
- Migration from existing data

**Example questions:**
- "What happens if the payment succeeds but our database update fails?"
- "How do we handle two users editing the same record simultaneously?"
- "What's the rollback plan if deployment goes wrong?"

## Interview Flow

1. **Start broad**: "Tell me about the feature you're building"
2. **Go category by category**: Cover each area above
3. **Ask follow-ups**: Don't accept vague answers
4. **Summarize understanding**: Confirm before proceeding
5. **Identify gaps**: "Is there anything else I should know?"

## Question Count: Think, Don't Count

**DO NOT blindly ask a fixed number of questions.** Assess the situation first:

### Assessment Criteria

Before starting, evaluate:
1. **Feature complexity**: Is this trivial, small, medium, or large?
2. **Existing context**: Has the user already explained details? Returning user?
3. **Domain familiarity**: Well-understood patterns or novel architecture?
4. **Risk level**: High-stakes (payments, security) vs low-stakes (UI tweak)?

### Resolving Assessment Conflicts

When factors point to different complexity levels:

| Conflict | Resolution |
|----------|------------|
| Small complexity + High risk | **Upgrade to Medium/Large** (risk wins) |
| Large complexity + Lots of user context | **Reduce questions proportionally** (skip what's answered) |
| Novel domain + Simple feature | **Upgrade one tier** (unfamiliarity adds questions) |
| Returning user + Same feature area | **Reduce by 30-50%** (context already established) |

**The rule: When in doubt, err on the side of asking one more question rather than missing critical requirements.**

### Guidelines (Adapt Based on Assessment)

| Complexity | Typical Range | When |
|------------|---------------|------|
| **Trivial** | 0-3 questions | Config change, typo fix, obvious bug |
| **Small** | 4-8 questions | Single well-defined component, clear requirements |
| **Medium** | 9-18 questions | Multiple components, some integration points |
| **Large** | 19-40 questions | Architectural, cross-cutting, high-risk (payments, security) |

### Config Floor: minQuestions

The project may define a minimum question count in config:

```bash
jq -r '.planning.deepInterview.minQuestions // 5' .specweave/config.json 2>/dev/null
```

**Rule**: If your complexity assessment yields fewer questions than `minQuestions`, use `minQuestions` as the floor. For example, if you assess a feature as "trivial" (0-3 questions) but `minQuestions` is 5, ask at least 5 questions.

This prevents teams from accidentally under-interviewing when they have set an organizational minimum.

### What's a "Single Component"?

A "single component" means **isolated scope** - changes contained to one area:
- **Frontend**: One React component, one page, one form
- **Backend**: One API endpoint, one service method, one database table
- **Infrastructure**: One config file, one environment variable

**NOT single component** (upgrade to Medium/Large):
- Changes touching multiple services
- New integrations with external systems
- Features requiring database migrations + API + UI

### Examples

**Over-interviewing (BAD)**:
- User: "Add a logout button to the navbar"
- Claude: Asks 15 questions about architecture, performance, security...
- Reality: This is a trivial UI task. 2-3 questions max.

**Right-sized interviewing (GOOD)**:
- User: "Add Stripe subscription billing"
- Claude: Assesses as high-complexity (payments = high-risk, multiple integrations)
- Result: Asks 25+ questions covering payment flows, edge cases, refunds, etc.

**Under-interviewing (BAD)**:
- User: "Add user authentication"
- Claude: Asks 3 questions and starts implementing
- Reality: Auth is high-risk + architectural. Needed 15-25+ questions about:
  - OAuth vs JWT vs sessions
  - Password policies, MFA requirements
  - Session expiry, refresh tokens
  - Role-based access control
  - Account recovery flows
  - Security logging, rate limiting

**Medium complexity (GOOD)**:
- User: "Add email notifications for order updates"
- Claude: Assesses as medium (integration with email service, multiple trigger points)
- Result: Asks 10-12 questions about triggers, templates, delivery preferences, error handling

### The Rule

**Ask exactly as many questions as needed to produce a clear specification - no more, no less.**

Skip categories that don't apply (e.g., skip "UI/UX" for backend-only features).

## Using AskUserQuestion Tool

For structured questioning, use the `AskUserQuestion` tool:

```typescript
AskUserQuestion({
  questions: [{
    question: "Which authentication method should we use?",
    header: "Auth",
    options: [
      { label: "OAuth 2.0 (Recommended)", description: "Standard, supports Google/GitHub login" },
      { label: "JWT Sessions", description: "Custom tokens, more control" },
      { label: "Magic Links", description: "Passwordless, email-based" },
      { label: "SSO/SAML", description: "Enterprise, integrates with corporate identity" }
    ],
    multiSelect: false
  }]
})
```

## Completion Criteria

Only proceed to `phases/01-research.md` when:
- [ ] All **RELEVANT** categories have been discussed or marked N/A
- [ ] User has confirmed understanding is correct
- [ ] No major ambiguities remain
- [ ] Integration dependencies are documented

**Marking Irrelevant Categories:**
Not all categories apply to every feature. For irrelevant categories, mark as:
```
Mark performance covered: N/A - backend config change, no performance impact
Mark ui-ux covered: N/A - API-only feature, no UI involved
```

**For Strict Mode:** All 6 categories must be marked (either with content OR as N/A) in interview state file before spec.md can be written.

## Marking Categories Complete

After discussing each category, mark it as covered. Use natural language - Claude will update the state file:

```
Mark architecture covered: [Microservices with Redis cache, PostgreSQL for persistence]
Mark integrations covered: [Stripe for payments, SendGrid for email, Auth0 for auth]
Mark ui-ux covered: [Dashboard with real-time updates, toast notifications for errors]
Mark performance covered: [< 200ms response time, Redis caching, lazy loading]
Mark security covered: [JWT with refresh tokens, RBAC for permissions, HTTPS only]
Mark edge-cases covered: [Retry with exponential backoff, idempotency keys for payments]
```

**Or use structured command:**
```bash
specweave interview mark-covered XXXX-name architecture "Microservices with event-driven arch"
```

## Output

After interview, summarize findings:

```markdown
## Interview Summary

### Architecture Decisions
- Pattern: [chosen pattern]
- Key components: [list]
- Data flow: [description]

### Integrations
- [Service 1]: [purpose]
- [Service 2]: [purpose]

### UI/UX Decisions
- [key decisions]

### Performance Requirements
- [requirements]

### Security Considerations
- [considerations]

### Edge Cases Identified
- [list of edge cases to handle]
```

This summary feeds into spec.md creation.
