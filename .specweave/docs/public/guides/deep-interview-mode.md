# Deep Interview Mode

**Version**: 1.0.195+

Deep Interview Mode enables comprehensive upfront questioning during increment planning. When enabled, Claude asks 40+ questions about architecture, integrations, UI/UX, and tradeoffs before creating specifications.

## Overview

This feature is inspired by Thariq's (@trq212, Claude Code creator) workflow:

> "For big features or new projects Claude might ask me 40+ questions and I end up with a much more detailed spec that I feel I had a lot of control over."

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

For big features, Claude can ask 40+ questions about architecture,
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
      "minQuestions": 10,
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

### 1. Detection

When you create an increment via `/sw:increment`, the hook detects Deep Interview Mode:

```
DEEP INTERVIEW MODE ENABLED
Before creating spec.md, you MUST ask thorough questions about:
- Architecture & system design patterns
- External integrations (APIs, databases, auth)
- UI/UX concerns and tradeoffs
- Performance & scalability requirements
- Security considerations
- Edge cases & error handling
```

### 2. Interview Phase

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

| Feature Size | Expected Questions |
|--------------|-------------------|
| Small (bugfix, tweak) | 10-15 |
| Medium (new page, API) | 20-30 |
| Large (new feature) | 40+ |

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

Minimum questions before proceeding (soft limit).

```json
"minQuestions": 10
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
