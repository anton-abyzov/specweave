---
description: 🔥 Shorthand for /validate-increment - Validate increment quality (Alias)
---

# Validate Increment (Short Alias)

**⚡ Quick Alias**: This is a shorthand command for `/validate-increment`.

Use this when you want to quickly validate an increment without typing the full command name.

---

## Full Command

For complete documentation, see `/validate-increment`.

This alias provides the exact same functionality as the full command.

---

## Usage

```bash
/vi [increment-id] [--quality]
```

**Examples**:
```bash
/vi 0001                    # Rule-based validation only
/vi 0001 --quality          # Rule-based + LLM quality assessment
/vi                         # Validate current increment
```

---

## What This Does

**Rule-Based Validation** (Always runs):
- ✅ 120 validation rules across 4 categories
- ✅ Consistency checks (Spec ↔ Plan ↔ Tasks alignment)
- ✅ Completeness checks (All required sections present)
- ✅ Quality checks (Technology-agnostic, testable criteria)
- ✅ Traceability checks (TC-0001 → tests.md coverage)

**LLM Quality Assessment** (With `--quality` flag):
- ✅ 6-dimension scoring (Clarity, Testability, Completeness, etc.)
- ✅ Actionable suggestions with examples
- ✅ Overall quality score (0-100)
- ✅ Issue severity ranking (major, minor)

---

## Validation Results

**Rule-Based Output**:
```
✅ Validation Results: 118/120 rules passed (98%)

Issues Found:
⚠️ [CONSISTENCY-012] Missing test case coverage for US-B003
⚠️ [QUALITY-008] Acceptance criteria not testable in spec.md:45
```

**Quality Assessment Output** (with `--quality`):
```
🔍 Quality Score: 87/100 (GOOD)

Dimension Scores:
  • Clarity:         92/100 ✓✓
  • Testability:     78/100 ✓  (Needs improvement)
  • Completeness:    90/100 ✓✓
  • Feasibility:     88/100 ✓✓

Issues: 2 major, 1 minor
Suggestions: 3 high priority improvements
```

---

## Other Useful Aliases

- `/ci` - Create increment (shorthand for `/create-increment`)
- `/si` - Start increment (shorthand for `/start-increment`)
- `/done` - Close increment (shorthand for `/close-increment`)
- `/ls` - List increments (shorthand for `/list-increments`)

---

**💡 Tip**: Use `/vi` for quick checks, `/vi --quality` before implementation.
