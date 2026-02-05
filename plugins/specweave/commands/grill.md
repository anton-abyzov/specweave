---
description: Comprehensive implementation auditor - grills code quality, finds problems, and identifies improvements
argument-hint: "[SCOPE] [--focus TYPE] [--full]"
---

# /sw:grill - Implementation Auditor

**Grill your implementation to find problems before they find you.**

## Usage

```bash
# Grill specific increment
/sw:grill 0001-user-auth

# Grill a module or directory
/sw:grill src/services/auth
/sw:grill plugins/specweave-github

# Grill entire project
/sw:grill
/sw:grill --full

# Focused audit
/sw:grill --focus security
/sw:grill --focus consistency
/sw:grill --focus tests
```

## What Gets Audited

| Dimension | What's Checked |
|-----------|----------------|
| **Structure** | File organization, required files, conventions |
| **Code Quality** | Bugs, anti-patterns, error handling, types |
| **Consistency** | Naming, patterns, frontmatter validity |
| **Documentation** | README, comments, examples |
| **Dependencies** | Circular deps, unused imports, resolution |
| **Testing** | Coverage, edge cases, mock quality |
| **Security** | Secrets, input validation, OWASP basics |

## Output

Reports findings by severity:
- 🔴 **CRITICAL** - Must fix immediately
- 🟠 **HIGH** - Should fix soon
- 🟡 **MEDIUM** - Recommended improvements
- 🔵 **LOW** - Nice to have

Each finding includes:
- File path and line number
- Problem description
- Suggested fix
- Impact assessment

## Examples

**Grill an increment before closing:**
```bash
/sw:grill 0181-feature-name
# → Checks spec.md, plan.md, tasks.md, implementation, tests
```

**Security-focused audit:**
```bash
/sw:grill src/ --focus security
# → Checks for hardcoded secrets, injection risks, auth issues
```

**Full project audit:**
```bash
/sw:grill --full
# → Spawns 5-10 parallel agents for comprehensive analysis
```

## Related

- `sw:grill` skill - Full documentation and audit checklists
- `/sw:validate` - Lighter validation for increment closure
- `sw:code-reviewer` - PR-focused review
