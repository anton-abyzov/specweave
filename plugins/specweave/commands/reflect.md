---
name: sw:reflect
description: Analyze current session and extract learnings to skill memory files. Enables self-improving AI that learns from corrections and patterns. Activates for reflect, remember, learn from session, extract learnings.
---

# Reflect Command

**Analyze session and extract learnings to skill memory files.**

## Usage

```bash
# Reflect on current session (analyzes all signals)
/sw:reflect

# Reflect on specific skill only
/sw:reflect --skill frontend

# Reflect with focus prompt
/sw:reflect "Focus on the API patterns we discussed"

# Dry run - show what would be learned without saving
/sw:reflect --dry-run

# Clear specific learning
/sw:reflect-clear --learning LRN-2026-01-05-001
```

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `--skill <name>` | Only extract learnings for this skill | All relevant |
| `--dry-run` | Show learnings without saving | false |
| `--confidence <level>` | Minimum confidence: high, medium, low | medium |
| `--max <n>` | Maximum learnings to extract | 10 |
| `<focus>` | Natural language focus for extraction | All signals |

## How It Works

### Step 1: Signal Detection

Scans conversation for two signal types:

**Corrections (High Confidence)**
```
User: "No, don't use that button. Use our <Button variant='primary'>"
      → Detected: CORRECTION
      → Category: component-usage
      → Confidence: high
```

**Approvals (Medium Confidence)**
```
User: "Perfect! That's exactly how our API should look."
      → Detected: APPROVAL
      → Category: api-patterns
      → Confidence: medium
```

### Step 2: Learning Extraction

Each detected signal is structured:

```json
{
  "id": "LRN-2026-01-05-001",
  "type": "correction",
  "confidence": "high",
  "category": "component-usage",
  "learning": "Always use <Button variant='primary'> for primary actions",
  "triggers": ["button", "primary", "action"],
  "skill": "frontend"
}
```

### Step 3: Skill Matching

Learnings are matched to relevant skills:

| Category | Skill | Memory File |
|----------|-------|-------------|
| component-usage | frontend | ~/.claude/skills/frontend/MEMORY.md |
| api-patterns | backend | ~/.claude/skills/backend/MEMORY.md |
| testing | qa | ~/.claude/skills/qa/MEMORY.md |
| deployment | devops | ~/.claude/skills/devops/MEMORY.md |

### Step 4: Memory Update

Updates skill MEMORY.md files:

```markdown
# Frontend Skill Memory

## Learned Patterns (Auto-Generated)

### Component Usage

#### LRN-2026-01-05-001 (High Confidence)
**Context**: User corrected button component usage
**Learning**: Always use `<Button variant='primary'>` for primary actions
**Triggers**: button, primary, action
**Added**: 2026-01-05
```

### Step 5: Review & Approval

Before saving, shows proposed changes:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 REFLECT: Learnings Detected
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 SIGNALS DETECTED:
  • Corrections: 2
  • Approvals: 1
  • Total learnings: 3

📝 PROPOSED CHANGES:

1. [HIGH] frontend/MEMORY.md
   + LRN-001: Always use Button component with variant='primary'
   Category: component-usage
   Triggers: button, primary, action

2. [HIGH] testing/MEMORY.md
   + LRN-002: Use storageState for Playwright auth
   Category: e2e-testing
   Triggers: playwright, auth, login

3. [MEDIUM] api/MEMORY.md
   + LRN-003: Return 404 for missing resources (not 500)
   Category: error-handling
   Triggers: api, error, 404

💾 COMMIT MESSAGE:
   "learn: Extract 3 learnings from session (2 corrections, 1 approval)"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Options:
  [Y] Accept and save
  [N] Cancel
  [E] Edit learnings
  [V] View details
```

### Step 6: Git Commit (Optional)

If git integration enabled:

```bash
git add ~/.claude/skills/*/MEMORY.md
git commit -m "learn: Extract 3 learnings from session (2 corrections, 1 approval)"
git push  # If autoPush enabled
```

## Configuration

### Project Config (`.specweave/config.json`)

```json
{
  "reflect": {
    "enabled": true,
    "autoReflect": false,
    "confidenceThreshold": "medium",
    "maxLearningsPerSession": 10,
    "skillsPath": ".specweave/skills",
    "gitCommit": true,
    "gitPush": false,
    "categories": [
      "component-usage",
      "api-patterns",
      "testing",
      "deployment",
      "security",
      "database"
    ]
  }
}
```

### Global Config (`~/.claude/settings.json`)

```json
{
  "reflect": {
    "globalSkillsPath": "~/.claude/skills",
    "retentionDays": 90
  }
}
```

## Examples

### Basic Reflection

```bash
/sw:reflect
```

Output:
```
🧠 Analyzing session for learnings...

Detected:
  ✅ Correction: Button component usage → frontend/MEMORY.md
  ✅ Correction: API error handling → api/MEMORY.md
  ⚠️ Approval: Query pattern → database/MEMORY.md (medium confidence)

Saved 3 learnings to skill memory files.
Commit: learn: Extract 3 learnings from session
```

### Skill-Specific Reflection

```bash
/sw:reflect --skill testing
```

Output:
```
🧠 Analyzing session for testing-related learnings...

Detected:
  ✅ Correction: Playwright auth pattern → testing/MEMORY.md

Saved 1 learning to testing skill.
```

### Dry Run

```bash
/sw:reflect --dry-run
```

Output:
```
🧠 DRY RUN - Showing what would be learned:

1. [HIGH] frontend/MEMORY.md
   + Always use Button component with variant='primary'

2. [MEDIUM] api/MEMORY.md
   + Return 404 for missing resources

No changes saved (dry run mode).
```

## Memory File Format

Each skill's MEMORY.md follows this structure:

```markdown
# [Skill Name] Memory

> Auto-generated by SpecWeave Reflect. Do not edit manually.
> Last updated: 2026-01-05T10:30:00Z

## Learned Patterns

### [Category]

#### LRN-YYYY-MM-DD-NNN (Confidence)
**Context**: What triggered this learning
**Learning**: The actual pattern/rule to follow
**Triggers**: keyword1, keyword2, keyword3
**Added**: YYYY-MM-DD
**Source**: session:session-id

---

### [Another Category]

[More learnings...]
```

## Related Commands

| Command | Purpose |
|---------|---------|
| `/sw:reflect-on` | Enable automatic reflection on session end |
| `/sw:reflect-off` | Disable automatic reflection |
| `/sw:reflect-status` | Show reflection configuration |
| `/sw:reflect-clear` | Remove specific learnings |

## Related Skills

- **reflect** - Full skill documentation
- **context-loader** - How skills are loaded progressively

## Execution

When this command is invoked:

1. **Scan conversation** for correction and approval signals
2. **Extract learnings** with confidence levels
3. **Match to skills** based on category
4. **Show preview** of proposed changes
5. **Save to MEMORY.md** files on approval
6. **Git commit** if configured
7. **Show confirmation** with learning summary
