# SpecWeave Quick Start

Get started with SpecWeave in 30 seconds.

## Install SpecWeave into any project in 30 seconds and start autonomous development.

### One-Command Installation

```bash
# Install globally (recommended)
npm install -g specweave

# Initialize your project
mkdir my-project && cd my-project
specweave init .
```

**Or use npx (no install needed):**
```bash
npx specweave init my-project
cd my-project
```

That's it! SpecWeave is installed and ready.

## What You Get

- ✅ **SpecWeave Skills** - Autonomous development agents (8 complete skills, more coming)
- ✅ **Slash Commands** - `/create-project` (more coming)
- ✅ **Automation Hooks** - Auto-update docs, validate quality (4 hooks)
- ✅ **Complete Framework** - Minimal installation, skills create structure as needed
- ✅ **Development Guide** - `CLAUDE.md` with everything you need

## Two Ways to Start

### Option 1: Interactive Quick Build (Fastest)

**Perfect for:** Small projects, prototypes, learning SpecWeave

Simply describe what you want to build:

```
"build a very simple web calculator app"
```

**SpecWeave's intelligent assistant guides you through:**

1. **Approach** - Choose your workflow:
   ```
   ❯ Quick build - just code it now
     SpecWeave increment - plan first
     Type something...
   ```

2. **Features** - Multi-select what you need:
   ```
   ☑ Basic operations (+, -, ×, ÷)
   ☑ Additional functions (%, √, clear, backspace)
   ☑ Keyboard support
   ☑ Calculation history
   ☐ Type something custom...
   ```

3. **Tech Stack** - Pick your tools:
   ```
   ❯ Vanilla HTML/CSS/JS
     React
     Your choice
     Type something...
   ```

4. **Review & Submit** - Confirm and start building!

**Result:** 2 minutes from idea to working code

### Option 2: Specification-First (Best Practice)

**Perfect for:** Production features, team projects, complex systems

Open in Claude Code and describe your project:

```
User: "Build a real estate listing platform with Next.js, Prisma, and Hetzner deployment"
     ↓
SpecWeave: 🤖 PM agent analyzing requirements...
           🏗️ Architect agent designing system...
           🚀 DevOps agent planning infrastructure...

✅ Created: PRD, HLD, Implementation Plan, Hetzner IaC
✅ Ready to implement!

User: "Implement the backend API"
     ↓
SpecWeave: 🤖 Implementing based on specifications...
           ✅ Creates database schema
           ✅ Generates API endpoints
           ✅ Writes tests
           ✅ Updates documentation

✅ Implementation complete!
```

## What Happens Autonomously

1. **Market Research** - PM agent researches your domain
2. **Requirements** - Creates comprehensive PRD
3. **Architecture** - Architect designs HLD with C4 diagrams
4. **Planning** - Generates step-by-step implementation plan
5. **Deployment** - DevOps agent creates Terraform/Pulumi IaC
6. **Implementation** - Agents build according to specs
7. **Testing** - QA agent creates test strategy
8. **Documentation** - Auto-updates as code evolves

## Key Features

### 1. Autonomous Development
- Minimal interaction required
- Agents ask clarifying questions
- Review output before proceeding
- Validate quality at each milestone

### 2. Context Precision (70% Token Reduction)
- Progressive disclosure: skills load only when relevant
- Sub-agent parallelization: work in isolated contexts
- Smart incremental loading: fetch only needed specs

### 3. E2E Testing (MANDATORY for UI)
- Playwright tests for all UI features
- Minimum 3 tests per component
- Tests must tell the truth (no false positives)
- 80%+ coverage on critical paths

### 4. Living Documentation
- Specs auto-update after every operation
- Always in sync with code
- No drift, no surprises
- Compliance-ready (HIPAA, SOC 2, FDA)

### 5. Brownfield Support
- Intelligently onboard existing projects
- Merge existing documentation
- Generate retroactive architecture docs
- Baseline tests before modifications

## Requirements

**Minimum:**
- Node.js 18+ (`node --version`)
- npm 9+ (`npm --version`)
- Claude Code (recommended) or any AI tool

**Recommended:**
- Claude Code with Claude Sonnet 4.5 (best experience)
- Git - Version control

## Example: Event Management SaaS

```bash
# Install SpecWeave
npm install -g specweave

# Create project
mkdir eventmgmt && cd eventmgmt
specweave init .

# Open in Claude Code and describe:
"Build an event management SaaS with Next.js 14 App Router,
Prisma, NextAuth.js, Stripe payments, deployed on Hetzner Cloud"

# SpecWeave autonomously creates:
✅ PRD with market research
✅ HLD with C4 diagrams
✅ Database schema (Prisma)
✅ Authentication system (NextAuth.js)
✅ Payment integration (Stripe)
✅ Infrastructure code (Terraform for Hetzner)
✅ Deployment pipeline (GitHub Actions)
✅ Comprehensive tests (Playwright E2E + Jest)
✅ Living documentation (auto-updates)

# Just say: "Implement the MVP"
# SpecWeave builds the entire application!
```

## Configuration

After installation, optionally edit `.specweave/config.yaml`:

```yaml
project:
  name: "your-project"
  type: "greenfield"  # or "brownfield"

hooks:
  enabled: true
  post_task_completion:
    enabled: true
    notification_sound: true  # macOS notification

testing:
  e2e_playwright_mandatory_for_ui: true
  min_coverage: 80

integrations:
  jira:
    enabled: false
  github:
    enabled: false
```

## Next Steps

1. ✅ Read the [Installation Guide](installation.md) for detailed setup options
2. ✅ Review `CLAUDE.md` in your project
3. ✅ Explore [Key Features](../../overview/features.md)
4. ✅ Check out [Example Projects](../examples/)

## Troubleshooting

### Skills not activating?

**Check installation:**
```bash
ls -la .claude/skills/
# Should see 35+ SpecWeave skills with SKILL.md
```

**If missing:**
```bash
specweave init . --force  # Reinstall
```

### Commands not found?

```bash
ls -la .claude/commands/
# Should see: inc.md, do.md, etc.
```

### Hooks not running?

```bash
chmod +x .claude/hooks/*.sh
```

## Documentation

- **Website:** [spec-weave.com](https://spec-weave.com)
- **npm Package:** [npmjs.com/package/specweave](https://www.npmjs.com/package/specweave)
- **GitHub:** [github.com/anton-abyzov/specweave](https://github.com/anton-abyzov/specweave)
- **CLAUDE.md:** Complete guide (installed in your project)

## Support

- **Issues:** [GitHub Issues](https://github.com/anton-abyzov/specweave/issues)
- **Discussions:** [GitHub Discussions](https://github.com/anton-abyzov/specweave/discussions)

---

**SpecWeave** - Replace vibe coding with spec-driven development.

🚀 **Get started:** `npm install -g specweave && specweave init my-project`
