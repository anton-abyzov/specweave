# Phase 1: Project Context Resolution

Load this phase for project/board selection logic.

## Get Project Context (MANDATORY - BLOCKING!)

**Run BEFORE generating spec.md:**

```bash
# 1. Check existing patterns
ls .specweave/docs/internal/specs/
grep -r "^\*\*Project\*\*:" .specweave/increments/*/spec.md | tail -10
cat .specweave/config.json | jq '.project.name, .multiProject'

# 2. Get context from API
specweave context projects
```

**Output format (1-level):**
```json
{ "level": 1, "projects": [{"id": "my-app"}] }
```

**Output format (2-level):**
```json
{
  "level": 2,
  "projects": [{"id": "acme-corp"}],
  "boardsByProject": { "acme-corp": [{"id": "digital-ops"}] }
}
```

## Resolution Priority

```
1. EXACT MATCH: config.project.name → USE IT
2. LIVING DOCS: Existing folder in specs/ → USE IT
3. RECENT PATTERNS: Same feature type → USE SAME PROJECT
4. UNCERTAIN: Multiple valid options → ASK USER!
5. FALLBACK: No config → USE "default" (NEVER "specweave"!)
```

## Smart Selection Rules

**RULE 1: Auto-select when only 1 option**
```
1 project only → AUTO-SELECT silently
1 project + 1 board (2-level) → AUTO-SELECT silently
```

**RULE 2: Keyword detection**

| Domain | Keywords |
|--------|----------|
| Frontend | UI, form, React, Vue, Angular, dashboard, CSS |
| Backend | API, endpoint, database, JWT, service, CRUD |
| Mobile | iOS, Android, React Native, Flutter |
| Infra | deploy, Docker, Kubernetes, CI/CD, terraform |
| Shared | types, utilities, validators, SDK, models |

**RULE 3: Confidence-based decision**
```
>80% single → AUTO-SELECT + notify
50-80% → SUGGEST + confirm
<50% or ambiguous → ASK with all options
Multiple within 15% → AUTO-SPLIT USs
```

## Per-User-Story Assignment

Each US has its own project/board:

```markdown
### US-001: Login Form UI
**Project**: web-app
**Board**: frontend  <!-- 2-level only -->

### US-002: Auth API
**Project**: api-service
**Board**: backend  <!-- 2-level only -->
```

## Validation Rules

```
REQUIRED:
✅ RUN "specweave context projects" command
✅ Project field MUST match projects[].id from output
✅ Board field (2-level) MUST match boardsByProject[project][].id
✅ ASK USER when uncertain

FORBIDDEN:
❌ Skipping context API
❌ Using "specweave" as project name
❌ Using {{PROJECT_ID}} placeholders
❌ Creating 2-level spec without board field
```

## Next Phase

After project resolved, load `phases/02-create-increment.md`.
