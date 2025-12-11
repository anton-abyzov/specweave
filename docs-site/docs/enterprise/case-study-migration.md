---
id: case-study-migration
title: "Case Study: Enterprise Migration"
sidebar_label: "Case Study: Migration"
sidebar_position: 8
---

# Case Study: Migrating a 50-Developer Team to SpecWeave

**A practical walkthrough of adopting SpecWeave in an enterprise environment.**

---

## Company Profile

| Aspect | Details |
|--------|---------|
| **Team size** | 50 developers, 8 teams |
| **Tech stack** | React, Node.js, PostgreSQL |
| **Existing tools** | JIRA, GitHub Enterprise |
| **Pain points** | Stale docs, unclear specs, slow onboarding |
| **Timeline** | 8 weeks to production use |

---

## The Problem

### Before SpecWeave

```
Reality at AcmeCorp:
┌─────────────────────────────────────────────────┐
│ JIRA                                            │
│ - 2,000+ tickets (50% stale)                   │
│ - Descriptions out of sync with code           │
│ - No one trusts requirements                   │
└─────────────────────────────────────────────────┘
        │ Manual copy-paste (often forgotten)
        ↓
┌─────────────────────────────────────────────────┐
│ GitHub                                          │
│ - PRs have minimal context                     │
│ - READMEs outdated                             │
│ - Architecture decisions lost                  │
└─────────────────────────────────────────────────┘
        │ Tribal knowledge
        ↓
┌─────────────────────────────────────────────────┐
│ Developer Heads                                 │
│ - Onboarding takes 2-3 months                  │
│ - "Ask Sarah, she knows this"                  │
│ - Knowledge silos                              │
└─────────────────────────────────────────────────┘
```

**Symptoms:**
- New developers took 3 months to be productive
- 40% of bugs were due to unclear requirements
- Same questions asked repeatedly
- "I thought we already decided this"

---

## Week 1: Planning

### Day 1-2: Assessment

```markdown
## Migration Assessment

### Inventory
- 12 microservices
- 3 web applications
- 2 mobile apps
- 180,000 lines of code

### Priority Projects
1. payment-service (critical, active development)
2. user-service (high churn, many bugs)
3. web-app (largest team, most confusion)

### Stakeholders
- Engineering VP: Sponsor
- 3 Team Leads: Champions
- 50 Developers: Users
- 5 PMs: Beneficiaries
```

### Day 3-5: Pilot Team Selection

**Criteria for pilot team:**
- ✅ Open to new tools
- ✅ Active development
- ✅ Clear pain points
- ✅ Strong tech lead

**Selected:** Payment team (8 developers)

---

## Week 2: Pilot Setup

### Day 1: SpecWeave Installation

```bash
# In payment-service repo
specweave init

# During setup:
? External tool integration: JIRA Cloud
? JIRA project: PAYMENTS
? GitHub repo: acmecorp/payment-service
? Living docs strategy: Bidirectional sync
```

### Day 2-3: Initial Documentation

Used brownfield quick-start approach:

```bash
# Import critical documentation only
/sw:import-docs --source=confluence --filter="payment*"

# Result: Created minimal living docs structure
.specweave/
├── docs/
│   ├── living/
│   │   ├── modules/
│   │   │   └── payment-processing/
│   │   │       ├── overview.md
│   │   │       └── api-contracts.md
│   │   └── architecture/
│   │       └── payment-flow.md
│   └── internal/
│       └── adr/
│           └── 0001-stripe-vs-braintree.md
└── config.json
```

### Day 4-5: First Increment

```bash
# Team's first SpecWeave increment
/sw:increment "Add Apple Pay support"

# PM agent generates:
# ✅ spec.md with user stories
# ✅ plan.md with architecture
# ✅ tasks.md with test specs
```

---

## Week 3-4: Pilot Execution

### Team Workflow

```
Morning standup:
/sw:progress
→ Shows: "3/8 tasks complete (37%)"

During development:
/sw:do
→ Implements task with AI assistance

End of day:
/sw:sync-progress
→ Updates JIRA automatically
```

### Challenges Encountered

| Challenge | Solution |
|-----------|----------|
| "JIRA is source of truth" mindset | Showed how changes flow back to JIRA |
| Context explosion (large files) | Enabled chunked editing mode |
| Existing docs in Confluence | Imported critical docs, linked rest |
| Resistance from senior dev | Paired with them on increment |

### Results After 2 Weeks

```
Before SpecWeave:
- Feature spec: 2-3 meetings, vague outcome
- Implementation: Constant questions
- JIRA updates: Forgotten, stale
- Onboarding: "Ask Mike"

After SpecWeave:
- Feature spec: 30 min with AI + PM
- Implementation: Clear tasks, embedded tests
- JIRA updates: Automatic via hooks
- Onboarding: "Read the spec"
```

---

## Week 5-6: Team Expansion

### Rollout to Teams 2-3

```markdown
## User Service Team (6 devs)
- Day 1: Init + import existing docs
- Day 2-3: First increment
- Day 4-5: JIRA sync configured

## Web App Team (12 devs)
- Day 1: Init + architecture review
- Day 2-3: First increment (small feature)
- Day 4-5: Full team onboarding
```

### Training Materials Created

| Material | Purpose |
|----------|---------|
| 10-min video | "SpecWeave in 10 Minutes" |
| Cheat sheet | Common commands |
| FAQ doc | Answers to frequent questions |
| Office hours | Weekly Q&A for first month |

### Common Questions

**Q: Do I have to document everything?**
A: No. Start with active work. Historical docs can stay in Confluence.

**Q: Does this replace JIRA?**
A: No. SpecWeave syncs TO JIRA. Stakeholders still use JIRA.

**Q: What about existing tickets?**
A: Keep them. New work uses SpecWeave. Old tickets stay as-is.

---

## Week 7-8: Full Rollout

### All 8 Teams Onboarded

```
Rollout timeline:
Week 5: Teams 2-3 (2 teams)
Week 6: Teams 4-5 (2 teams)
Week 7: Teams 6-7 (2 teams)
Week 8: Team 8 + cleanup (1 team)
```

### Standardization

```yaml
# .specweave/config.json (shared across repos)
{
  "sync": {
    "jira": {
      "enabled": true,
      "direction": "bidirectional",
      "updateOnTaskComplete": true
    },
    "github": {
      "enabled": true,
      "createIssues": true
    }
  },
  "quality": {
    "coverageThreshold": 80,
    "requireTests": true,
    "requireADR": true
  }
}
```

---

## Results: Before & After

### Quantitative Metrics

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Onboarding time | 3 months | 3 weeks | -83% |
| Requirements bugs | 40% of total | 12% of total | -70% |
| Time to first commit (new dev) | 5 days | 2 days | -60% |
| JIRA updates per feature | 2-3 (manual) | 8-10 (auto) | +300% |
| Spec quality (stakeholder rating) | 3/10 | 8/10 | +167% |

### Qualitative Feedback

**From developers:**
> "I finally know what I'm supposed to build. The spec is right there."

**From PM:**
> "JIRA updates itself now. I can focus on product, not status updates."

**From tech lead:**
> "New hires read the docs instead of asking me 50 questions."

**From VP Engineering:**
> "We shipped the Q4 roadmap on time for the first time in 3 years."

---

## Key Success Factors

### 1. Executive Sponsorship

```markdown
✅ VP Engineering announced migration
✅ Time allocated for learning
✅ Success metrics defined upfront
```

### 2. Pilot-First Approach

```markdown
✅ Started with ONE team
✅ Learned lessons before scaling
✅ Built internal champions
```

### 3. Not "All or Nothing"

```markdown
✅ Historical docs stayed in Confluence
✅ Existing JIRA tickets untouched
✅ Gradual adoption, not big bang
```

### 4. Clear Value Proposition

```markdown
✅ Solved real pain points
✅ Made developers' lives easier
✅ Reduced meetings, not added them
```

---

## Lessons Learned

### What Worked

1. **Quick wins first** — Small feature, fast results
2. **Champions on each team** — Internal advocates
3. **Async onboarding** — Videos + docs, not meetings
4. **JIRA integration early** — Showed stakeholder value

### What We'd Do Differently

1. **Start with living docs** — Should have imported architecture docs day 1
2. **More ADR training** — Teams didn't write ADRs at first
3. **Clearer git workflow** — Some confusion about branching
4. **Earlier PM involvement** — PMs joined late

---

## Migration Checklist

Use this checklist for your enterprise migration:

### Phase 1: Preparation (Week 1)
- [ ] Executive sponsor identified
- [ ] Pilot team selected
- [ ] Pain points documented
- [ ] Success metrics defined

### Phase 2: Pilot (Week 2-4)
- [ ] SpecWeave installed
- [ ] JIRA/GitHub integrated
- [ ] First increment completed
- [ ] Lessons documented

### Phase 3: Expansion (Week 5-6)
- [ ] Training materials created
- [ ] Teams 2-3 onboarded
- [ ] Standards documented
- [ ] FAQ maintained

### Phase 4: Full Rollout (Week 7-8)
- [ ] All teams onboarded
- [ ] Configuration standardized
- [ ] Metrics reviewed
- [ ] Continuous improvement started

---

## Related

- [JIRA Migration Guide](/docs/enterprise/jira-migration)
- [GitHub Migration Guide](/docs/enterprise/github-migration)
- [Brownfield Workflow](/docs/workflows/brownfield)
