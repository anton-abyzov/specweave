## Development Workflow

**IMPORTANT**: Choose your documentation approach based on project needs (see "Documentation Philosophy & Approaches"):
- **Enterprise/Production**: Create comprehensive specs upfront (500-600+ pages)
- **Startup/Iterative**: Build documentation gradually as you go (like Microsoft)
- Both approaches are fully supported by SpecWeave

### For Greenfield Projects

**Choose your approach** (see "Documentation Philosophy & Approaches" section for details):

**Option A: Comprehensive Upfront** (Enterprise/Production)
- Create 500-600+ page specifications before coding
- Full architecture and ADRs documented upfront
- Complete API contracts and security docs

**Option B: Incremental/Evolutionary** (Startup/Iterative)
- Start with overview (10-20 pages)
- Build documentation as you go
- Add modules/specs as features are planned

**Workflow**:
1. Create specifications (`.specweave/docs/internal/strategy/`) - technology-agnostic WHAT/WHY
2. Design architecture (`.specweave/docs/internal/architecture/`) - technical HOW with ADRs
3. Plan features in auto-numbered increments (`.specweave/increments/{id}/`)
4. Implement with context manifests (70%+ token reduction)
5. Documentation auto-updates via hooks

### For Brownfield Projects

**CRITICAL PRINCIPLE**: Document before modifying to prevent regression.

#### Step 0: Merge Existing CLAUDE.md (If Exists)

**Problem**: If your project already has `CLAUDE.md`, SpecWeave installation will backup it to `.claude/backups/CLAUDE-backup-{timestamp}.md`

**Solution**: Intelligently merge project-specific content using `brownfield-onboarder` skill

**Process**:
1. **After installation**, check if backup was created:
   ```bash
   ls .claude/backups/CLAUDE-backup-*.md
   ```

2. **Trigger intelligent merge**:
   - Ask Claude: "merge my old CLAUDE.md" or "specweave merge-docs"
   - Or use: `brownfield-onboarder` skill

3. **What happens**:
   - ✅ Skill analyzes backup CLAUDE.md
   - ✅ Extracts project-specific content (domain knowledge, architecture, conventions)
   - ✅ Distributes to appropriate SpecWeave folders:
     - Domain knowledge → `.specweave/docs/internal/strategy/{domain}/`
     - Architecture → `.specweave/docs/internal/architecture/`
     - Tech stack → `.specweave/docs/internal/architecture/tech-stack.md`
     - Business rules → `.specweave/docs/internal/strategy/{module}/business-rules.md`
     - Conventions → `.specweave/docs/internal/delivery/guides/project-conventions.md`
     - Workflows → `.specweave/docs/internal/delivery/guides/team-workflows.md`
     - Deployment → `.specweave/docs/internal/operations/runbooks/deployment.md`
   - ✅ Updates CLAUDE.md with minimal project summary (12 lines max)
   - ✅ Generates merge report

4. **Result**:
   - ✅ 99%+ content distributed to folders (not bloating CLAUDE.md)
   - ✅ CLAUDE.md remains concise with quick links
   - ✅ All project knowledge preserved and organized

**See**: [BROWNFIELD-CLAUDE-MERGE-STRATEGY.md](.specweave/increments/0002-brownfield-tools/reports/BROWNFIELD-CLAUDE-MERGE-STRATEGY.md) for complete strategy (when brownfield tools increment is implemented)

**Important**: This prevents losing valuable project context during SpecWeave installation.

---

#### Step 0.5: Choose Your Documentation Strategy

**CRITICAL DECISION**: Before documenting everything, assess complexity and choose your approach.

##### Two-Path Brownfield Strategy

SpecWeave offers **two paths** for brownfield projects based on size and complexity:

**Path 1: Quick Start** (Recommended for Large/Complex Projects)
- Initial documentation of core concepts only (1-2 hours)
- Document incrementally as you modify code
- Start delivering value quickly

**Path 2: Comprehensive Upfront** (Best for Small/Medium Projects)
- Full codebase documentation before any changes
- Complete baseline test coverage
- Traditional brownfield approach

##### Complexity Assessment

The `brownfield-analyzer` skill automatically estimates project complexity:

| Project Size | LOC Range | Upfront Effort | Recommended Path |
|--------------|-----------|----------------|------------------|
| **Small** | < 10k LOC | 4-8 hours | Comprehensive Upfront |
| **Medium** | 10k-50k LOC | 1-2 weeks | User Choice |
| **Large** | 50k-200k LOC | 2-4 weeks | Quick Start |
| **Very Large** | 200k+ LOC | 1-3 months | Quick Start (Mandatory) |

**Example Assessment**:
```
brownfield-analyzer estimates:
  • 85,000 LOC detected
  • 340 files to analyze
  • 12 major modules identified
  • Estimated full analysis: 3-4 weeks

Recommendation: Quick Start path
  ✓ Document core architecture (2-3 hours)
  ✓ Extract critical patterns and business rules
  ✓ Baseline tests for high-risk areas only
  → Start working, document incrementally per increment
```

##### Quick Start Workflow (Incremental Documentation)

**Initial Documentation** (1-3 hours):
1. **Core Architecture** - High-level system design, major components
2. **Critical Patterns** - Authentication, authorization, data flow
3. **Business Rules** - Only the rules that impact multiple modules
4. **Tech Stack** - Current technologies and frameworks
5. **High-Risk Areas** - Payment, security, data integrity logic

**Then on EACH increment**:
```markdown
Increment: 0003-refactor-payment-flow

Pre-Implementation Documentation:
  □ Document current payment flow behavior
  □ Extract related business rules
  □ Map dependencies (what touches this code?)
  □ Add regression tests for current behavior
  □ Stakeholder review of tests
  ✓ Safe to proceed

Implementation:
  □ Make planned changes
  □ Verify regression tests still pass
  □ Add new tests for new behavior

Post-Implementation Documentation:
  □ Update payment flow docs
  □ Update architecture if patterns changed
  □ Update business rules if logic changed
  □ Document new APIs/interfaces
  ✓ Increment complete with living docs
```

**Benefits of Quick Start**:
- ✅ Start delivering value in days, not weeks
- ✅ Focus documentation effort where it matters
- ✅ Documentation grows naturally with changes
- ✅ No upfront analysis paralysis
- ✅ Always document before touching code (safety)

##### Comprehensive Upfront Workflow

**Full Analysis** (1-4 weeks):
1. Complete codebase scan and classification
2. Document all modules, components, business rules
3. Generate retroactive specs for all features
4. Create baseline test coverage (>70%)
5. Map external integrations
6. Create complete architecture documentation

**Then implement normally**:
- All context already documented
- Reference existing specs in increments
- Full regression protection

**Benefits of Comprehensive**:
- ✅ Complete context before any changes
- ✅ Full regression test coverage
- ✅ Easier for teams (shared understanding)
- ✅ Better for regulated industries

##### Decision Tree

![delivery-guides-development-workflow-0](../../architecture/diagrams/delivery-guides-development-workflow-0.svg)

##### Incremental Documentation Pattern (Quick Start)

**Core Principle**: Document immediately before you touch code, not before you touch the project.

**Pattern**:
```
For each increment modifying existing code:

1. BEFORE touching code:
   a. Read code you plan to modify
   b. Document current behavior (before.md)
   c. Extract relevant business rules
   d. Create regression tests
   e. User validates tests match behavior

2. DURING implementation:
   a. Make planned changes
   b. Verify regression tests
   c. Add new tests for new behavior

3. AFTER implementation:
   a. Update documentation (before.md → spec.md)
   b. Update architecture docs if patterns changed
   c. Archive before.md for history
   d. Increment complete
```

**Example Directory Structure**:
```
.specweave/increments/0003-refactor-payment/
├── spec.md                    # What we're changing
├── plan.md                    # How we'll change it
├── tasks.md                   # Implementation tasks
├── tests.md                   # Test strategy
├── reports/
│   ├── payment-before.md      # Current behavior (pre-change)
│   ├── payment-after.md       # New behavior (post-change)
│   └── regression-tests.md    # Safety net tests
└── context-manifest.yaml      # What specs to load

.specweave/docs/internal/strategy/payments/
└── payment-flow-spec.md       # Living spec (updated after increment)
```

**Key Insight**: For large brownfields, perfect upfront documentation is the enemy of good incremental documentation.

##### When to Use Which Path

**Use Quick Start when**:
- Project is large (50k+ LOC)
- You need to deliver quickly
- Team is small (1-3 developers)
- Requirements are changing rapidly
- You're confident in test-driven approach

**Use Comprehensive when**:
- Project is small/medium (less than 50k LOC)
- You have time for upfront analysis (1-4 weeks)
- Multiple teams need shared context
- Regulated industry (finance, healthcare, defense)
- Legacy system with complex business rules

---

#### Step 1: Analyze Existing Code (Comprehensive Path) OR Document Core Concepts (Quick Start Path)

##### For Comprehensive Path:
- Use `brownfield-analyzer` skill with `--comprehensive` flag
- Generate specs from existing implementation
- Create retroactive ADRs in `.specweave/docs/internal/architecture/adr/`
- Document all modules and business rules

##### For Quick Start Path:
- Use `brownfield-analyzer` skill with `--quick-start` flag
- Document only core architecture (high-level)
- Extract critical patterns and business rules
- Skip detailed module documentation (done per increment)

#### Step 2: Document Related Modules (Path-Specific)

##### Comprehensive Path:
- Document ALL modules upfront before any modifications
- Create complete specs in `.specweave/docs/internal/strategy/{module}/`
- Extract all data models, API contracts, business rules
- Result: Full context available for all future changes

##### Quick Start Path:
- **Skip this step initially** - document per increment instead
- When planning increment, THEN document only the affected modules
- Create specs in `.specweave/increments/{id}/reports/{module}-before.md`
- Extract only relevant data models and contracts
- Result: Focused documentation, faster start

#### Step 3: Create Tests for Current Behavior (Path-Specific)

##### Comprehensive Path:
- Write E2E tests for ALL current functionality (>70% coverage)
- User reviews all tests to ensure completeness
- Create comprehensive regression test suite
- Tests act as complete safety net for entire codebase
- **Effort**: 1-4 weeks depending on codebase size

##### Quick Start Path:
- **Skip comprehensive testing initially**
- Per increment: Write regression tests ONLY for code you'll modify
- User reviews tests for that specific increment
- Tests act as targeted safety net for that change
- **Effort**: 30-60 minutes per increment

**Example (Quick Start)**:
```markdown
Increment 0003: Refactor payment flow

Regression Tests (Current Behavior):
  ✓ Payment succeeds with valid card
  ✓ Payment fails with invalid card
  ✓ Payment retries on network error
  ✓ Refund processes correctly
  ✓ Receipt email sent after payment

User validated: "Yes, these tests cover current payment behavior"
→ Safe to proceed with refactoring
```

#### Step 4: Plan Modifications (Both Paths)

- Create increment in `.specweave/increments/####-new-feature/`
- Reference existing specs in context manifest (Comprehensive) OR document affected code first (Quick Start)
- Show what changes and what stays the same
- Generate tasks.md and tests.md

##### Comprehensive Path Context Manifest:
```yaml
# Full context available
spec_sections:
  - .specweave/docs/internal/strategy/payments/payment-flow.md
  - .specweave/docs/internal/strategy/payments/business-rules.md
documentation:
  - .specweave/docs/internal/architecture/payment-service-design.md
  - .specweave/docs/internal/architecture/adr/0012-stripe-integration.md
```

##### Quick Start Path Context Manifest:
```yaml
# Incremental context, document as needed
spec_sections:
  - .specweave/increments/0003-refactor-payment/reports/payment-before.md
documentation:
  - .specweave/docs/internal/architecture/core-architecture.md  # From initial scan
```

#### Step 5: Implement with Regression Monitoring (Both Paths)

##### Comprehensive Path:
1. Run existing comprehensive test suite (baseline)
2. Implement new feature
3. Run full test suite again
4. Verify NO regressions across entire codebase
5. Add new tests for new functionality

##### Quick Start Path:
1. Run targeted regression tests for affected code (created in Step 3)
2. Implement new feature
3. Run targeted tests + new tests
4. Verify NO regressions in modified code
5. Update documentation (before.md → spec.md)
6. Archive before.md in reports/ for history

**Quick Start Post-Implementation**:
```markdown
Increment 0003: Refactor payment flow - COMPLETE

Documentation Updated:
  ✓ .specweave/increments/0003-refactor-payment/reports/payment-before.md (archived)
  ✓ .specweave/docs/internal/strategy/payments/payment-flow-spec.md (created/updated)
  ✓ .specweave/docs/internal/architecture/payment-service-design.md (updated patterns)

Tests:
  ✓ All regression tests pass (no breaking changes)
  ✓ New tests added for refactored flow
  ✓ Coverage: 85% for payment module

Living Documentation: Specs now reflect current implementation
```

---

### Git Workflow for New Increments

**CRITICAL**: When creating new increments (features/enhancements), ALWAYS create a feature branch FIRST.

#### Branch Naming Convention

```
features/{increment-id}-{short-name}
```

**Examples**:
- `features/001-core-framework`
- `features/002-diagram-agents`
- `features/003-jira-integration`
- `features/004-brownfield-tools`

#### Workflow

**Step 1: Create increment folder**
```bash
# Auto-numbered folder in .specweave/increments/
mkdir -p .specweave/increments/0002-diagram-agents
```

**Step 2: Create feature branch**
```bash
# ALWAYS create branch BEFORE starting work
git checkout develop  # or main, depending on project
git pull origin develop
git checkout -b features/002-diagram-agents
git push -u origin features/002-diagram-agents
```

**Step 3: Work on increment**
- Create spec.md, tasks.md, tests.md
- Implement in src/ (agents, skills, etc.)
- Update CLAUDE.md if needed
- Add tests (minimum 3 per component)

**Step 4: Commit regularly**
```bash
# Commit with descriptive messages
git add .
git commit -m "feat: create diagrams-architect agent"
git commit -m "feat: create diagrams-generator skill"
git commit -m "test: add test cases for diagram agents"
git commit -m "docs: update CLAUDE.md with diagram agent instructions"

# Push to feature branch
git push origin features/002-diagram-agents
```

**Step 5: Create PR when complete**
```bash
# Use gh CLI or GitHub web UI
gh pr create --title "Increment 0002: Diagram Architect Agent" \
             --body "See .specweave/increments/0002-diagram-agents/spec.md" \
             --base develop \
             --head features/002-diagram-agents
```

**Step 6: Merge to develop**
```bash
# After PR approval
git checkout develop
git pull origin develop
git merge features/002-diagram-agents
git push origin develop
```

**Step 7: Clean up (optional)**
```bash
# Delete feature branch after merge
git branch -d features/002-diagram-agents
git push origin --delete features/002-diagram-agents
```

#### Branch Strategy

**Main branches**:
- `main` / `master` - Production-ready code
- `develop` - Integration branch for features

**Feature branches**:
- `features/{id}-{name}` - One branch per increment
- Branch from: `develop`
- Merge to: `develop`
- Delete after merge: Optional

**Important rules**:
1. ✅ ALWAYS create feature branch before starting work
2. ✅ ONE branch per increment (not per task)
3. ✅ Branch from `develop` (or `main` if no develop)
4. ✅ Create PR when increment is complete
5. ✅ Merge only after review/approval
6. ❌ NEVER commit directly to `develop` or `main`
7. ❌ NEVER work on multiple increments in same branch

#### Example: Complete Workflow

```bash
# 1. Create increment structure
mkdir -p .specweave/increments/0003-jira-integration
cd .specweave/increments/0003-jira-integration
# Create spec.md, tasks.md, tests.md

# 2. Create feature branch
git checkout develop
git pull origin develop
git checkout -b features/003-jira-integration

# 3. Implement
# Create agents/skills in src/
# Add tests
# Update docs

# 4. Commit regularly
git add .
git commit -m "feat: create specweave-jira-mapper agent"
git push origin features/003-jira-integration

# 5. When complete, create PR
gh pr create --base develop --head features/003-jira-integration

# 6. After PR approved and merged
git checkout develop
git pull origin develop
git branch -d features/003-jira-integration
```

---

