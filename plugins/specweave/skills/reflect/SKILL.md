---
name: reflect
description: Self-improving AI memory system that persists learnings across sessions in skill-specific MEMORY.md files. Use when capturing corrections, remembering user preferences, or extracting patterns from successful implementations. Enables continual learning without starting from zero each conversation.
---

# Self-Improving Skills (Reflect)

## Overview

The Reflect system enables **continual learning across sessions**. Instead of starting from zero every conversation, Claude learns from corrections, successful patterns, and user preferences - persisting knowledge in **skill-specific MEMORY.md files**.

```
Session 1: User corrects button style → Reflect captures learning → saves to frontend skill
Session 2: Claude uses correct button style without being reminded
Session 3+: Knowledge compounds, Claude gets smarter over time
```

---

## Architecture

### Skill-Specific Memory

Each skill has its own MEMORY.md file storing learned patterns:

```
# Claude Code Environment
~/.claude/plugins/marketplaces/specweave/plugins/specweave/skills/
├── architect/
│   ├── SKILL.md              # Skill definition
│   └── MEMORY.md             # User learnings for this skill
├── frontend/
│   ├── SKILL.md
│   └── MEMORY.md             # Frontend-specific learnings
├── tech-lead/
│   ├── SKILL.md
│   └── MEMORY.md
└── ...

# Non-Claude Environment (project-local)
.specweave/plugins/specweave/skills/
├── architect/
│   ├── SKILL.md
│   └── MEMORY.md
└── ...

# Category Memory (fallback for non-skill learnings)
.specweave/memory/                  # Project learnings
├── component-usage.md
├── api-patterns.md
├── testing.md
├── deployment.md
└── general.md

~/.specweave/memory/                # Global learnings (all projects)
```

### Cross-Platform Support

| Platform | Skills Location | Detection |
|----------|-----------------|-----------|
| **macOS/Linux** | `~/.claude/plugins/marketplaces/specweave/...` | `CLAUDE_CODE=1` or marketplace exists |
| **Windows** | `%APPDATA%\Claude\plugins\marketplaces\specweave\...` | Same detection |
| **Non-Claude** | `.specweave/plugins/specweave/skills/` | Fallback when Claude Code not detected |

### Smart Memory Merging

When running `specweave refresh-marketplace` or `specweave init --refresh`:

1. **User learnings are ALWAYS preserved** (never overwritten)
2. **New defaults from marketplace are merged in** (deduplicated)
3. **Backup created before merge** (`.memory-backups/`)

```
User Memory + Default Memory → Merged Memory
    │              │                │
    │              │                └── Both preserved, deduped
    │              └── New patterns from marketplace
    └── Your corrections (ALWAYS kept)
```

---

## ⚠️ CRITICAL: Learning Extraction Rules

**This section is MANDATORY for Claude to follow when extracting learnings.**

### The Golden Rule

**NEVER store user input verbatim. ALWAYS synthesize into actionable rules.**

### What Makes a Good Learning

| Good Learning | Bad Learning | Why Bad |
|--------------|--------------|---------|
| `Use vi.fn() for mocks in Vitest, never jest.fn()` | `use vi.fn() for mocks in Vitest, never jest.fn()` | OK but could be improved with reasoning |
| `Always specify npm registry to avoid auth errors with private packages` | `Always specify registry to avoid ~/` | Truncated, loses meaning |
| `Voice dictation mangles slash commands - type manually or use clipboard` | `always command not recognized` | Raw symptom, not the learning |
| `For API tests, use os.tmpdir() for temp files to avoid polluting project directory` | `Where should I deploy?` | This is a question, not a learning! |
| `The /sw:increment skill requires an increment name argument` | `never used in any user pojrect based on specweave` | Gibberish from partial capture |

### Learning Quality Checklist (MUST PASS ALL)

Before storing ANY learning, verify:

1. **✅ Is it a complete sentence?** Not truncated, not a fragment
2. **✅ Is it actionable?** Contains DO/DON'T/USE/AVOID/PREFER
3. **✅ Is it specific?** Names tools, patterns, files, or concepts
4. **✅ Is it understandable standalone?** Someone reading it later would understand
5. **✅ Is it NOT a question?** Questions are never learnings
6. **✅ Is it NOT a complaint?** Complaints need transformation
7. **✅ Does it have context?** WHY this rule exists, not just WHAT

### Transformation Examples

**User says a complaint → Claude extracts the underlying learning:**

```
USER: "When I use voice control, it always gives me 'command not recognized'"

WRONG extraction:
  - → always command not recognized
  - → voice control gives command not recognized

CORRECT extraction:
  - → Voice dictation can mangle slash command syntax (e.g., "/sw:increment" becomes "slash S W increment"). Type commands manually or use clipboard paste for reliable execution.
```

**User makes a correction → Claude extracts the rule:**

```
USER: "No, don't use jest.fn(), we use Vitest here"

WRONG extraction:
  - → don't use jest.fn()

CORRECT extraction:
  - → Use vi.fn() not jest.fn() with Vitest testing framework. Import mocks from 'vitest' package.
```

**User approves something → Claude extracts the pattern:**

```
USER: "Perfect! That's exactly how we handle errors"

WRONG extraction:
  - → Perfect! That's exactly how we handle errors

CORRECT extraction (look at WHAT was approved):
  - → For API error responses, use { success: false, error: { code: string, message: string } } structure
```

### What to REJECT (Never Store)

1. **Questions** - `"Where should I deploy?"` → NOT a learning
2. **Fragments** - `"eplicilty how to g"` → Truncated garbage
3. **Raw symptoms** - `"always command not recognized"` → No explanation
4. **Duplicates** - Same rule phrased differently
5. **Temporary context** - `"for this PR"`, `"just this time"`
6. **Personal preferences** - Without universal applicability
7. **Typos/gibberish** - `"user pojrect"`, `"promp"`

### Memory Format Requirements

Each entry MUST follow this format:

```markdown
- → {VERB} {specific action} {context/reason if helpful}
```

Or for corrections:
```markdown
- ✗→✓ {wrong way} → {right way} {reason}
```

**Examples of proper format:**
```markdown
- → Use vi.fn() for mocks in Vitest, never jest.fn()
- → Use os.tmpdir() for test temp files, not project cwd
- ✗→✓ Never suggest scripts/refresh-marketplace.sh to end users - use `specweave refresh-marketplace` CLI command
- → Voice dictation mangles slash commands - type manually or paste from clipboard
```

### Extraction Process

When `/sw:reflect` is invoked:

1. **Scan conversation** for signals (corrections, rules, approvals, complaints)
2. **For each signal**, apply transformation:
   - Corrections → Extract the rule being taught
   - Rules → Preserve the rule with context
   - Approvals → Extract WHAT was approved (look at Claude's previous message)
   - Complaints → Transform into actionable workaround/solution
3. **Validate** each extraction against the quality checklist
4. **REJECT** any that fail validation (better to store nothing than garbage)
5. **Deduplicate** against existing memory
6. **Store** with proper format

### Self-Check Before Storing

Ask yourself:
> "If I read this learning in 6 months with no context, would it help me?"

If NO → Don't store it.
If MAYBE → Improve it until YES.
If YES → Store it.

---

## The Problem

Every LLM session starts from zero:

1. **Monday**: You correct Claude - "Use our primary button component, not a custom style"
2. **Tuesday**: Claude makes the same mistake again
3. **Wednesday**: Same correction, same frustration
4. **Forever**: Without memory, you're repeating yourself indefinitely

This manifests as:
- Wrong naming conventions
- Incorrect logging patterns
- Missing input validation
- Wrong component usage
- Forgotten architectural decisions

---

## The Solution

Reflect analyzes sessions and persists learnings in **skill-specific MEMORY.md files**:

```markdown
# frontend skill's MEMORY.md

# Skill Memory: frontend

> Auto-generated by SpecWeave Reflect v4.0
> Last updated: 2026-01-06T10:30:00Z
> Skill: frontend

## Learned Patterns

### LRN-20260106-A1B2 (correction, high)
**Content**: Always use `<Button variant='primary'>` from `@/components/ui/button` for primary actions. Never create custom button styles.
**Context**: User corrected button component usage in settings page
**Triggers**: button, primary, action, component
**Added**: 2026-01-06
**Source**: session:2026-01-06
```

**Key benefit**: Learnings are stored with the skill they apply to, automatically loaded when that skill activates.

---

## How It Works

### 1. Signal Detection (ENHANCED - v4.1)

Reflect identifies signals in conversation and **captures FULL context**:

**⚠️ CRITICAL: Context Must Include the PROBLEM, Not Just the Fix**

When a user explains a problem like:
```
User: "When I use voice control, it always gives me 'command not recognized'"
```

The system MUST capture:
- **CONTEXT**: "When using voice control with skill commands" (the circumstance)
- **LEARNING**: "Voice dictation can mangle command syntax - type commands or use clipboard" (the fix)
- **SKILL**: If a skill name is mentioned (e.g., "the detector skill"), route there

**DO NOT** store just: `"always command not recognized"` ← This loses all meaning!

---

**Corrections (High Confidence)**
```
User: "No, don't use that button. Use our <Button variant='primary'> component."
      → CONTEXT: User corrected button component usage in settings page
      → LEARNING: Always use Button component with variant='primary' from design system
      → SKILL: frontend (auto-detected)
      → CONFIDENCE: high
```

**Rules (High Confidence)**
```
User: "Always use the logger module instead of console.log"
      → CONTEXT: User established logging convention for the project
      → LEARNING: Use logger module for all logging, never console.log
      → SKILL: tech-lead (auto-detected)
      → CONFIDENCE: high
```

**Problem Reports (High Confidence) - NEW!**
```
User: "The detector skill doesn't recognize commands when I use voice input"
      → CONTEXT: Voice dictation causes command parsing issues
      → LEARNING: Voice input mangles command syntax - recommend typing or clipboard
      → SKILL: detector (explicit skill name detected!)
      → CONFIDENCE: high
```

**Approvals (Medium Confidence)**
```
User: "Perfect! That's exactly how our API patterns should look."
      → CONTEXT: User approved API response structure pattern
      → LEARNING: Continue using this API pattern structure with status, data, error fields
      → SKILL: backend (auto-detected)
      → CONFIDENCE: medium
```

### 2. Skill Auto-Detection (ENHANCED - v4.1)

Learnings are routed using a **priority-based detection system**:

#### Priority 1: Explicit Skill Name Mention (Highest Priority)
If the user mentions a skill by name, route directly to that skill:
```
"the detector skill doesn't work" → detector skill
"increment-planner has a bug" → increment-planner skill
"service-connect is failing" → service-connect skill
```

**Detection pattern**: `(the\s+)?(\w+[-\w]*)\s+(skill|command|agent)`

#### Priority 2: Keyword-Based Detection
If no explicit skill is mentioned, use keyword matching:

| Skill | Keywords |
|-------|----------|
| `architect` | architecture, system design, adr, microservices, api design, schema |
| `tech-lead` | code review, best practices, refactoring, technical debt, solid |
| `qa-lead` | test strategy, qa, quality gates, regression, tdd, bdd |
| `security` | security, owasp, authentication, authorization, encryption |
| `frontend` | react, vue, component, ui, css, tailwind, button, form |
| `backend` | api, endpoint, route, rest, graphql, server, middleware |
| `database` | database, sql, query, schema, migration, prisma, postgres |
| `testing` | test, spec, mock, vitest, jest, playwright, cypress |
| `devops` | docker, kubernetes, ci/cd, pipeline, deploy, github actions |
| `infrastructure` | terraform, iac, aws, azure, gcp, serverless |
| `performance` | performance, optimization, profiling, caching, latency |
| `docs-writer` | documentation, readme, api docs, technical writing |

#### Priority 3: Category Fallback
If no skill matches, route to category memory (`.specweave/memory/{category}.md`)

### 3. Learning Format

Each learning is structured:

```typescript
interface Learning {
  id: string;           // LRN-YYYYMMDD-XXXX
  timestamp: string;    // ISO 8601
  type: 'correction' | 'rule' | 'approval';
  confidence: 'high' | 'medium' | 'low';
  content: string;      // The actual learning
  context?: string;     // What triggered it
  triggers: string[];   // Keywords for matching
  source: string;       // session:YYYY-MM-DD
}
```

### 4. Memory Persistence

Learnings are written to skill-specific MEMORY.md files:

```markdown
# Skill Memory: frontend

> Auto-generated by SpecWeave Reflect v4.0
> Last updated: 2026-01-06T10:30:00Z
> Skill: frontend

## Learned Patterns

### LRN-20260106-A1B2 (correction, high)
**Content**: Always use `<Button variant='primary'>` from design system
**Context**: User corrected button usage
**Triggers**: button, primary, component
**Added**: 2026-01-06
**Source**: session:2026-01-06

### LRN-20260105-C3D4 (rule, high)
**Content**: Use PascalCase for component files: `UserProfile.tsx`
**Triggers**: component, naming, file, tsx
**Added**: 2026-01-05
**Source**: session:2026-01-05
```

---

## Usage

### Manual Reflection

After completing work, manually trigger reflection:

```bash
# Reflect on current session (auto-detects skills)
/sw:reflect

# Reflect targeting a specific skill
/sw:reflect --skill frontend

# Reflect with focus prompt
/sw:reflect "Focus on the database query patterns we discussed"
```

### Skill-Specific Reflection

Route learnings directly to a skill:

```bash
# Add learning to frontend skill
/sw:reflect --skill frontend "Always use shadcn Button component"

# Add learning to testing skill
/sw:reflect --skill testing "Use vi.fn() not jest.fn() with Vitest"

# Add learning to architect skill
/sw:reflect --skill architect "Prefer event-driven over request-response"
```

### View Skill Memories

```bash
# List all skills with memory counts
/sw:reflect-status

# View specific skill's learnings
cat ~/.claude/plugins/marketplaces/specweave/plugins/specweave/skills/frontend/MEMORY.md
```

### Status Dashboard Output (for `/sw:reflect-status`)

When generating the reflect status dashboard, follow this enhanced format:

#### Section 1: Configuration (as before)
Show reflection enabled status, auto-reflect, dates, thresholds.

#### Section 2: 🎯 LEARNING FOCUS - What Reflection Learns

**CRITICAL**: This section must clearly show **WHAT** each category learns.

For each memory file in `.specweave/memory/`:
1. **Count learnings** (lines starting with `- ` or `- ✗→✓`)
2. **Calculate percentage** of total learnings
3. **Generate visual bar** (10 blocks: `■` for filled, `□` for empty)
4. **Add description** explaining what this category captures

**Format**:
```
Project Skills (.specweave/memory/):
  • general.md         12 learnings  ■■■■■■□□□□ 40%
    └─ Project conventions, file organization, tooling preferences

  • testing.md          8 learnings  ■■■■□□□□□□ 27%
    └─ Test patterns, mocking, framework usage (Vitest, Playwright)
```

**Category Descriptions** (use these exact descriptions):

| File | Description |
|------|-------------|
| `general.md` | Project conventions, file organization, tooling preferences |
| `testing.md` | Test patterns, mocking, framework usage (Vitest, Playwright) |
| `api-patterns.md` | API design, endpoint patterns, REST/GraphQL conventions |
| `database.md` | Query patterns, schema design, ORM usage, migrations |
| `git.md` | Commit messages, branching, Git workflows |
| `logging.md` | Logger usage, log levels, structured logging |
| `component-usage.md` | UI component patterns, styling, component composition |
| `deployment.md` | Deploy commands, CI/CD, service configuration |
| `security.md` | Auth patterns, validation, secrets management |
| `structure.md` | File/module organization, import patterns |

#### Section 3: Recent Activity

Show last modified file and extract recent learnings with confidence levels.

#### Section 4: Commands

Show available commands with context-aware hints (e.g., "already on" when enabled).

#### Section 5: Summary Paragraph

End with a plain English summary like:
```
The reflection system is actively learning from your corrections. Auto-reflection
is enabled, so learnings will be automatically captured when you end sessions.

You have 30 learnings across 5 categories with recent activity in general
project rules and API patterns.
```

### Automatic Reflection

Enable auto-reflection on session end:

```bash
# Enable automatic reflection (via stop hook)
/sw:reflect-on

# Disable automatic reflection
/sw:reflect-off

# Check reflection status
/sw:reflect-status
```

When enabled, the stop hook automatically:
1. Analyzes the session transcript
2. Extracts corrections and approvals
3. Auto-detects relevant skills
4. Updates skill MEMORY.md files
5. Falls back to category memory for non-skill learnings

---

## Memory Merging During Updates

### What Happens on `specweave refresh-marketplace`

1. **Step 1**: Download latest marketplace
2. **Step 2**: Install plugins
3. **Step 3**: Copy skills to installed location
4. **Step 4**: **Merge skill memories**
   - Reads user's existing MEMORY.md files
   - Reads any new default learnings from marketplace
   - Merges: user learnings + new defaults (deduplicated)
   - Writes merged result
   - Creates backup in `.memory-backups/`
5. **Step 5**: Update instruction files

### Merge Rules

| Scenario | Result |
|----------|--------|
| User has learning, marketplace doesn't | **User learning preserved** |
| Marketplace has learning, user doesn't | **Learning added** |
| Both have similar learning | **User's version kept** (deduplication) |
| Both have different learnings | **Both kept** |

### Deduplication Strategy

Learnings are considered duplicates if:
- Content is substring of the other (>50% overlap)
- Triggers have >50% keyword overlap
- Same ID (exact match)

---

## Configuration

### Global Settings

In `~/.claude/settings.json`:

```json
{
  "reflect": {
    "enabled": true,
    "autoReflect": false,
    "confidenceThreshold": "medium",
    "maxLearningsPerSession": 10,
    "maxLearningsPerSkill": 50
  }
}
```

### Project Settings

In `.specweave/config.json`:

```json
{
  "reflect": {
    "enabled": true,
    "autoReflect": true,
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

---

## Confidence Levels

| Level | Signal Type | Example | Action |
|-------|------------|---------|--------|
| **High** | Explicit correction | "No, use X instead of Y" | Auto-add to skill memory |
| **High** | Explicit rule | "Always do X" | Auto-add to skill memory |
| **Medium** | Approval/confirmation | "Perfect!" | Add with lower priority |
| **Low** | Observation | Pattern worked well | Queue for review |

---

## Category Fallback

When a learning doesn't match any skill, it goes to category memory:

| Category | Description | Triggers |
|----------|-------------|----------|
| `component-usage` | UI component patterns | button, component, ui, style |
| `api-patterns` | API design and endpoints | api, endpoint, route, rest |
| `database` | Query patterns, schema | query, database, sql, schema |
| `testing` | Test patterns and coverage | test, spec, coverage, mock |
| `deployment` | Deploy commands and config | deploy, wrangler, vercel, ci |
| `security` | Auth, validation, secrets | auth, security, validation |
| `structure` | File/module organization | file, path, import, module |
| `general` | Everything else | (fallback) |

Category memory location:
- **Project**: `.specweave/memory/{category}.md`
- **Global**: `~/.specweave/memory/{category}.md`

---

## Integration with Auto Mode

When `/sw:auto` runs with reflection enabled:

```
1. Start auto session
      ↓
2. Claude executes tasks
      ↓
3. User makes corrections (if any)
      ↓
4. Session completes (all tasks done)
      ↓
5. Stop hook triggers
      ↓
6. Reflect analyzes transcript
      ↓
7. Skills auto-detected from learnings
      ↓
8. MEMORY.md files updated per skill
      ↓
9. Session ends with summary
```

---

## API Reference (TypeScript)

```typescript
import {
  // Path resolution
  getSkillsDirectory,
  getSkillMemoryPath,
  listSkills,
  skillExists,
  isClaudeCodeEnvironment,

  // Memory operations
  readMemoryFile,
  writeMemoryFile,
  addLearning,
  mergeMemoryFiles,

  // Reflection management
  detectSkill,
  processSignals,
  reflectOnSkill,
  getSkillLearnings,
  getReflectionStats,
} from 'specweave/core/reflection';

// Add learning to a skill
reflectOnSkill('frontend', [
  { content: 'Use Button component from design system', type: 'correction' }
]);

// Get all learnings for a skill
const learnings = getSkillLearnings('frontend');

// Get stats across all skills
const stats = getReflectionStats();
console.log(`Total learnings: ${stats.totalLearnings}`);
```

---

## Best Practices

### For Corrections

**Good corrections (high signal)**:
```
"Never use that approach. Always use X because..."
"Don't create custom components. We have a design system..."
"Wrong pattern. The correct way is..."
```

**Weak corrections (low signal)**:
```
"Hmm, maybe try something else?"
"That doesn't look quite right"
```

### For Approvals

**Strong approval (captured)**:
```
"Perfect! That's exactly how we do it."
"This is the right pattern, well done."
"Yes, always follow this approach."
```

**Neutral (not captured)**:
```
"OK"
"Sure"
"Proceed"
```

### Memory Organization

1. **Skill-specific** learnings go to skill's MEMORY.md
2. **Category** learnings go to `.specweave/memory/{category}.md`
3. **Global** learnings go to `~/.specweave/memory/`

---

## Privacy & Security

- Memory files contain only **patterns and learnings**, not raw conversation
- No sensitive data (credentials, keys) is ever stored
- Memory files can be gitignored if needed
- Clear commands available:
  - `/sw:reflect-clear` - Clear all learnings
  - `/sw:reflect-clear --skill frontend` - Clear specific skill
  - `/sw:reflect-clear --learning LRN-XXX` - Remove specific learning

---

## Troubleshooting

### Learnings Not Persisting

1. Check reflection is enabled: `/sw:reflect-status`
2. Verify skills directory exists:
   ```bash
   # Claude Code
   ls ~/.claude/plugins/marketplaces/specweave/plugins/specweave/skills/

   # Non-Claude
   ls .specweave/plugins/specweave/skills/
   ```
3. Check file permissions
4. Review logs: `.specweave/logs/reflect/`

### Wrong Skill Detection

Force routing to specific skill:
```bash
/sw:reflect --skill frontend "Use Button component"
```

### Memory Not Loading

1. Verify MEMORY.md exists for the skill
2. Check skill is activated (keywords match)
3. Restart Claude Code after marketplace refresh

### Rollback a Learning

```bash
# View backup
ls ~/.claude/plugins/.../skills/frontend/.memory-backups/

# Restore from backup
cp ~/.claude/plugins/.../skills/frontend/.memory-backups/MEMORY-2026-01-05T10-30-00.md \
   ~/.claude/plugins/.../skills/frontend/MEMORY.md
```

---

## Migration from v3.0

If you have learnings in the old centralized format:

1. **Centralized memory files are still supported** as category fallback
2. **New learnings go to skill-specific MEMORY.md** automatically
3. **No migration required** - both systems work together

To manually migrate old learnings:
```bash
# View old centralized memory
cat .specweave/memory/component-usage.md

# Add to specific skill
/sw:reflect --skill frontend "Learning content from old file"
```

---

## Summary

Reflect v4.0 enables **correct once, apply everywhere**:

1. Make correction during session
2. Reflect captures and routes to skill
3. Future sessions load skill memory
4. Claude applies learned patterns automatically
5. Marketplace updates preserve your learnings

**No embeddings. No vector databases.** Just markdown files that compound knowledge, organized by skill.
