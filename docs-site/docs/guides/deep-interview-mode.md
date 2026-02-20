# Deep Interview Mode

**Version**: 1.0.195+

Deep Interview Mode enables comprehensive upfront questioning during increment planning. When enabled, Claude asks 5-40 questions (scaled to complexity) about architecture, integrations, UI/UX, and tradeoffs before creating specifications.

## Overview

This feature is inspired by Thariq's (@trq212, Claude Code creator) workflow:

> "For big features or new projects Claude might ask me many in-depth questions and I end up with a much more detailed spec that I feel I had a lot of control over."

### Benefits

- **More comprehensive specs** with fewer iterations
- **Catches integration issues early** before implementation
- **Better architecture decisions** upfront
- **More user control** over the final specification
- **Fewer surprises** during implementation

## Quick Start

### Enable During Init

When running `specweave init`, you'll be asked:

```
Deep Interview Mode

Claude asks 5-40 questions (scaled to complexity) about architecture,
integrations, UI/UX, and tradeoffs before creating specifications.

Enable Deep Interview Mode? [y/N]
```

### Enable in Existing Project

Edit `.specweave/config.json`:

```json
{
  "planning": {
    "deepInterview": {
      "enabled": true,
      "minQuestions": 5,
      "categories": [
        "architecture",
        "integrations",
        "ui-ux",
        "performance",
        "security",
        "edge-cases"
      ]
    }
  }
}
```

## How It Works

### 1. Smart Interview Gate (v1.0.243+)

When Deep Interview Mode is enabled, a **Smart Interview Gate** fires on every user prompt until an increment is created. The gate:

1. **Assesses complexity** — Is this trivial, small, medium, or large?
2. **Checks for completeness signals** — tech stack, integrations, auth, deployment, users, flows, business model
3. **Decides intelligently**:
   - If the prompt has enough detail for the complexity level → proceeds directly to increment creation
   - If gaps are detected → asks 2-5 targeted questions about only what's missing

**This means**: If you write a comprehensive description upfront, you skip the interview entirely. The LLM only asks when it genuinely needs more information.

### 2. Interview Phase (when gaps detected)

Claude uses the `AskUserQuestion` tool to ask structured questions:

```typescript
AskUserQuestion({
  questions: [{
    question: "Which authentication method should we use?",
    header: "Auth",
    options: [
      { label: "OAuth 2.0 (Recommended)", description: "Standard, supports Google/GitHub login" },
      { label: "JWT Sessions", description: "Custom tokens, more control" },
      { label: "Magic Links", description: "Passwordless, email-based" },
      { label: "SSO/SAML", description: "Enterprise identity integration" }
    ],
    multiSelect: false
  }]
})
```

### 3. Categories Covered

| Category | Questions About |
|----------|----------------|
| **Architecture** | System patterns, component design, data flow, state management |
| **Integrations** | External APIs, auth providers, payment processors, databases |
| **UI/UX** | User flows, loading states, error messages, accessibility |
| **Performance** | Load expectations, caching, real-time requirements |
| **Security** | Auth/authz, data encryption, audit logging, rate limiting |
| **Edge Cases** | Failure scenarios, race conditions, rollback procedures |

### 4. Question Volume

Claude assesses complexity and adapts question count accordingly:

| Complexity | Questions | When |
|------------|-----------|------|
| **Trivial** | 0-3 | Config change, typo fix, obvious bug |
| **Small** | 4-8 | Single well-defined component |
| **Medium** | 9-18 | Multiple components, some integration |
| **Large** | 19-40 | Architectural, cross-cutting, high-risk |

**The LLM thinks about what's needed - not blindly following a count.**

### 5. Completion

After the interview, Claude summarizes findings before creating spec.md:

```markdown
## Interview Summary

### Architecture Decisions
- Pattern: Microservices with API Gateway
- Key components: Auth service, User service, Order service
- Data flow: Event-driven with message queue

### Integrations
- Stripe: Payment processing
- SendGrid: Transactional emails
- Auth0: User authentication

### UI/UX Decisions
- Progressive loading with skeleton screens
- Inline form validation
- Mobile-first responsive design

### Performance Requirements
- API response time < 200ms
- Support 10K concurrent users
- CDN for static assets

### Security Considerations
- JWT with refresh tokens
- Rate limiting per user
- PII encryption at rest

### Edge Cases Identified
- Payment timeout handling
- Concurrent cart modifications
- Session expiry during checkout
```

## Configuration Options

### `enabled`

Enable or disable Deep Interview Mode.

```json
"enabled": true
```

### `minQuestions`

Soft guideline for minimum questions. The LLM should assess feature complexity and decide:
- Trivial features: 0-3 questions
- Small features: 5-10 questions
- Medium features: 10-20 questions
- Large features: 20-40 questions

```json
"minQuestions": 5
```

### `categories`

Which categories to cover during interview.

```json
"categories": [
  "architecture",
  "integrations",
  "ui-ux",
  "performance",
  "security",
  "edge-cases"
]
```

## Use Cases

### When to Enable

- **Complex features** with multiple integrations
- **New projects** where architecture isn't established
- **Enterprise projects** requiring thorough documentation
- **Cross-team features** needing clear specification

### When to Skip

- **Quick fixes** or typo corrections
- **Well-defined tasks** with clear requirements
- **Time-sensitive hotfixes** needing fast turnaround
- **Solo projects** where you know exactly what you want

## Toggling Per-Session

You can temporarily disable for a session:

```bash
# Skip deep interview for this prompt
/sw:increment --skip-interview "Quick fix for login"
```

Or enable for a specific prompt:

```bash
# Force deep interview even if disabled
/sw:increment --deep-interview "Complex payment integration"
```

## Related Commands

| Command | Description |
|---------|-------------|
| `/sw:increment` | Creates increment (triggers interview if enabled) |
| `/sw:pm` | PM skill with interview capabilities |
| `/sw:architect` | Architect skill for technical questions |

## Troubleshooting

### Interview Not Triggering

Check config:
```bash
jq '.planning.deepInterview.enabled' .specweave/config.json
```

### Too Many Questions

Lower the minimum or reduce categories:
```json
{
  "planning": {
    "deepInterview": {
      "enabled": true,
      "minQuestions": 5,
      "categories": ["architecture", "integrations"]
    }
  }
}
```

### Disable Completely

```json
{
  "planning": {
    "deepInterview": {
      "enabled": false
    }
  }
}
```

## See Also

- [ADR-0232: Deep Interview Mode](../../internal/architecture/adr/0232-deep-interview-mode.md)
- [Getting Started Guide](./getting-started/)
- [Best Practices](./best-practices.md)
