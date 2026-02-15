# Generic Adapter

**Automation Level**: Manual (Works with literally ANY AI tool)

## Overview

The Generic adapter provides a **manual workflow** for SpecWeave that works with **100% of AI tools** - ChatGPT web, Claude web, Gemini, Perplexity, You.com, or any AI that can read text and follow instructions.

## Key Value: Universal Compatibility

**The Problem**:
- Claude Code adapter: Only works with Claude Code (~10% market)
- Cursor adapter: Only works with Cursor (~30% market)
- Copilot adapter: Only works with VS Code + Copilot (~40% market)
- **Combined: Still missing ~20% of developers!**

**The Solution**:
- Generic adapter: Works with **EVERYTHING** (100% market coverage)
- ChatGPT web? ✅
- Claude web? ✅
- Gemini? ✅
- Any other AI? ✅

## What This Adapter Provides

### SPECWEAVE-MANUAL.md (Complete Step-by-Step Guide)
- **Step 1**: Create increment folder (terminal command)
- **Step 2**: Create spec.md (copy template → paste to AI → save response)
- **Step 3**: Create plan.md (copy template → paste to AI → save response)
- **Step 4**: Create tasks.md (copy template → paste to AI → save response)
**Total time**: 30-60 minutes per feature (vs 30 seconds with Claude Code)

### Trade-Off: Speed vs Compatibility

| Adapter | Speed | Compatibility | Automation |
|---------|-------|---------------|------------|
| **Claude Code** | ⚡⚡⚡⚡⚡ (30s) | Claude only (~10%) | Full |
| **Cursor** | ⚡⚡⚡⚡ (5min) | Cursor only (~30%) | Semi |
| **Copilot** | ⚡⚡⚡ (15min) | VS Code+Copilot (~40%) | Basic |
| **Generic** | ⚡ (30-60min) | **100% (ANY AI!)** | Manual |

**Generic = Slowest, but works with EVERYTHING!**

## Understanding "Manual" Workflow

**Manual ≠ Hard, Manual = YOU Orchestrate Each Step**

**Example workflow**:
1. **You**: Open SPECWEAVE-MANUAL.md, read Step 2 (Create spec.md)
2. **You**: Copy template prompt from manual
3. **You**: Paste to ChatGPT (or any AI)
4. **AI**: Generates spec.md content following SpecWeave patterns
5. **You**: Copy AI's response
6. **You**: Save to `spec.md` file manually
7. **Repeat for plan.md, tasks.md, etc.**

**Result**: Same quality as automated adapters, just more manual steps!

## Installation

```bash
# Install SpecWeave with Generic adapter
npx specweave init my-project --adapter generic

# Files created:
# SPECWEAVE-MANUAL.md    (complete step-by-step guide)
```

## Directory Structure

```
SPECWEAVE-MANUAL.md    # Main manual workflow guide (read this!)
.specweave/
└── adapters/
    └── generic/
        └── README.md   # This file
```

## Usage Example (Creating Authentication Feature)

### Complete Workflow (30-60 minutes)

**Step 1** (Terminal - 1 minute):
```bash
mkdir -p .specweave/increments/0001-user-authentication
cd .specweave/increments/0001-user-authentication
```

**Step 2** (Create spec.md - 10 minutes):
1. Open SPECWEAVE-MANUAL.md
2. Find "Step 2: Create spec.md"
3. Copy entire prompt template
4. Paste to ChatGPT/Claude/Gemini
5. Fill in your requirements: "Email/password auth, Google OAuth, JWT tokens..."
6. AI generates complete spec.md
7. Copy response → Save to `spec.md`

**Step 3** (Create plan.md - 15 minutes):
1. Copy plan.md template from manual
2. Paste to AI along with spec.md content
3. AI generates technical plan
4. Copy response → Save to `plan.md`

**Step 4** (Create tasks.md - 10 minutes):
1. Copy tasks.md template from manual
2. Paste to AI along with plan.md content
3. AI generates implementation checklist
4. Copy response → Save to `tasks.md`

**Total**: 36 minutes (vs 30 seconds with Claude Code automation!)

## Simulating Skills Manually

### What are Skills?

**In Claude Code**: Auto-activating capabilities
**In Generic**: YOU follow skill workflows manually

### Example: increment Skill

**Claude Code (automatic)**:
```
User: "create increment for auth"
→ increment skill auto-activates
→ Creates spec, plan, tasks in 30 seconds
```

**Generic (manual)**:
```
You: Read SPECWEAVE-MANUAL.md
You: Follow Step 1 (create folder - 1 min)
You: Follow Step 2 (create spec.md with AI - 10 min)
You: Follow Step 3 (create plan.md with AI - 15 min)
You: Follow Step 4 (create tasks.md with AI - 10 min)
Total: 36 minutes
```

You manually execute the entire workflow!

## Simulating Agents Manually

### What are Agents?

**In Claude Code**: Specialized roles with separate context windows
**In Generic**: YOU tell AI which role to adopt

### Example: Frontend Agent

**Claude Code (automatic)**:
```typescript
Skill({ skill: "sw-frontend:frontend-architect", args: "design components" })
→ Frontend skill activates and provides specialized guidance
```

**Note**: In Claude Code, PM/Architect are SKILLS that auto-activate on keywords. For explicit invocation, use the Skill tool.

**Generic (manual)**:
```
You paste to ChatGPT:
"Act as Product Manager and create spec.md.

As PM, focus on:
- WHAT and WHY (not HOW)
- Technology-agnostic requirements
- User stories with acceptance criteria

Requirements: [your requirements]"
```

The AI adopts PM perspective and creates spec.md!

### All Roles You Can Simulate

| Role | Prompt Template | Focus |
|------|----------------|-------|
| **PM** | "Act as PM and create spec" | WHAT/WHY, user stories |
| **Architect** | "Act as Architect and create plan" | HOW, technical design |
| **DevOps** | "Act as DevOps and create infrastructure" | Deployment, monitoring |
| **QA Lead** | "Act as QA and create test strategy" | Test coverage, cases |
| **Security** | "Act as Security and review" | Threats, vulnerabilities |

## Comparison with Other Adapters

| Feature | Claude Code | Cursor | Copilot | Generic |
|---------|-------------|--------|---------|---------|
| **Automation** | Full | Semi | Basic | Manual |
| **Skills** | Native | Simulated | N/A | Manual (follow guide) |
| **Agents** | Native | Manual roles | N/A | Manual (tell AI role) |
| **Context** | Auto-load | @ shortcuts | Instructions | Manual (copy files) |
| **Speed** | ⚡⚡⚡⚡⚡ | ⚡⚡⚡⚡ | ⚡⚡⚡ | ⚡ |
| **Compatibility** | 10% | 30% | 40% | **100%** |

**Generic = Slowest but most compatible!**

## When to Use This Adapter

✅ **Use Generic adapter if**:
- You use ChatGPT web, Claude web, Gemini, or other non-IDE AI
- You don't have Claude Code, Cursor, or VS Code
- You want maximum tool flexibility
- Simple projects (1-5 increments)
- Learning SpecWeave methodology

⚠️ **Consider alternatives if**:
- You have Claude Code → Use Claude adapter (10-20x faster)
- You have Cursor → Use Cursor adapter (5-10x faster)
- You have VS Code+Copilot → Use Copilot adapter (2-3x faster)
- Large projects (10+ increments) → Manual becomes tedious

## Tips for Success

### 1. Follow SPECWEAVE-MANUAL.md Exactly
Templates are tested and proven → Use as-is

### 2. Load Only Relevant Context
Don't paste 500 pages → Only load increment spec.md, plan.md, tasks.md

### 3. Tell AI Which Role to Adopt
"Act as PM" or "Act as Architect" → Better results

### 4. Save AI Responses Immediately
Don't lose generated content → Copy and save right away

### 5. Iterate if Needed
First pass not perfect? Ask AI to refine/improve

## Related Documentation

- [SPECWEAVE-MANUAL.md](SPECWEAVE-MANUAL.md) - **Read this first!** Complete step-by-step guide
- [SPECWEAVE.md](../../SPECWEAVE.md) - Complete technical documentation
- [Adapter Architecture](../README.md) - Multi-tool design philosophy

---

**Status**: Active (v0.2.0-beta.1+)
**Market Share**: ~20% (users without IDE-integrated AI)
**Priority**: P1 (ensures 100% market coverage)

---

**Remember**: Manual = Slower, but works with ANY AI tool! 🌍
