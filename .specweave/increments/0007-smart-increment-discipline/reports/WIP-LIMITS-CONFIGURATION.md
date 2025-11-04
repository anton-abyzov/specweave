# WIP Limits Configuration Guide

**Created**: 2025-11-04
**Status**: Configuration schema added, implementation pending
**Version**: v0.7.0+

---

## 📊 Default WIP Limits (Hardcoded)

Currently, the limits are **hardcoded** in the TypeScript source code. Configuration support has been added to the schema but not yet wired up to the runtime.

### Current Defaults

```typescript
{
  feature: 2,             // Max 2 active feature increments
  hotfix: null,           // Unlimited (production emergencies)
  bug: null,              // Unlimited (production issues)
  'change-request': 2,    // Max 2 active change requests
  refactor: 1,            // Max 1 active refactor (requires deep focus)
  experiment: null,       // Unlimited (POCs)

  experimentAutoAbandonDays: 14,  // Auto-abandon experiments after 14 days

  staleness: {
    paused: 7,            // Warn if paused for more than 7 days
    active: 30            // Warn if active for more than 30 days
  }
}
```

---

## ⚙️ How to Configure (When Implementation Complete)

**Location**: `.specweave/config.json`

### Example 1: Small Team (Tight Focus)

```json
{
  "project": {
    "name": "my-startup",
    "version": "1.0.0"
  },
  "limits": {
    "feature": 1,
    "refactor": 1,
    "change-request": 1
  }
}
```

**Rationale**: Startup with 2-3 engineers → extreme focus on ONE feature at a time.

---

### Example 2: Enterprise Team (More Parallelism)

```json
{
  "project": {
    "name": "enterprise-saas",
    "version": "2.0.0"
  },
  "limits": {
    "feature": 5,
    "hotfix": null,
    "bug": null,
    "change-request": 3,
    "refactor": 2,
    "experiment": 10,
    "experimentAutoAbandonDays": 21,
    "staleness": {
      "paused": 14,
      "active": 60
    }
  }
}
```

**Rationale**: Large team (10+ engineers) → can handle more parallel work, longer timelines.

---

### Example 3: Solo Developer (Maximum Focus)

```json
{
  "project": {
    "name": "side-project",
    "version": "0.1.0"
  },
  "limits": {
    "feature": 1,
    "refactor": 1,
    "change-request": 1,
    "experiment": 3,
    "experimentAutoAbandonDays": 7
  }
}
```

**Rationale**: Solo developer → ONE thing at a time, short experiments.

---

### Example 4: Open Source Project (Liberal Limits)

```json
{
  "project": {
    "name": "oss-project",
    "version": "1.5.0"
  },
  "limits": {
    "feature": null,
    "refactor": null,
    "change-request": null,
    "experiment": null
  }
}
```

**Rationale**: Open source → many contributors, asynchronous work, no enforced limits.

---

## 🎯 Limit Recommendations by Team Size

| Team Size | Feature | Refactor | Change-Request | Experiment | Rationale |
|-----------|---------|----------|----------------|------------|-----------|
| **Solo (1)** | 1 | 1 | 1 | 3 | Maximum focus, ONE thing at a time |
| **Small (2-3)** | 2 | 1 | 1 | 5 | Slight parallelism, mostly focused |
| **Medium (4-7)** | 3 | 1 | 2 | 7 | Moderate parallelism, balanced |
| **Large (8-15)** | 5 | 2 | 3 | 10 | Higher parallelism, well-coordinated |
| **Enterprise (15+)** | 10 | 3 | 5 | 20 | Heavy parallelism, multiple teams |

**Note**: These are RECOMMENDATIONS, not rules. Adjust based on:
- Team maturity (experienced teams can handle more WIP)
- Project complexity (complex projects need tighter focus)
- Communication overhead (remote teams benefit from lower WIP)
- Context-switching costs (junior teams benefit from lower WIP)

---

## 🚨 When to Adjust Limits

### Increase Limits When...

✅ **Team is highly experienced**
- Low context-switching costs
- Strong communication
- Clear ownership boundaries

✅ **Work is highly parallelizable**
- Independent features (frontend + backend)
- Non-overlapping codebases
- Minimal merge conflicts

✅ **Business demands it**
- Multiple stakeholder requests
- Time-sensitive opportunities
- Regulatory deadlines

### Decrease Limits When...

❌ **Quality is suffering**
- High bug count
- Technical debt accumulating
- Tests being skipped

❌ **Team is overwhelmed**
- Long PR review times
- Stale branches
- Missed deadlines

❌ **Context-switching is high**
- Engineers jumping between 5+ tasks
- Constant interruptions
- Low completion rate

---

## 🔧 Configuration Schema

**Full Schema** (`.specweave/config.json`):

```json
{
  "project": {
    "name": "string",
    "version": "semver"
  },
  "limits": {
    "feature": 2,                      // number | null
    "hotfix": null,                    // number | null (null = unlimited)
    "bug": null,                       // number | null
    "change-request": 2,               // number | null
    "refactor": 1,                     // number | null
    "experiment": null,                // number | null
    "experimentAutoAbandonDays": 14,   // number (days)
    "staleness": {
      "paused": 7,                     // number (days)
      "active": 30                     // number (days)
    }
  }
}
```

**Validation Rules**:
- All numeric limits must be ≥ 1 or `null`
- `null` means unlimited
- `experimentAutoAbandonDays` cannot be `null` (must be a number)
- Staleness thresholds cannot be `null` (must be numbers)

---

## 💡 Philosophy: Why Limits Matter

### The Core Insight

> **Context switching kills quality. WIP limits enforce focus.**

**Without Limits** (Traditional Development):
```
Developer A: Works on 5 features simultaneously
- Feature 1: 20% done
- Feature 2: 30% done
- Feature 3: 10% done
- Feature 4: 40% done
- Feature 5: 5% done

Result after 2 weeks: 0 features shipped, high bug count
```

**With Limits** (SpecWeave Discipline):
```
Developer A: Works on 2 features maximum
- Feature 1: 100% done (shipped!)
- Feature 2: 60% done

Result after 2 weeks: 1 feature shipped, low bug count
```

**Shipping velocity**: 1 feature every 2 weeks vs 0 features (infinite backlog)

---

## 🎓 Real-World Examples

### Example 1: Startup Pivot

**Before Limits** (Chaos):
```
Active: 8 features
Status: None complete, team overwhelmed
```

**After Limits** (Discipline):
```
Config: { "feature": 2 }

Active: 2 features
Paused: 3 features (explicit reasons)
Abandoned: 3 features (pivot documented)

Result: 2 features shipped in 3 weeks
```

---

### Example 2: Enterprise Onboarding

**Problem**: New engineers struggle with codebase complexity

**Solution**: Tighter limits during onboarding
```json
{
  "limits": {
    "feature": 1,
    "refactor": 0
  }
}
```

**After 3 months**: Gradually increase to team standard
```json
{
  "limits": {
    "feature": 3,
    "refactor": 1
  }
}
```

---

## 🔄 Migration Path (Current → Configurable)

**Current State** (v0.7.0):
- ✅ Schema defined in `specweave-config.schema.json`
- ✅ TypeScript types added to `config.ts`
- ✅ Default values defined
- ❌ Runtime not yet reading from config (uses hardcoded limits)

**Next Steps** (v0.7.1+):
1. Create config loader utility
2. Update `status-commands.ts` to read from config
3. Fallback to hardcoded defaults if config missing
4. Add `specweave limits` command to show current limits
5. Add `specweave limits set <type> <value>` to update config

---

## 📝 Summary

**Current Answer to Your Questions**:

1. **What are the limits?**
   - feature: 2
   - hotfix: unlimited
   - bug: unlimited
   - change-request: 2
   - refactor: 1
   - experiment: unlimited

2. **Can I change it per project?**
   - ✅ **YES** (schema added)
   - ❌ **NOT YET** (runtime not implemented)

3. **How to configure?**
   - Add `limits` section to `.specweave/config.json`
   - Implementation pending (v0.7.1+)

4. **What are the defaults?**
   - See table above
   - Designed for small teams (2-5 engineers)
   - Adjust based on team size and maturity

---

**Status**: Configuration framework ready, runtime implementation pending
**ETA**: v0.7.1 or v0.8.0
**Workaround**: Edit `src/core/types/increment-metadata.ts` (hardcoded limits) and rebuild

---

**Key Insight**: WIP limits aren't bureaucracy—they're the scaffolding that enables high-quality software delivery. Configure them to match your team's capacity, not your ambitions.
