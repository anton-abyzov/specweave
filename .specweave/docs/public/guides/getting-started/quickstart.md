# SpecWeave Quick Start

Install SpecWeave into any project in 30 seconds and start autonomous development.

## One-Command Installation

```bash
# From SpecWeave repository:
./install.sh /path/to/your/project

# Example:
./install.sh /Users/antonabyzov/Projects/TestLab/specweave-event-mgmt
```

## What You Get

✅ **SpecWeave Skills** - Autonomous development agents (8 complete skills, more coming)
✅ **Slash Commands** - `/create-project` (more coming)
✅ **Automation Hooks** - Auto-update docs, validate quality (4 hooks)
✅ **Complete Framework** - Minimal installation, skills create structure as needed
✅ **Development Guide** - `CLAUDE.md` with everything you need

## Ultra-Simple Usage

```bash
# 1. Install SpecWeave (30 seconds)
./install.sh ~/my-project

# 2. Navigate to project
cd ~/my-project

# 3. Open in Claude Code
code .

# 4. Give high-level request (in Claude Code):
```

**In Claude Code:**
```
Create a SaaS for event management with calendar booking.

Tech stack: Next.js 14 + PostgreSQL
Features: Calendar, event management, payments, admin dashboard

MUST:
- Work autonomously using SpecWeave skills
- Generate proper Playwright E2E tests
- Create complete working application
```

**5. Wait 10-30 minutes while skills work autonomously**

**6. Done! You have a complete SaaS ready to deploy 🚀**

## What Happens Autonomously

```
Your Request
    ↓
specweave-detector (activates automatically)
    ↓
skill-router (routes to right skills, >90% accuracy)
    ↓
spec-author → Creates specifications (WHAT/WHY)
    ↓
architect → Designs architecture (HOW)
    ↓
increment-planner → Creates implementation plan
    ↓
nextjs-agent → Implements code
    ↓
playwright-tester → Creates E2E tests (MANDATORY for UI)
    ↓
qa-engineer → Validates quality
    ↓
docs-updater → Auto-updates documentation
    ↓
✅ Complete SaaS application ready!
```

## What Gets Installed (Minimal & Clean)

```
your-project/
├── .claude/                  ← Claude Code integration
│   ├── skills/               ← SpecWeave skills (8 complete, more coming)
│   ├── commands/             ← Slash commands (1 complete, more coming)
│   └── hooks/                ← Automation hooks (4 hooks)
├── .specweave/               ← SpecWeave framework (ALL work lives here)
│   ├── config.yaml           ← Configuration
│   ├── increments/           ← Development increments
│   └── docs/                 ← Living documentation (auto-updated)
└── CLAUDE.md                 ← Complete development guide

Your application code (created by skills):
├── app/                      ← Next.js app (or your framework)
├── components/               ← React components
├── lib/                      ← Utilities
├── prisma/                   ← Database schema
└── ... (framework-specific folders)
```

**Philosophy:** Ultra-minimal installation. ALL SpecWeave work happens in `.specweave/`.

## Example: Event Management SaaS

See: [Event Management SaaS Setup Example](ai-execution-files/examples/event-mgmt-saas-setup.md)

**Note:** `ai-execution-files/` in the SpecWeave repo contains internal examples. This folder is NOT copied during installation.

**Time Comparison:**
- Traditional: 6-8 weeks
- SpecWeave: 2-3 hours
- **50-100x faster!**

## Key Features

### 1. Autonomous Development
Skills work together without manual intervention:
- `specweave-detector` - Proactive activation
- `skill-router` - >90% routing accuracy
- `spec-author` - Creates specifications
- `architect` - Designs architecture
- `developer` - Implements code
- `playwright-tester` - E2E tests (MANDATORY for UI)
- `qa-engineer` - Quality validation
- `docs-updater` - Auto-updates docs

### 2. Context Precision (70%+ Token Reduction)
- Load only relevant specs via `context-manifest.yaml`
- Section anchor support: `spec.md#authentication-flow`
- Glob patterns: `specifications/modules/payments/**/*.md`
- Scalable to 500+ page specs

### 3. E2E Testing (MANDATORY for UI)
- Playwright tests auto-generated
- Truth-telling requirement (no false positives)
- Complete flow validation
- Close-loop verification

### 4. Living Documentation
- Auto-updated via hooks (post-task-completion)
- CLAUDE.md always current
- API reference synced
- Changelog automated

### 5. Brownfield Support
- Analyze existing codebases
- Generate retroactive specs
- Create baseline tests
- Safe modification with regression prevention

## Available Slash Commands

```bash
/create-project <stack> <domain> <platform>  # Create complete SaaS project
/create-increment <number> <name>            # Create new increment
/review-docs                                 # Review documentation
/sync-github                                 # Sync with GitHub
```

## Configuration

Edit `.specweave/config.yaml`:

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

## Requirements

- **Claude Code** (Claude Sonnet 4.5 recommended)
- Node.js 18+ (for Next.js projects)
- Git (optional but recommended)

## Documentation

- **CLAUDE.md** - Complete development guide (installed with framework)
- **.specweave/docs/** - Living documentation (auto-updated by hooks)
- **ai-execution-files/** - SpecWeave internal only (NOT copied, NOT used in projects)

## Troubleshooting

### Skills not activating?
```bash
ls -la .claude/skills/
# Should see 8 SpecWeave skills (complete with SKILL.md):
# - specweave-detector, skill-router, context-loader
# - increment-planner, nextjs-agent, hetzner-provisioner
# - cost-optimizer, devops-agent
```

### Hooks not running?
```bash
chmod +x .claude/hooks/*.sh
```

### Commands not found?
```bash
ls -la .claude/commands/  # Should see slash commands
```

## Next Steps

1. ✅ Install SpecWeave to your project
2. ✅ Read `CLAUDE.md` in installed project
3. ✅ Give high-level request to Claude Code
4. ✅ Let skills work autonomously
5. ✅ Review and customize generated code
6. ✅ Deploy! 🚀

## Support

- GitHub: [anton-abyzov/specweave](https://github.com/anton-abyzov/specweave)
- Issues: [GitHub Issues](https://github.com/anton-abyzov/specweave/issues)
- Documentation: `.specweave/docs/` (after installation)

## License

MIT License - See [LICENSE](LICENSE)

---

**SpecWeave** - Spec-Driven Development Framework
*Build software 50-100x faster with autonomous AI agents*

🚀 **Start now:** `./install.sh /path/to/project`
