# Self-Improving AI (Reflect) - User Guide

> **Version**: 4.1
> **Last Updated**: 2026-01-10

This guide covers everything you need to know about using SpecWeave's self-improving AI feature from `specweave init` to active usage.

---

## Quick Start

After running `specweave init`, the Reflect feature is **automatically enabled**:

```bash
$ specweave init .
...
   ✓ Auto-reflection enabled (self-improving AI)
```

That's it! The system will now learn from your corrections.

---

## What Gets Learned?

### High-Value Signals (Captured)

| Signal Type | Example | Confidence |
|-------------|---------|------------|
| **Corrections** | "No, don't use that. Use X instead." | High |
| **Explicit Rules** | "Always use logger instead of console.log" | High |
| **Problem Reports** | "The detector skill fails with voice input" | High |
| **Strong Approvals** | "Perfect! That's exactly how we do it." | Medium |

### Noise (Ignored)

| Signal Type | Example | Why Ignored |
|-------------|---------|-------------|
| Generic praise | "Great!", "Perfect!" | No actionable info |
| Vague approval | "OK", "Sure" | Too ambiguous |
| Short responses | "Yes" | No context |

---

## How It Works

### 1. You Make a Correction

```
You: "No, don't use custom HTML buttons. Use our <Button variant='primary'> component."
```

### 2. System Detects and Routes

```
Signal Type: CORRECTION
Detected Skill: frontend (keywords: button, component)
Learning: Always use Button component with variant='primary' from design system
```

### 3. Stored in Skill Memory

```markdown
# ~/.claude/.../skills/frontend/MEMORY.md

#### LRN-20260110-A1B2 (High Confidence)
**Learning**: Always use Button component with variant='primary' from design system
**Added**: 2026-01-10
**Source**: session:2026-01-10
```

### 4. Future Sessions Apply Learning

Claude automatically uses correct button component in future sessions.

---

## Commands Reference

| Command | Purpose |
|---------|---------|
| `/sw:reflect` | Manual reflection on current session |
| `/sw:reflect-on` | Enable auto-reflection (default) |
| `/sw:reflect-off` | Disable auto-reflection |
| `/sw:reflect-status` | Show config and learning stats |
| `/sw:reflect-clear` | Clear specific learnings |

### Examples

```bash
# Manual reflection after completing work
/sw:reflect

# Target specific skill
/sw:reflect --skill frontend

# Dry run (preview without saving)
/sw:reflect --dry-run

# Check status
/sw:reflect-status

# Clear specific learning
/sw:reflect-clear --learning LRN-20260110-A1B2
```

---

## Understanding the Status Dashboard

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 REFLECT: Status Dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 CONFIGURATION

  Reflection:      ✅ Enabled
  Auto-reflect:    ✅ On (stop hook active)
  Confidence:      medium
  Max/session:     10

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 SKILL LEARNINGS

  • frontend:      8 learnings  ■■■■■□□□□□ 40%
  • testing:       5 learnings  ■■□□□□□□□□ 25%
  • architect:     4 learnings  ■■□□□□□□□□ 20%

📁 CATEGORY LEARNINGS (fallback)

  • general.md:    3 learnings  ■□□□□□□□□□ 15%

Total: 20 learnings
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Where Are Learnings Stored?

### Claude Code Environment (Recommended)

```
~/.claude/plugins/marketplaces/specweave/
├── plugins/specweave/skills/
│   ├── frontend/
│   │   ├── SKILL.md              # Skill definition
│   │   └── MEMORY.md             # Your learnings ← HERE
│   ├── architect/
│   │   └── MEMORY.md
│   └── ...
└── memory/
    └── general.md                # Category fallback
```

### Project-Local (Non-Claude)

```
.specweave/
├── plugins/specweave/skills/     # If skills copied locally
│   └── {skill}/MEMORY.md
└── memory/
    ├── general.md
    ├── testing.md
    └── ...
```

---

## Skill Routing

Learnings are automatically routed to skills based on content:

| If Learning Contains | Routes To |
|---------------------|-----------|
| button, component, UI, React | `frontend` |
| API, endpoint, route, REST | `backend` |
| test, mock, Playwright, Vitest | `testing` |
| architecture, ADR, microservices | `architect` |
| security, OWASP, auth, XSS | `security` |
| terraform, AWS, serverless | `infrastructure` |
| docker, kubernetes, CI/CD | `devops` |
| database, SQL, schema, Prisma | `database` |
| (none of above) | Category fallback |

### Explicit Skill Targeting

You can force routing to a specific skill:

```
You: "The detector skill always fails with voice commands"
     → Routes to: detector skill (explicit mention)

You: "Remember for the architect skill: always use event sourcing"
     → Routes to: architect skill (explicit mention)
```

---

## Configuration

### Project Settings

`.specweave/state/reflect-config.json`:

```json
{
  "enabled": true,
  "autoReflect": true,
  "enabledAt": "2026-01-10T10:00:00Z",
  "confidenceThreshold": "medium",
  "maxLearningsPerSession": 10,
  "gitCommit": false,
  "gitPush": false
}
```

### Configuration Options

| Setting | Default | Description |
|---------|---------|-------------|
| `enabled` | `true` | Master enable/disable |
| `autoReflect` | `true` | Auto-reflect on session end |
| `confidenceThreshold` | `"medium"` | `high`, `medium`, or `low` |
| `maxLearningsPerSession` | `10` | Max learnings per session |
| `gitCommit` | `false` | Auto-commit memory changes |
| `gitPush` | `false` | Auto-push after commit |

---

## Troubleshooting

### "No learnings being captured"

1. **Check reflection is enabled**:
   ```bash
   /sw:reflect-status
   ```

2. **Check for actionable signals**:
   Your corrections must be explicit:
   - ❌ "hmm, try something else" (too vague)
   - ✅ "No, use X instead of Y" (explicit correction)

3. **Try manual reflection**:
   ```bash
   /sw:reflect --dry-run
   ```

4. **Check logs**:
   ```bash
   cat .specweave/logs/reflect/reflect.log
   ```

### "Wrong skill detected"

Force routing to correct skill:

```bash
/sw:reflect --skill frontend
```

Or explicitly mention the skill in your correction:

```
"For the frontend skill: always use our Button component"
```

### "Duplicate learnings"

The system has 6-strategy deduplication:
- Same ID
- Exact match
- Substring match
- Core phrase extraction
- Keyword overlap (50%+)

If you see duplicates, report as bug.

### "Learnings lost after marketplace update"

Learnings are preserved during `specweave refresh-marketplace`:
1. Your MEMORY.md is backed up
2. Merged with any new defaults
3. Duplicates removed
4. Your learnings always win

Check backups:
```bash
ls ~/.claude/.../skills/frontend/.memory-backups/
```

---

## Best Practices

### For Maximum Learning

1. **Be explicit in corrections**:
   ```
   ✅ "No, don't use console.log. Always use logger.info() instead."
   ❌ "That's not right."
   ```

2. **Provide context**:
   ```
   ✅ "In this project, we always use shadcn components, not Radix directly."
   ❌ "Use shadcn."
   ```

3. **Mention skills when relevant**:
   ```
   ✅ "For the architect skill: prefer event sourcing over CRUD for this domain."
   ```

### For Clean Memory

1. **Review periodically**:
   ```bash
   cat ~/.claude/.../skills/frontend/MEMORY.md
   ```

2. **Clear outdated learnings**:
   ```bash
   /sw:reflect-clear --learning LRN-outdated-id
   ```

3. **Category cleanup**:
   ```bash
   /sw:reflect-clear --category testing
   ```

---

## Technical Details

### Deduplication Strategies

1. **Same ID**: Exact learning ID match
2. **Exact Match**: Normalized content comparison
3. **Substring Match**: One contains the other
4. **Core Phrase**: Extracts "use/prefer/always/never X" patterns
5. **Keyword Overlap**: 50%+ of 4+ char keywords match
6. **Trigger Match**: Same trigger keywords

### Signal Detection Patterns

**Corrections**:
- "No, don't ... instead"
- "Wrong ... should be"
- "Never ... always"
- "That's incorrect ... correct"

**Rules**:
- "Always use ..."
- "Never use ..."
- "In this project ..."
- "The convention is ..."

### Memory File Format

```markdown
# Skill Name Memory

> Auto-generated by SpecWeave Reflect
> Last updated: 2026-01-10T10:00:00Z

## Learned Patterns

#### LRN-20260110-A1B2 (High Confidence)
**Context**: User corrected button usage
**Learning**: Always use Button component from design system
**Triggers**: button, component, design system
**Added**: 2026-01-10
**Source**: session:2026-01-10
**Type**: correction

## User Notes
(Manually added notes preserved across updates)
```

---

## Integration with Other Features

### With Auto Mode (`/sw:auto`)

```
Session starts → Tasks executed → User corrections → Session ends
                                                          ↓
                                                   Stop hook triggers
                                                          ↓
                                                   Reflection analyzes
                                                          ↓
                                                   Learnings saved
```

### With Marketplace Refresh

```bash
specweave refresh-marketplace
```

1. Downloads latest plugins
2. **Preserves your MEMORY.md files**
3. Merges any new default learnings
4. Deduplicates
5. Your learnings always win conflicts

### With Living Docs

Learnings can inform architecture decisions:

```bash
/sw:context architect
# Loads architect skill's MEMORY.md as context
```

---

## FAQ

**Q: Do I need to do anything after `specweave init`?**
A: No! Auto-reflection is enabled by default.

**Q: How many learnings should I expect per session?**
A: Most sessions produce 0-2 learnings. Quality over quantity.

**Q: Can I manually add learnings?**
A: Yes, edit the MEMORY.md files directly, or use:
```bash
/sw:reflect --skill frontend "Your learning here"
```

**Q: Are learnings shared between projects?**
A: In Claude Code, yes - they're in `~/.claude/...` which is global.
   Project-local learnings stay in `.specweave/memory/`.

**Q: How do I back up my learnings?**
A: Copy the MEMORY.md files. They're plain markdown.

---

## Summary

1. **Init creates reflect-config.json** with auto-reflect enabled
2. **Make explicit corrections** during sessions
3. **Stop hook captures** learnings automatically
4. **Learnings route** to skills or categories
5. **Future sessions** apply learned patterns
6. **Marketplace updates** preserve your learnings

**The system learns from you. Correct once, apply everywhere.**
