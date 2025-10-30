# Ultrathinking Analysis: Progressive Disclosure for Multi-Tool AI Compatibility

**Date**: 2025-10-30
**Context**: Skills not being discovered/used by non-Claude AI tools
**Problem**: GitHub Copilot, Cursor, and other tools ignore `.claude/skills/` despite instructions in AGENTS.md
**Root Cause**: Missing progressive disclosure pattern that Claude Code uses natively

---

## 🎯 The Core Problem

### What's Happening

1. **Claude Code** (native): ✅ Works perfectly
   - Reads YAML frontmatter from all SKILL.md files at startup
   - Holds skill names/descriptions in memory (first level of disclosure)
   - Loads full SKILL.md when keywords match user request (second level)
   - Automatic, built into the tool

2. **Other AI Tools** (Copilot, Cursor, etc.): ❌ Completely ignore skills
   - No native skill support
   - Rely on AGENTS.md.template instructions
   - Current instructions too vague: "Read the skill file: .claude/skills/{skill-name}/SKILL.md"
   - No workflow for discovery → matching → loading → execution
   - Result: Skills are invisible, workflows get reinvented every time

### Why Current Instructions Fail

**Current AGENTS.md.template (lines 72-89)**:
```markdown
## Available Skills (Specialized Capabilities)

SpecWeave has specialized capabilities for different tasks:

{SKILLS_SECTION}

### How to Use Skills

**In Claude Code** (automatic):
- Skills activate based on keywords in your request
- No manual invocation needed

**In other tools** (manual):
- Read the skill file: `.claude/skills/{skill-name}/SKILL.md`
- Follow the workflow described in that file
- Example: "Following increment-planner skill workflow..."
```

**Problems:**
1. ❌ No instruction to check skills BEFORE starting work
2. ❌ No discovery mechanism (how do I find the right skill?)
3. ❌ No matching algorithm (how do I know which skill to use?)
4. ❌ No progressive disclosure pattern (scan → match → load → execute)
5. ❌ Treats skills as optional documentation, not mandatory expert manuals

### The Deeper Issue: Context Awareness

**Claude Code's advantage:**
- Pre-loads all skill metadata at startup
- Has ALL skills in "peripheral awareness"
- Can match user requests against activation keywords instantly
- Progressive disclosure happens automatically

**Other AI tools:**
- Start with ZERO knowledge of skills
- Only know what's in AGENTS.md (limited context window)
- Would need to read 34 SKILL.md files to discover all skills = massive token waste
- No efficient way to discover + match skills

---

## 🧠 The Solution: Simulating Progressive Disclosure

### Core Insight from Claude's Engineering Blog

From https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills:

> "At its simplest, a skill is a directory that contains a SKILL.md file. This file must start with YAML frontmatter that contains some required metadata: name and description. **At startup, the agent pre-loads the name and description of every installed skill into its system prompt.**
>
> This metadata is the **first level of progressive disclosure**: it provides just enough information for Claude to know when each skill should be used without loading all of it into context. The actual body of this file is the **second level of detail**. If Claude thinks the skill is relevant to the current task, it will load the skill by reading its full SKILL.md into context."

**Key Mechanism:**
1. **Level 1** (always loaded): Skill name + description (with activation keywords)
2. **Level 2** (on-demand): Full SKILL.md content

### How We Simulate This for Non-Native Tools

Since Copilot/Cursor/etc. can't pre-load skills at startup, we need to:

1. **Create a Skills Index** (`SKILLS-INDEX.md`)
   - Contains ALL skill names + descriptions + activation keywords
   - Single file, easy to scan (replaces 34 individual file reads)
   - Simulates Claude's "pre-loaded skill metadata"

2. **Update AGENTS.md with Explicit Workflow**
   - Step 1: Read SKILLS-INDEX.md (every session start)
   - Step 2: Match user request to activation keywords
   - Step 3: Load full SKILL.md for matches
   - Step 4: Follow skill's workflow

3. **Make Skills Discovery Mandatory**
   - Not "you can read skills" but "you MUST check skills first"
   - Position skills as authoritative expert manuals
   - Emphasize token savings and quality benefits

---

## 📐 Detailed Design

### 1. SKILLS-INDEX.md (Auto-Generated)

**Location**: `.claude/skills/SKILLS-INDEX.md`

**Purpose**: Single-file reference for ALL skills, simulating Claude Code's pre-loaded metadata

**Format**:
```markdown
# SpecWeave Skills Index

**Purpose**: Quick reference for all available skills. Read this file BEFORE starting any task.

**Last Updated**: 2025-10-30 [auto-generated, do not edit manually]

**Total Skills**: 34

---

## 🚀 Quick Start (Progressive Disclosure)

1. **Scan this index** to find skills matching your task
2. **Match activation keywords** to your current request
3. **Load full SKILL.md** for matching skills
4. **Follow the workflow** in SKILL.md precisely

---

## All Available Skills

### increment-planner
**Description**: Creates comprehensive implementation plans for SpecWeave increments (aka features - both terms are interchangeable). This skill should be used when planning new increments/features, creating specifications, or organizing implementation work.

**Activates for**: increment planning, feature planning, implementation plan, create increment, create feature, plan increment, plan feature, organize work, break down increment, break down feature

**Location**: `.claude/skills/increment-planner/SKILL.md`

**When to use**: Planning new features, breaking down epics, organizing implementation work

---

### jira-sync
**Description**: Sync SpecWeave increments with JIRA epics/stories. Coordinates with specweave-jira-mapper agent.

**Activates for**: JIRA sync, create JIRA issue, import from JIRA, sync to JIRA

**Location**: `.claude/skills/jira-sync/SKILL.md`

**When to use**: Syncing SpecWeave increments with external JIRA projects

---

### context-loader
**Description**: Explains how SpecWeave achieves context efficiency through Claude's native progressive disclosure mechanism and sub-agent parallelization.

**Activates for**: context loading, progressive disclosure, token efficiency, sub-agents, context management

**Location**: `.claude/skills/context-loader/SKILL.md`

**When to use**: Understanding or explaining SpecWeave's context management

---

[... 31 more skills ...]

---

## Skill Categories

**Framework Core**:
- increment-planner, context-loader, context-optimizer

**External Integrations**:
- jira-sync, ado-sync, github-sync

**Architecture & Design**:
- diagrams-architect, diagrams-generator, design-system-architect

**Development**:
- frontend, nodejs-backend, python-backend, dotnet-backend, nextjs

**Quality & Testing**:
- increment-quality-judge, e2e-playwright

**Infrastructure**:
- hetzner-provisioner, cost-optimizer

**Documentation**:
- docusaurus, figma-to-code, figma-designer

[... etc ...]

---

## How Skills Work (Progressive Disclosure)

**Level 1 - Discovery (this file)**:
- Scan activation keywords
- Match to your current task
- Identify 1-3 relevant skills

**Level 2 - Deep Dive (SKILL.md)**:
- Load full skill documentation
- Read required prerequisites
- Follow step-by-step workflow

**Level 3 - Execution**:
- Apply skill's instructions
- Use recommended tools
- Follow best practices

---

## Why Skills Matter

**Without skills**:
- ❌ Reinvent workflows every session
- ❌ Inconsistent increment structure
- ❌ Miss SpecWeave conventions
- ❌ Waste tokens on irrelevant docs

**With skills**:
- ✅ Proven workflows ready to use
- ✅ Consistent high-quality output
- ✅ SpecWeave best practices enforced
- ✅ Efficient token usage (load only what's needed)

---

**Generated by**: `src/utils/generate-skills-index.ts`
**Regenerate with**: `npm run generate-skills-index`
```

**Key Features**:
- ✅ Single file (easy to load, low token cost)
- ✅ All skills listed with activation keywords
- ✅ Categorized for quick scanning
- ✅ Auto-generated (stays in sync)
- ✅ Clear progressive disclosure instructions

---

### 2. Updated AGENTS.md.template

**Location**: `src/templates/AGENTS.md.template`

**Changes**: Add new section BEFORE "Available Skills" (around line 70)

**New Section**:
```markdown
---

## 🎯 CRITICAL: Skills Are Your Expert Manuals (Read First!)

**MANDATORY**: Before starting ANY implementation task, check for relevant skills.

### What Are Skills?

Skills are **specialized expert manuals** that contain:
- Proven workflows for specific tasks
- SpecWeave conventions and best practices
- Required files to read and tools to use
- Step-by-step instructions
- Examples and test cases

**There are 34 skills available covering**:
- Feature planning (increment-planner)
- External integrations (jira-sync, ado-sync, github-sync)
- Architecture & design (diagrams-architect, design-system-architect)
- Development (frontend, nodejs-backend, python-backend, nextjs)
- Quality & testing (increment-quality-judge, e2e-playwright)
- Infrastructure (hetzner-provisioner, cost-optimizer)
- Documentation (docusaurus, figma-to-code)

### Progressive Disclosure Pattern (How to Use Skills)

**STEP 1: Discovery (Always Start Here)**

Before starting ANY task, read the skills index:

```bash
cat .claude/skills/SKILLS-INDEX.md
```

This single file contains ALL available skills with their activation keywords.

**STEP 2: Matching**

Look for skills whose "Activates for" keywords match your current task:

| Your Task | Relevant Skill | Keywords |
|-----------|---------------|----------|
| "Plan a new feature for user auth" | `increment-planner` | "feature planning", "create increment" |
| "Sync this to JIRA" | `jira-sync` | "JIRA sync", "create JIRA issue" |
| "Create architecture diagram" | `diagrams-architect` | "architecture diagram", "C4 diagram" |
| "Implement React component" | `frontend` | "React", "components", "UI" |
| "Deploy to cloud" | `hetzner-provisioner` or `cost-optimizer` | "deploy", "hosting", "infrastructure" |

**STEP 3: Load Full Skill**

Once you've identified 1-3 relevant skills, load their full documentation:

```bash
cat .claude/skills/{skill-name}/SKILL.md
```

**STEP 4: Execute Workflow**

Follow the skill's instructions precisely:
- Read required files listed in skill
- Use recommended tools
- Follow step-by-step workflow
- Apply best practices

### Why This Matters (Token Savings + Quality)

**Scenario**: User asks to plan a new feature

**Without skills** (bad):
```
❌ Read entire .specweave/docs/ folder (50k tokens)
❌ Guess at SpecWeave conventions
❌ Create inconsistent increment structure
❌ Miss context-manifest.yaml (no token savings)
❌ Reinvent workflow from scratch
```

**With skills** (good):
```
✅ Read SKILLS-INDEX.md (2k tokens)
✅ Match "plan feature" → increment-planner skill
✅ Load increment-planner SKILL.md (3k tokens)
✅ Follow proven workflow with templates
✅ Create proper context-manifest.yaml (70% token savings)
✅ Total: 5k tokens vs 50k = 90% savings + higher quality
```

### Skills vs Agents (What's the Difference?)

**Skills = Capabilities (WHAT you can do)**
- increment-planner: Creates feature plans
- jira-sync: Syncs with external tools
- diagrams-architect: Creates diagrams

**Agents = Roles (WHO you become)**
- PM: Product manager perspective
- Architect: Technical design perspective
- DevOps: Infrastructure perspective

**When to use**:
- Use **skills** for workflows and procedures
- Use **agents** when you need to adopt a specific role/perspective

### For Non-Claude Code Users

**GitHub Copilot, Cursor, Windsurf, etc.:**

Since these tools don't have native skill support, you MUST:

1. **At session start**: Always read `SKILLS-INDEX.md`
2. **Before each task**: Check if relevant skills exist
3. **During execution**: Follow skill workflows precisely
4. **When stuck**: Re-read the relevant SKILL.md

**Treat this as mandatory**, not optional. Skills are the difference between:
- Inconsistent ad-hoc work ❌
- Professional SpecWeave-compliant output ✅

---
```

**Position**: Insert around line 70, BEFORE "## Available Skills" section

**Key Changes**:
1. ✅ Explicit "CRITICAL" and "MANDATORY" language
2. ✅ Step-by-step progressive disclosure workflow
3. ✅ Concrete examples of task → skill matching
4. ✅ Token savings explanation (numbers!)
5. ✅ Emphasis on skills as expert manuals, not optional docs
6. ✅ Special section for non-Claude tools

---

### 3. Skills Index Generator

**Location**: `src/utils/generate-skills-index.ts`

**Purpose**: Auto-generate SKILLS-INDEX.md from all SKILL.md files

**Algorithm**:
```typescript
1. Scan src/skills/**/SKILL.md
2. For each skill:
   a. Read file
   b. Parse YAML frontmatter (name, description, allowed-tools)
   c. Extract activation keywords from description
3. Group skills by category (framework, integrations, development, etc.)
4. Generate markdown with:
   - Header with total count
   - Progressive disclosure instructions
   - Full skill list with activation keywords
   - Category index
5. Write to src/skills/SKILLS-INDEX.md (template)
6. Copy to user's .claude/skills/ during init
```

**TypeScript Interface**:
```typescript
interface SkillMetadata {
  name: string;
  description: string;
  activationKeywords: string[];
  location: string;
  allowedTools?: string[];
  category: SkillCategory;
}

enum SkillCategory {
  FRAMEWORK = "Framework Core",
  INTEGRATIONS = "External Integrations",
  ARCHITECTURE = "Architecture & Design",
  DEVELOPMENT = "Development",
  QUALITY = "Quality & Testing",
  INFRASTRUCTURE = "Infrastructure",
  DOCUMENTATION = "Documentation",
  OTHER = "Other"
}

async function generateSkillsIndex(): Promise<void> {
  const skills: SkillMetadata[] = [];

  // Scan all SKILL.md files
  const skillFiles = await glob('src/skills/**/SKILL.md');

  for (const file of skillFiles) {
    const content = await fs.readFile(file, 'utf-8');
    const metadata = parseSkillMetadata(content, file);
    skills.push(metadata);
  }

  // Categorize skills
  const categorized = categorizeSkills(skills);

  // Generate markdown
  const markdown = generateIndexMarkdown(categorized);

  // Write to template location
  await fs.writeFile('src/skills/SKILLS-INDEX.md', markdown);

  console.log(`✅ Generated SKILLS-INDEX.md with ${skills.length} skills`);
}
```

**Run**:
- During `specweave init`: Automatically
- Manually: `npm run generate-skills-index`
- In CI/CD: Pre-publish hook

---

### 4. Update init.ts

**Location**: `src/cli/commands/init.ts`

**Changes**: Add skills index generation step

```typescript
// After installing skills
await installSkills(targetDir);

// Generate skills index
console.log('Generating skills index...');
await generateSkillsIndex();

// Copy index to user's .claude/skills/
const indexPath = path.join(__dirname, '../../../src/skills/SKILLS-INDEX.md');
const targetIndexPath = path.join(targetDir, '.claude/skills/SKILLS-INDEX.md');
await fs.copy(indexPath, targetIndexPath);
console.log('✅ Skills index installed');
```

---

## 🎯 Implementation Plan

### Phase 1: Create Skills Index Generator

**Tasks**:
1. Create `src/utils/generate-skills-index.ts`
2. Implement YAML parsing (extract name, description)
3. Implement keyword extraction (from "Activates for:" in description)
4. Implement categorization logic
5. Implement markdown generation
6. Add npm script: `"generate-skills-index": "ts-node src/utils/generate-skills-index.ts"`

**Test**:
```bash
npm run generate-skills-index
cat src/skills/SKILLS-INDEX.md  # Verify output
```

### Phase 2: Update AGENTS.md.template

**Tasks**:
1. Add new section "🎯 CRITICAL: Skills Are Your Expert Manuals"
2. Include progressive disclosure steps (Discovery → Matching → Load → Execute)
3. Add examples table (task → skill mapping)
4. Add token savings explanation
5. Add special note for non-Claude tools

**Test**:
```bash
# Run init to generate AGENTS.md with new section
specweave init --tool claude test-project/
cat test-project/AGENTS.md | grep "CRITICAL: Skills"  # Verify section exists
```

### Phase 3: Update init.ts

**Tasks**:
1. Import generateSkillsIndex function
2. Add skills index generation step after skill installation
3. Copy SKILLS-INDEX.md to user's .claude/skills/
4. Add success message

**Test**:
```bash
specweave init --tool claude test-project/
cat test-project/.claude/skills/SKILLS-INDEX.md  # Verify index exists
```

### Phase 4: Documentation Updates

**Tasks**:
1. Update CLAUDE.md (this file) to mention skills index
2. Update README.md with progressive disclosure explanation
3. Update docs-site/docs/guides/skills.md
4. Create ADR for progressive disclosure pattern

### Phase 5: Multi-Tool Testing

**Test with**:
1. ✅ Claude Code (should still work, now has bonus SKILLS-INDEX.md)
2. ✅ GitHub Copilot (test with SKILLS-INDEX.md in instructions.md)
3. ✅ Cursor (test with SKILLS-INDEX.md reference in .cursorrules)
4. ✅ Generic (test with SKILLS-INDEX.md in AGENTS.md)

**Validation**:
- AI tool reads SKILLS-INDEX.md
- AI tool correctly matches task to skill
- AI tool loads full SKILL.md
- AI tool follows skill workflow

---

## 💡 Why This Will Work

### Root Cause Analysis

**Problem**: Non-Claude tools don't discover/use skills

**Root Causes**:
1. ❌ No native skill support in other tools
2. ❌ No efficient discovery mechanism (34 files to scan = too costly)
3. ❌ Vague instructions in AGENTS.md ("you can read skills")
4. ❌ Skills treated as optional, not mandatory

**Solution Mapping**:
1. ✅ Simulate native support with SKILLS-INDEX.md (single-file metadata)
2. ✅ Efficient discovery (1 file vs 34 files = 97% reduction)
3. ✅ Explicit instructions with examples ("you MUST check skills first")
4. ✅ Reframe as expert manuals, not docs ("CRITICAL", "MANDATORY")

### Expected Outcomes

**Before (current state)**:
- Non-Claude tools: 0% skill utilization
- Every session reinvents workflows
- Inconsistent increment structure
- Token waste on full .specweave/docs/ reads

**After (with progressive disclosure)**:
- Non-Claude tools: 80%+ skill utilization (with explicit instructions)
- Workflows followed from SKILL.md
- Consistent SpecWeave-compliant output
- Token savings from targeted skill loading

### Success Metrics

**Qualitative**:
- ✅ AI tools read SKILLS-INDEX.md at session start
- ✅ AI tools correctly match tasks to skills
- ✅ AI tools load and follow skill workflows
- ✅ Output matches SpecWeave conventions

**Quantitative**:
- Token usage: 90%+ reduction (5k vs 50k tokens)
- Consistency: 95%+ increments match proper structure
- Quality: 80%+ increments pass validation
- Developer satisfaction: Subjective, but measurable via feedback

---

## 🚀 Next Steps

1. **Immediate**: Implement skills index generator
2. **Next**: Update AGENTS.md.template with progressive disclosure
3. **Then**: Update init.ts to generate/copy index
4. **Finally**: Test with multiple AI tools

**Priority**: P1 (Critical for multi-tool compatibility)
**Estimated Effort**: 4-6 hours
**Impact**: High (unlocks skills for all AI tools, not just Claude)

---

## References

- [Claude Code Skills Documentation](https://www.anthropic.com/news/skills)
- [Agent Skills Engineering Blog](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- [agents.md Standard](https://agents.md/)
- [SpecWeave CLAUDE.md](../../CLAUDE.md)
- [Current AGENTS.md.template](../../../src/templates/AGENTS.md.template)

---

**Document Status**: Design Complete, Ready for Implementation
**Author**: Claude (SpecWeave Contributor)
**Date**: 2025-10-30
