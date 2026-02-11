# ADR-0232: Deep Interview Mode

**Date**: 2026-01-31
**Status**: Accepted

## Context

Users building large features benefit from extensive upfront questioning about architecture, integrations, UI/UX, and tradeoffs. Thariq (@trq212, Claude Code creator) demonstrated this pattern where Claude asks many in-depth questions for big features, resulting in much more detailed and comprehensive specifications.

Current SpecWeave behavior jumps straight to spec creation without extensive discovery. This works for simple features but misses important architectural considerations for complex features involving:
- External service integrations (databases, APIs, auth providers)
- Overall system architecture decisions
- UI/UX concerns and tradeoffs
- Performance considerations
- Edge cases and error handling

## Decision

Add a **Deep Interview Mode** that:

1. **Is a global project setting** stored in `.specweave/config.json`
2. **Is disabled by default** (opt-in during `specweave init`)
3. **When enabled**, triggers extensive questioning during `/sw:increment`:
   - Technical implementation approaches
   - External integrations (databases, APIs, auth, payments)
   - Architecture patterns (microservices, monolith, serverless)
   - UI/UX concerns and tradeoffs
   - Performance and scalability considerations
   - Edge cases, error handling, failure modes
   - Security implications

### Config Schema

```json
{
  "planning": {
    "deepInterview": {
      "enabled": false,
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

### Activation Points

1. **Init wizard** - Ask during `specweave init`:
   ```
   🎤 Deep Interview Mode

   Claude asks 5-40 questions (scaled to complexity) about architecture,
   integrations, UI/UX, and tradeoffs before creating specs.

   Enable Deep Interview Mode? [y/N]
   ```

2. **Increment creation** (`/sw:increment`) - When enabled:
   - PM skill reads config and enters interview mode
   - Uses `AskUserQuestion` tool for structured multi-choice questions
   - Continues until all categories covered or user signals completion
   - Only then generates comprehensive spec.md

3. **User-prompt-submit hook** - Can inject reminder:
   ```
   Deep Interview Mode is ENABLED.
   Before creating spec, ask thorough questions about:
   - Architecture & integrations
   - UI/UX tradeoffs
   - Performance & security
   - Edge cases & error handling
   ```

### Skill Modifications

**PM Skill** (`plugins/specweave/skills/pm/SKILL.md`):
- Add phase `phases/00-interview.md` for deep interview mode
- Check config: `jq -r '.planning.deepInterview.enabled' .specweave/config.json`
- If enabled, load interview phase before research phase

**Architect Skill** (`plugins/specweave/skills/architect/SKILL.md`):
- Also check deep interview mode
- Ask architecture-specific questions if enabled

**Increment Planner** (`plugins/specweave/skills/increment-planner/SKILL.md`):
- Detect deep interview mode in pre-flight
- Pass flag to PM/Architect skills

## Alternatives Considered

1. **Per-increment flag**: Allow `--deep-interview` on `/sw:increment`
   - Rejected: Creates inconsistent experience, users forget to add flag
   - Kept as future enhancement for explicit override

2. **Always-on interview**: Make extensive questioning default
   - Rejected: Too slow for simple features, may annoy users
   - Deep interview best for complex features only

3. **Question count configuration**: Let users set exact number
   - Partially adopted: `minQuestions` setting available but not required

## Consequences

**Positive**:
- Better specs for complex features
- More thorough upfront planning
- Catches integration issues early
- Matches Thariq's recommended workflow

**Negative**:
- Longer time-to-spec for big features (intentional)
- More prompts during init wizard
- Skills need modification to check config

**Migration**:
- Existing projects: Not affected (disabled by default)
- New projects: Option presented during init
- Upgrade path: Can enable via config.json edit
