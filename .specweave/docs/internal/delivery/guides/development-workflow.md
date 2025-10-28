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

#### Step 1: Analyze Existing Code

- Use `brownfield-analyzer` skill
- Generate specs from existing implementation
- Create retroactive ADRs in `.specweave/docs/internal/architecture/adr/`

#### Step 2: Document Related Modules

- Before modifying payment flow, document current implementation
- Create specs in `.specweave/docs/internal/strategy/payments/existing/`
- Extract data models, API contracts

#### Step 3: Create Tests for Current Behavior

- Write E2E tests that validate current functionality
- User reviews tests to ensure completeness
- Tests act as regression safety net

#### Step 4: Plan Modifications

- Create feature in `.specweave/increments/####-new-feature/`
- Reference existing specs in context manifest
- Show what changes and what stays the same

#### Step 5: Implement with Regression Monitoring

- Run existing tests before changes
- Implement new feature
- Verify existing tests still pass

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

