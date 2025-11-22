# SpecWeave Marketplace Plugin Validation

**🎯 Executive Summary:** LLM judge-based validation system prevents incomplete plugins from causing installation failures.

**📅 Implemented:** 2025-11-22
**🏆 Health Score:** 100% (11/11 complete plugins)
**🛡️ Prevention:** Multi-layer validation (pre-commit + manual + CI/CD)

---

## 🚨 The Problem

**Original Error:**
```
📦 Found 18 plugins to install
✘ Failed to install plugin "specweave-plugin-dev": Plugin not found in marketplace
```

**Root Cause:**
- 6 incomplete plugins (38% failure rate) in marketplace.json
- Plugins had skills-only structure (10-30 points) below 40-point threshold
- No validation system to prevent skeleton plugins

**Impact:**
- Installation failures during `specweave init`
- User confusion ("Plugin not found" despite being listed)
- Degraded trust in marketplace quality

---

## ✅ The Solution

### LLM Judge Scoring System

**Validation Script:** `scripts/validate-marketplace-plugins.sh`

**Scoring Matrix:**
| Component | Points | Criteria |
|-----------|--------|----------|
| **Commands** | 40 | ≥1 slash command (.md file) |
| **Lib** | 40 | ≥10 implementation files (.js/.ts) |
| **Agents** | 30 | AGENT.md + 3+ support files (templates/tests) |
| **Hooks** | 20 | ≥1 hook implementation (.sh/.js) |
| **Skills** | 10 | ≥3 comprehensive SKILL.md files |

**Thresholds:**
- **Complete:** ≥40 points (minimum for marketplace)
- **Production-Ready:** ≥80 points (recommended)

---

## 🏗️ Plugin Quality Tiers

### Tier 1: Production-Ready (≥80 points)
**These plugins are battle-tested and feature-rich:**

```
specweave-github: 110 pts
├─ Commands: +40 (6 slash commands)
├─ Lib: +40 (94 implementation files)
├─ Hooks: +20 (GitHub sync hooks)
└─ Skills: +10 (4 reference skills)
```

**Current Production-Ready Plugins:**
- `specweave-github` (110) - GitHub integration
- `specweave-jira` (110) - JIRA integration
- `specweave-ado` (110) - Azure DevOps integration
- `specweave-kafka` (90) - Apache Kafka integration
- `specweave-infrastructure` (80) - Cloud infrastructure

### Tier 2: Complete (40-79 points)
**Functional plugins with focused capabilities:**

```
specweave-docs-preview: 40 pts
└─ Commands: +40 (2 slash commands: /preview, /build)
```

**Current Complete Plugins:**
- `specweave-docs-preview` (40) - Documentation preview
- `specweave-kafka-streams` (40) - Kafka Streams
- `specweave-n8n` (40) - n8n workflow automation
- `specweave-ml` (50) - Machine learning pipelines
- `specweave-release` (70) - Release management

### Tier 3: Incomplete (<40 points) ❌
**NOT ALLOWED in marketplace.json:**

```
specweave-backend: 10 pts
└─ Skills: +10 (3 reference skills only)
```

**Removed from Marketplace (2025-11-22):**
- `specweave-backend` (10)
- `specweave-confluent` (10)
- `specweave-diagrams` (30)
- `specweave-kubernetes` (10)
- `specweave-mobile` (10)
- `specweave-payments` (10)

---

## 🛡️ Multi-Layer Prevention System

### Layer 1: Pre-Commit Hook (Automatic)
**File:** `.git/hooks/pre-commit` (Section 6B)

**Behavior:**
- Triggers when `.claude-plugin/marketplace.json` is modified
- Runs LLM judge validation automatically
- Blocks commit if any plugin scores <40 points
- Provides clear error messages with remediation steps

**Example:**
```bash
git add .claude-plugin/marketplace.json
git commit -m "add new plugin"

# Output:
🔍 Validating marketplace.json completeness (judge scoring)...
▶ my-new-plugin
  Skills: +10 (3 files)
  TOTAL SCORE: 10 (INCOMPLETE - FAILED)

❌ Commit blocked: Marketplace validation failed
   Fix: Add commands/lib/agents to reach ≥40 points
```

### Layer 2: Manual Validation (On-Demand)
**Script:** `bash scripts/validate-marketplace-plugins.sh`

**Use Cases:**
- Pre-commit testing before staging changes
- CI/CD pipeline validation
- Marketplace health checks
- Plugin development verification

**Example Output:**
```bash
🔍 SpecWeave Marketplace Plugin Validation (Enhanced)
==========================================================

📄 Reading marketplace.json...
✓ Found 11 plugins listed in marketplace.json

🔎 Validating plugin completeness with scoring...

▶ specweave-github
  Commands: +40 (6 files)
  Lib: +40 (94 files)
  Hooks: +20 (1 files)
  Skills: +10 (4 files)
  TOTAL SCORE: 110 (Production-Ready)

[... more plugins ...]

==========================================================
📊 Validation Results:

  Total plugins:      11
  Complete plugins:   11
  Incomplete plugins: 0

✅ VALIDATION PASSED!
Health Score: 100%
```

### Layer 3: CI/CD (Future)
**Planned:** GitHub Actions workflow

**Features:**
- Automatic validation on every PR
- Prevents merging incomplete plugins
- Marketplace health reporting
- Integration with npm pre-publish

---

## 📋 Developer Workflow

### Adding a New Plugin to Marketplace

**Step 1: Implement Functionality**
```bash
# Option A: Create slash command (40 pts)
mkdir -p plugins/my-plugin/commands
cat > plugins/my-plugin/commands/my-command.md << 'EOF'
---
name: my-command
description: Does something useful
---

# /my-command

Implementation here...
EOF

# Option B: Create lib implementation (40 pts)
mkdir -p plugins/my-plugin/lib
# Add ≥10 .js/.ts files

# Option C: Create agent with templates (30 pts, needs +10 more)
mkdir -p plugins/my-plugin/agents/my-agent
# Add AGENT.md + 3+ support files
```

**Step 2: Create Plugin Metadata**
```bash
mkdir -p plugins/my-plugin/.claude-plugin
cat > plugins/my-plugin/.claude-plugin/plugin.json << 'EOF'
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "Plugin description"
}
EOF
```

**Step 3: Validate BEFORE Adding to Marketplace**
```bash
# Add to marketplace.json temporarily
jq '.plugins += [{
  "name": "my-plugin",
  "description": "...",
  "source": "./plugins/my-plugin",
  "category": "development",
  "version": "1.0.0",
  "author": {"name": "Your Name", "email": "your@email.com"}
}]' .claude-plugin/marketplace.json > .claude-plugin/marketplace.json.tmp

mv .claude-plugin/marketplace.json.tmp .claude-plugin/marketplace.json

# Validate
bash scripts/validate-marketplace-plugins.sh
```

**Step 4: Commit (Auto-Validates)**
```bash
git add .claude-plugin/marketplace.json plugins/my-plugin/
git commit -m "feat: add my-plugin to marketplace"

# Pre-commit hook runs automatically
# ✅ Marketplace validation passed (if ≥40 points)
# OR
# ❌ Commit blocked (if <40 points)
```

---

## 🔧 Troubleshooting

### Error: "INCOMPLETE - FAILED"

**Symptom:**
```
▶ my-plugin
  Skills: +10 (3 files)
  TOTAL SCORE: 10 (INCOMPLETE - FAILED)
```

**Solutions:**

**Option 1: Add Commands (+40 pts)**
```bash
mkdir -p plugins/my-plugin/commands
echo "# /my-command" > plugins/my-plugin/commands/my-command.md
# Now: 10 + 40 = 50 pts ✅
```

**Option 2: Add Lib (+40 pts)**
```bash
mkdir -p plugins/my-plugin/lib
# Create ≥10 .js/.ts files
# Now: 10 + 40 = 50 pts ✅
```

**Option 3: Enhance Agent (+30 pts)**
```bash
mkdir -p plugins/my-plugin/agents/my-agent/templates
# Add AGENT.md + 3+ support files
# Now: 10 + 30 = 40 pts ✅
```

### Error: "Plugin directory not found"

**Symptom:**
```
▶ my-plugin
  ⚠️ Directory not found
```

**Solution:**
- Plugin listed in marketplace.json but directory doesn't exist
- Verify: `ls -la plugins/my-plugin/`
- Create directory or remove from marketplace.json

---

## 📊 Current Marketplace Health

**Status:** ✅ 100% (11/11 complete)

**Last Updated:** 2025-11-22

**Plugins:**
- Total: 11
- Production-Ready (≥80): 5 (45%)
- Complete (40-79): 5 (45%)
- Core: 1 (10%) - specweave

**Incomplete Plugins Removed:**
- specweave-backend → To be re-added after implementation
- specweave-confluent → To be re-added after implementation
- specweave-diagrams → To be re-added after implementation
- specweave-kubernetes → To be re-added after implementation
- specweave-mobile → To be re-added after implementation
- specweave-payments → To be re-added after implementation

**Roadmap:**
- [ ] Implement 6 incomplete plugins to ≥40 points
- [ ] Re-add to marketplace.json after validation
- [ ] Target: 17/17 complete (100%)
- [ ] Add CI/CD validation (GitHub Actions)
- [ ] Add npm pre-publish hook

---

## 📚 Reference Documentation

**Comprehensive Analysis:**
- `.specweave/increments/0052-marketplace-validation/SOLUTION-SUMMARY.md`

**Source Code:**
- `scripts/validate-marketplace-plugins.sh` - Enhanced validation script
- `.git/hooks/pre-commit` - Section 6B integration
- `scripts/pre-commit-validate-plugins.sh` - Pre-commit helper

**Developer Guide:**
- `CLAUDE.md` - Section 14: Marketplace Plugin Completeness

**Changelog:**
- `CHANGELOG.md` - Judge-Based Marketplace Plugin Validation (v0.24.0+)

---

## 🎯 Quick Reference

**Validation Command:**
```bash
bash scripts/validate-marketplace-plugins.sh
```

**Expected Output (Success):**
```
✅ VALIDATION PASSED!
Health Score: 100%
```

**Minimum Requirements:**
- ≥40 points total score
- At least ONE of: commands/, lib/, or agents/ (with support files)
- Valid plugin.json metadata
- No duplicate plugin names

**Scoring Cheat Sheet:**
- Need 40 pts? → Add 1 command OR 10+ lib files
- Have 30 pts? → Add 3 skills OR enhance agents
- Have 10 pts? → Add command/lib (fastest path to 40)

---

**Status:** 🎉 **ACTIVE & VALIDATED** 🎉

**Maintained By:** SpecWeave Core Team
**Issues:** https://github.com/anton-abyzov/specweave/issues
**Contact:** anton.abyzov@gmail.com
