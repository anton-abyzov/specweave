---
sidebar_position: 2
---

# Key Features

SpecWeave provides enterprise-level development discipline for AI-assisted workflows. Here are the key features that set it apart.

## 1. Spec-First Workflow

**Write requirements before code** to prevent scope creep and rework.

### How It Works

```
/specweave:increment "feature description"
→ PM agent creates spec.md (user stories, acceptance criteria)
→ Architect creates plan.md (system design, architecture)
→ Planner creates tasks.md (implementation tasks with embedded tests)
→ Developer implements (guided by spec)
→ Hooks auto-sync living docs
```

### Benefits
- ✅ **Clear requirements** before coding
- ✅ **Stakeholder alignment** (shared understanding)
- ✅ **Prevents rework** (build the right thing first time)
- ✅ **Complete traceability** (requirements → code → tests)

## 2. Living Documentation

**Documentation that updates itself** - zero manual effort.

### The Problem
Traditional docs become stale within weeks:
```
Day 1: Write docs → accurate
Day 30: Code changed 10 times → docs wrong
Day 90: Docs completely outdated → trust lost
```

### SpecWeave Solution
**Automatic synchronization after every task**:
```
Complete task → Hook fires → Docs sync → Always current
```

### Living Docs Structure
```
.specweave/docs/internal/
├── specs/              # Feature specifications (permanent)
├── architecture/       # HLDs, ADRs, diagrams
├── delivery/          # Roadmap, DORA metrics
└── operations/        # Runbooks, SLOs, incidents
```

**All auto-updated** via hooks - no manual sync needed!

## 3. 75%+ Context Reduction

**Modular plugin architecture** - load only what you need.

### Before (Monolithic)
```
Load ALL features: 50,000 tokens
- Simple React app pays for K8s, ML, payments
- Hit 200K context limit quickly
- Slow initialization (8+ seconds)
```

### After (Modular)
```
Core plugin: 12,000 tokens (always)
+ GitHub: 3,000 tokens (if needed)
+ React: 4,000 tokens (if needed)
= 19,000 tokens total (62% reduction!)
```

### Real-World Savings
| Project Type | Tokens Before | Tokens After | Savings |
|-------------|---------------|--------------|---------|
| Simple React | 50K | 19K | 62% |
| Backend API | 50K | 19K | 62% |
| Full-Stack | 50K | 29K | 42% |

## 4. Quality Gates & Validation

**Built-in quality checks** ensure high standards.

### Validation Commands
```bash
# Rule-based validation
/specweave:validate 0001
→ Checks: spec structure, tasks format, AC-ID coverage

# AI-powered quality assessment
/specweave:qa 0001
→ Evaluates: clarity, testability, risks, completeness
→ Provides: PASS/CONCERNS/FAIL decision + recommendations
```

### Test Coverage Validation
```bash
/specweave:check-tests 0001
→ Checks: All AC-IDs have tests
→ Reports: Coverage per task, missing tests
→ Validates: Embedded test plans (BDD format)
```

### Quality Gates in Action
```
Example: /specweave:qa 0008-user-auth

✅ PASS - Ready for Implementation

Strengths:
- Clear acceptance criteria with AC-IDs
- Comprehensive test plans (87% coverage)
- Security considerations addressed

Concerns:
- Password reset flow lacks rate limiting (LOW risk)

Risks (BMAD):
- Business: Low (core feature, well-scoped)
- Maintainability: Low (standard patterns)
- Architecture: Low (aligns with existing auth)
- Dependencies: Medium (Redis required for sessions)

Recommendations:
1. Add rate limiting to password reset (prevent abuse)
2. Document Redis failover strategy
```

## 5. Embedded Test Plans (BDD Format)

**Tests embedded in tasks.md** (not separate file) with Given/When/Then format.

### Old Format (Separate tests.md)
```
❌ Problems:
- Duplication (tasks + tests)
- Sync issues (tasks updated, tests forgotten)
- Manual TC-ID management
```

### New Format (Embedded in tasks.md)
```markdown
## T-001: Implement Authentication Service

**AC**: AC-US1-01, AC-US1-02, AC-US1-03

**Test Plan** (BDD format):
- **Given** valid email/password → **When** login → **Then** JWT token returned
- **Given** invalid password → **When** login → **Then** error shown

**Test Cases**:
- Unit (`auth.test.ts`): validLogin, invalidPassword, rateLimiting
- Integration (`auth-flow.test.ts`): loginEndpoint, lockedAccount
- **Overall: 87% coverage**
```

### Benefits
- ✅ Single source of truth
- ✅ AC-ID traceability (AC-US1-01 → tests)
- ✅ Clear intent (Given/When/Then)
- ✅ No sync issues

## 6. External Tool Sync

**Bidirectional sync** with GitHub, Jira, Azure DevOps.

### Multi-Project Support
```bash
# Configure sync profiles
/specweave:sync-profile create
→ Name: my-project
→ Provider: github
→ Repo: myorg/myproject

# Sync increment to GitHub issue
/specweave-github:sync 0001
→ Creates issue with spec content
→ Updates issue on progress
→ Closes issue when increment complete
```

### Time Range Filtering
```bash
# Avoid rate limits with time range filtering
/specweave-github:sync 0001 --time-range 1M
→ Syncs only last month's data
→ Reduces API calls by 90%+
→ Smart rate limiting protection
```

## 7. Brownfield Support

**Integrate existing codebases** without starting over.

### Three-Phase Migration
```bash
# Phase 1: Analyze
/specweave:analyze-brownfield
→ Scans existing docs
→ Suggests structure

# Phase 2: Import
/specweave:import-docs --source confluence
→ Imports into .specweave/docs/internal/legacy/
→ Classifies automatically (strategy, specs, architecture)

# Phase 3: Migrate
→ Gradually move from legacy/ to proper structure
→ Link to external tools (Jira, GitHub Projects)
```

## 8. DORA Metrics

**Track deployment performance** with industry-standard metrics.

### Four Key Metrics
1. **Deployment Frequency**: How often you ship
2. **Lead Time**: Time from commit to production
3. **MTTR**: Mean Time To Recovery
4. **Change Failure Rate**: % of deploys causing incidents

```bash
/specweave:dora
→ Shows metrics dashboard
→ Tracks over time
→ Identifies bottlenecks
```

## 9. Multi-Project Organization

**Organize specs by project/team** in large organizations.

### Structure
```
.specweave/docs/internal/
└── projects/
    ├── web-app/              # Frontend team
    │   ├── specs/
    │   └── modules/
    ├── mobile-app/           # Mobile team
    │   ├── specs/
    │   └── modules/
    └── platform-infra/       # Infrastructure team
        ├── specs/
        └── modules/
```

### Project Switching
```bash
/specweave:switch-project mobile-app
→ Future increments use mobile-app context
→ Syncs to mobile-app repo
```

## 10. Cost Optimization

**Reduce AI costs** through context efficiency.

### How It Saves Money
| Project | Tokens Before | Tokens After | Cost Savings (monthly) |
|---------|---------------|--------------|----------------------|
| Simple | 50K | 19K | ~$120/month |
| Medium | 50K | 29K | ~$84/month |
| Complex | 50K | 35K | ~$60/month |

**Assumptions**: 1000 increments/month, $0.004/1K tokens

## Learn More

- [Philosophy](./philosophy) - Core principles
- [What is SpecWeave?](./what-is-specweave) - Framework overview
- [Quickstart](/docs/intro#getting-started) - Get started in 5 minutes
- [Commands Reference](/docs/commands/overview) - All available commands

---

**Next Steps**: [Install SpecWeave](/docs/intro#installation) and create your first increment!
