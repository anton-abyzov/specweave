# SpecWeave Installation

## Quick Start

### Install SpecWeave to Any Project

```bash
./install.sh /path/to/your/project
```

### Example: Event Management SaaS

```bash
# Install
./install.sh /Users/antonabyzov/Projects/TestLab/specweave-event-mgmt

# Navigate
cd /Users/antonabyzov/Projects/TestLab/specweave-event-mgmt

# Open in Claude Code
code .
```

**In Claude Code:**
```
Create a SaaS for event management with calendar booking for my soccer facility.
Tech stack: Next.js 14 + PostgreSQL
Work autonomously using SpecWeave skills.
```

**Wait 10-30 minutes → Complete SaaS ready! 🚀**

---

## What Gets Installed

### Ultra-Minimal Installation

```
your-project/
├── .claude/              ✅ Claude Code integration
│   ├── skills/           ✅ SpecWeave skills (8 complete, more in development)
│   ├── commands/         ✅ Slash commands (1 complete, more in development)
│   └── hooks/            ✅ Automation hooks (4 hooks)
├── .specweave/           ✅ SpecWeave framework (ALL work lives here)
│   ├── increments/       ✅ Development increments
│   └── docs/             ✅ Living documentation (auto-updated)
├── CLAUDE.md             ✅ Complete development guide
└── .gitignore            ✅ Standard ignores
```

### Your Application Code (Created by Skills)

```
Skills create your application structure:
├── app/                  ⚛️  Next.js app (or your framework)
├── components/           🎨 React components
├── lib/                  🔧 Utilities
├── prisma/               🗄️  Database schema
├── public/               📁 Static files
└── ... (framework-specific folders)
```

---

## Philosophy

### Start Minimal → Skills Create Structure

**Before (Cluttered):**
- Installed all folders upfront
- User confused by empty folders
- Unclear what's needed

**Now (Clean):**
- Install only framework essentials
- Skills create structure as needed
- User sees only what's relevant
- All work happens in `.specweave/increments/`

---

## What Does NOT Get Copied

❌ **SpecWeave Internal Files:**
- `ai-execution-files/` (SpecWeave internal only - NOT used in projects)
- `src/` (SpecWeave source code)
- Development `.claude/` (may have non-SpecWeave skills)
- Any SpecWeave project folders

✅ **You Get Instead:**
- Clean, minimal installation
- Skills that create YOUR application code
- ALL work managed in `.specweave/`
- Framework that scales from solo to enterprise

---

## Installation Details

### What the Script Does

1. ✅ Copies `.claude/` (skills, commands, hooks)
3. ✅ Copies `CLAUDE.md` development guide
4. ✅ Creates `.specweave/` directory structure
5. ✅ Creates empty `ai-execution-files/` for your use
6. ✅ Creates `.gitignore`
7. ✅ Makes hooks executable

### What the Script Does NOT Do

❌ Does NOT copy SpecWeave's internal files (`ai-execution-files/`)
❌ Does NOT create ANY project folders
❌ Does NOT pollute your project with empty directories

**Why?** ALL SpecWeave work happens in `.specweave/`. Your application code is created by skills as needed.

---

## After Installation

### 1. Edit Configuration

```bash
cd your-project
vim .specweave/config.yaml
```

Update:
- `project.name`
- `project.description`
- Integration settings (JIRA, GitHub, ADO)

### 2. Start Development

Open in Claude Code and give a high-level request:

```
Create a [type] application for [domain].

Tech stack: [framework] + [database]
Features: [list]

Work autonomously using SpecWeave skills.
```

### 3. Skills Work Autonomously

1. `specweave-detector` activates (proactive)
2. `skill-router` routes to appropriate skills
3. `spec-author` creates specifications
4. `architect` designs architecture
5. `increment-planner` creates implementation plans
6. `developer` implements code
7. `playwright-tester` creates E2E tests
8. `qa-engineer` validates quality
9. `docs-updater` updates documentation

### 4. Review & Deploy

- Review generated code
- Customize as needed
- Run tests
- Deploy! 🚀

---

## Verification

After installation, verify:

```bash
cd your-project

# Check installed components
ls -la .claude/skills/      # Should have 8 SpecWeave skills
ls -la .claude/commands/    # Should have slash commands
ls -la .claude/hooks/       # Should have 4 executable hooks
cat .specweave/config.yaml  # Should exist
cat CLAUDE.md               # Should exist

# Verify clean installation
test ! -d ai-execution-files && echo "✅ No ai-execution-files/ folder"
test ! -d specifications && echo "✅ No specifications/ folder"
test ! -d features && echo "✅ No features/ folder"
test ! -d tests && echo "✅ No tests/ folder"
test ! -d work && echo "✅ No work/ folder"

# Should only see: .claude/, .specweave/, CLAUDE.md, .gitignore
```

---

## Troubleshooting

### Skills not activating?

```bash
ls -la .claude/skills/
# Should see 8 SpecWeave skills (complete with SKILL.md):
# - specweave-detector
# - skill-router
# - context-loader
# - increment-planner
# - nextjs-agent
# - hetzner-provisioner
# - cost-optimizer
# - devops-agent
# Note: More skills in development, will be added as completed
```

### Hooks not running?

```bash
ls -la .claude/hooks/
chmod +x .claude/hooks/*.sh
```

### Commands not found?

```bash
ls -la .claude/commands/
# Should see: specweave.inc.md, specweave.do.md, specweave.validate.md, etc.
```

---

## Advanced Usage

### Install to Multiple Projects

```bash
for project in project-a project-b project-c; do
  ./install.sh ~/Projects/$project
done
```

### Install to Current Directory

```bash
./install.sh .
```

### Dry Run (Test Without Installing)

```bash
# Test the script
./install.sh /tmp/test-install
ls -la /tmp/test-install
rm -rf /tmp/test-install
```

---

## Related Documentation

- [quickstart.md](quickstart.md) - Quick start guide
- [CLAUDE.md](../../../CLAUDE.md) - Complete development guide (installed with framework)
- **INSTALLATION-SUMMARY.md** - Complete summary of installation system (if exists)
- **ai-execution-files/README.md** - Internal vs. user usage explanation (SpecWeave repo only)
- **ai-execution-files/examples/event-mgmt-saas-setup.md** - Complete example (SpecWeave repo only)

---

## Examples

### Example 1: Event Management SaaS

```bash
./install.sh ~/Projects/event-management
cd ~/Projects/event-management
code .
```

In Claude Code:
```
Create a SaaS for event management with calendar booking.
Tech stack: Next.js 14 + PostgreSQL
Features: Calendar, events, auth, payments, admin
Work autonomously.
```

### Example 2: E-Commerce Platform

```bash
./install.sh ~/Projects/ecommerce
cd ~/Projects/ecommerce
code .
```

In Claude Code:
```
Create an e-commerce platform.
Tech stack: Next.js 14 + PostgreSQL + Stripe
Features: Products, cart, checkout, orders, admin
Work autonomously.
```

### Example 3: CRM System

```bash
./install.sh ~/Projects/crm
cd ~/Projects/crm
code .
```

In Claude Code:
```
Create a CRM system.
Tech stack: Next.js 14 + PostgreSQL
Features: Contacts, companies, deals, pipeline, reports
Work autonomously.
```

---

## Success Metrics

After installation + autonomous development:

✅ **Time to MVP:** 2-3 hours (vs. 6-8 weeks traditional)
✅ **Code Quality:** Production-ready
✅ **Test Coverage:** >80% with E2E tests
✅ **Documentation:** Auto-updated and complete
✅ **Deployment:** Ready to deploy with included configs

---

## Support

- **GitHub:** [anton-abyzov/specweave](https://github.com/anton-abyzov/specweave)
- **Issues:** [GitHub Issues](https://github.com/anton-abyzov/specweave/issues)
- **Documentation:** `.specweave/docs/` (after installation)

---

## License

MIT License - See [LICENSE](LICENSE)

---

**SpecWeave** - Spec-Driven Development Framework
*Build software 50-100x faster with autonomous AI agents*

🚀 **Install now:** `./install.sh /path/to/your/project`
