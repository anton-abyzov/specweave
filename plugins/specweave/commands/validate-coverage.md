---
name: validate-coverage
description: Validate test coverage (shortcut for /specweave:validate-coverage)
usage: /validate-coverage [increment-id]
aliases: [specweave:validate-coverage]
---

# Validate Coverage Command (Shortcut)

**This is a shortcut for `/specweave:validate-coverage`**

**Usage**: `/validate-coverage [increment-id]`

**Full command**: `/specweave:validate-coverage [increment-id]`

---

## Quick Reference

Validate test coverage for acceptance criteria and tasks.

### Examples
```bash
/validate-coverage           # Current increment
/validate-coverage 0007      # Specific increment
/validate-coverage --all     # All increments
/validate-coverage --verbose # Detailed report
```

### Sample Output
```
✅ Coverage Validation - Increment 0007

📊 AC Coverage: 90% (18/20)
📊 Task Coverage: 85% (34/40 testable)

✅ MEETS TARGET (80%+ threshold)

💡 Ready for: /done 0007
```

---

## Coverage Thresholds

- **90-100%**: Excellent coverage ✅
- **80-89%**: Meets threshold ✅
- **70-79%**: Acceptable ⚠️
- **<70%**: Insufficient ❌

**Target**: 80%+ for AC and testable tasks

---

## Full Documentation

See: `/specweave:validate-coverage` for complete documentation including:
- Coverage calculation algorithms
- Detailed validation reports
- Integration with /done command
- Best practices
- Implementation details

---

**Command**: `/validate-coverage` (shortcut for `/specweave:validate-coverage`)
**Plugin**: specweave (core)
**Version**: v0.7.0+
