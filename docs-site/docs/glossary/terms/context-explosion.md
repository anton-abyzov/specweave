---
id: context-explosion
title: Context Explosion
sidebar_label: Context Explosion
---

# Context Explosion

**Context Explosion** occurs when the total information Claude is processing exceeds its memory limits (~280KB), causing Claude Code to freeze or crash. This is one of the most common issues when working with large increments and large files simultaneously.

---

## What Causes It

Context is composed of multiple elements that add up:

| Component | Typical Size |
|-----------|-------------|
| Active increment spec/tasks | 40-80KB |
| Large file being edited | 60-120KB |
| System context & tools | ~50KB |
| Conversation history | 20-50KB |
| Tool invocation overhead | 10-30KB |

When total exceeds ~280KB, Claude Code may crash.

---

## High-Risk Patterns

```
❌ DANGEROUS PATTERN:
Active increment (10+ tasks) + Large file (2000+ lines) + Tool call = CRASH
```

### Red Flags

1. Status bar shows `Tasks: 10+`
2. Editing files with 2000+ lines
3. Using complex tools (AskUserQuestion with many options)
4. Long conversation history

---

## Prevention Strategies

### 1. Pause Large Increments

```bash
# Before editing files outside your increment
/sw:pause 0058

# Edit project files freely
# ...

# Resume when done
/sw:resume 0058
```

### 2. Use Focused File Reads

Instead of reading entire large files, request specific sections:

```bash
# ❌ Loads entire 2400-line file (~120KB)
Read entire file

# ✅ Loads only needed section (~2KB)
Read with offset=1220, limit=50
```

### 3. One Context Rule

Work on ONE thing at a time:
- Either work on your increment files
- Or work on project files (with increment paused)
- Never both simultaneously with large files

---

## Symptoms

- Claude thinking for unusually long time (4+ seconds)
- Terminal becomes unresponsive
- Silent crash (no error message)
- Status bar frozen

---

## Recovery

See [Emergency Recovery Guide](/docs/guides/troubleshooting/emergency-recovery) for detailed recovery steps.

Quick fix:
```bash
# 1. Check if work was saved
git status

# 2. Commit or stash
git add . && git commit -m "WIP before crash"

# 3. Restart Claude Code or use /clear

# 4. Resume with paused increment
/sw:pause XXXX  # Pause first
```

---

## Related Terms

- [Hooks](/docs/glossary/terms/hooks) - May trigger additional context load
- [Circuit Breaker](/docs/glossary/terms/circuit-breaker) - Prevents cascading failures
- [Increments](/docs/glossary/terms/increments) - Active increments contribute to context
