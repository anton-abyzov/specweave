---
name: plugin-detector
description: Detects when SpecWeave plugins are needed based on tech stack mentions. Activates for frontend (Next.js, React, Vue), backend (.NET, Node.js, Python), infrastructure (Docker, K8s), external tools (GitHub, JIRA), payments (Stripe), ML (TensorFlow), testing (Playwright), and design (Figma).
---

# SpecWeave Plugin Detector

## What I Do

I detect when you need a SpecWeave plugin that isn't installed yet, and guide you through enabling it with clear, copy-pasteable commands.

## When I Activate

When you mention capabilities that require specific SpecWeave plugins:

### External Integrations
- **GitHub**: "sync to GitHub", "create issue", "GitHub integration", "export to GitHub" → needs `specweave-github`
- **Jira**: "sync to Jira", "create Jira ticket", "Jira integration" → needs `specweave-jira`
- **Azure DevOps**: "sync to ADO", "Azure DevOps", "work items" → needs `specweave-ado`

### Tech Stacks
- **Kubernetes**: "deploy to K8s", "Helm chart", "kubectl", "K8s manifests" → needs `specweave-kubernetes`
- **Frontend**: "React component", "Next.js", "Vue", "design system" → needs `specweave-frontend`
- **Backend**: "Express API", "FastAPI", "NestJS", ".NET backend" → needs `specweave-backend`

### Domain Expertise
- **ML/AI**: "train model", "MLflow", "TensorFlow", "PyTorch", "ML pipeline" → needs `specweave-ml`
- **Payments**: "Stripe", "PayPal", "subscription billing", "PCI compliance" → needs `specweave-payments`
- **Testing**: "Playwright tests", "E2E testing", "visual regression" → needs `specweave-testing`
- **Figma**: "Figma design", "design tokens", "import from Figma" → needs `specweave-figma`
- **Infrastructure**: "Hetzner", "Prometheus", "Grafana", "monitoring" → needs `specweave-infrastructure`
- **Diagrams**: "C4 diagram", "architecture diagram", "Mermaid", "sequence diagram" → needs `specweave-diagrams`

## How I Help

### Mode 1: Passive Tech Stack Detection (NEW!)

When users mention tech stacks in ANY question (not just increments), I automatically:

1. **Scan project structure** using `src/utils/plugin-detection.ts`:
   - Check package.json dependencies
   - Detect .NET (*.csproj), Python (requirements.txt), etc.
   - Find Docker, Kubernetes, infrastructure files
   - Identify framework-specific patterns

2. **Detect missing plugins**:
   - Compare detected tech stack vs installed plugins
   - Group by confidence (high/medium/low)

3. **Suggest proactively** (non-blocking):
   ```
   🔌 Plugin Recommendations

   Based on your tech stack (Next.js + .NET + Docker), these plugins would help:

   Recommended (high confidence):
   • specweave-frontend - Next.js, React support
   • specweave-backend - .NET 8 API patterns
   • specweave-infrastructure - Docker, PostgreSQL

   Install: /plugin install specweave-frontend@specweave
   (or continue without - you can add later)
   ```

4. **Continue with user's request**: Don't block workflow!

### Mode 2: Explicit Feature Requests (Original)

When users explicitly request plugin features:

1. **Detect missing plugin**: Check if the required plugin is installed
2. **Provide installation command**: Give exact `/plugin install` command
3. **Explain benefits**: List what the plugin provides (skills, agents, commands)
4. **Continue once enabled**: Resume your task with plugin features available

## Plugin Detection Logic

### Automatic Scanning (NEW!)

Use the plugin detection utility to scan project structure:

**Step 1: Scan project** (TypeScript example, adapt to Claude's capabilities):
```typescript
import { scanProjectStructure, detectPlugins } from '../../../../../src/utils/plugin-detection';

// Scan current directory
const cwd = process.cwd();
const signals = await scanProjectStructure(cwd);
const detected = detectPlugins(signals);

// Group by confidence
const highConfidence = detected.filter(p => p.confidence === 'high');
const mediumConfidence = detected.filter(p => p.confidence === 'medium');
```

**Step 2: Check installed plugins**:
```bash
# Use Claude's plugin list
/plugin list --installed
```

**Step 3: Find missing plugins**:
- Compare detected plugins vs installed
- Only suggest high/medium confidence
- Skip if already installed

**Step 4: Format suggestions**:
```typescript
import { formatDetectedPlugins, generateInstallCommands } from '../../../../../src/utils/plugin-detection';

const output = formatDetectedPlugins(detected);
const commands = generateInstallCommands(detected);
```

### Manual Detection (Original)

I check for plugin installation by:
- Looking for plugin-specific commands (e.g., `/specweave-github:sync`)
- Checking if plugin files exist in `.claude/` directory
- Detecting absence of expected skills/agents

**If a plugin is missing**, I provide:
```
📦 Plugin Required: specweave-{name}

To enable this plugin:
1. Run: /plugin install specweave-{name}@specweave
2. Restart this conversation (or continue - plugin will load)

This plugin provides:
✅ {List of key features}
✅ {Specialized agents}
✅ {Slash commands}

Would you like me to guide you through the installation?
```

## Example Flows

### Example 0: Passive Tech Stack Detection (NEW!)

**User**: "Design a spec-driven blueprint for a simple task-tracking web app. Tech stack: Next.js + .NET 8 (Web API) + PostgreSQL + Prisma ORM."

**Me (plugin-detector activates automatically)**:
```
🔍 Scanning your project for tech stack...

📦 Plugin Recommendations

Based on your tech stack (Next.js + .NET 8 + PostgreSQL + Docker), these plugins would help:

   Recommended (high confidence):
   • specweave-frontend - Next.js + React patterns, component architecture
     Signals: Next.js mentioned
     Install: /plugin install specweave-frontend@specweave

   • specweave-backend - .NET 8 Web API patterns, Entity Framework, REST APIs
     Signals: .NET 8 Web API mentioned
     Install: /plugin install specweave-backend@specweave

   • specweave-infrastructure - Docker Compose, PostgreSQL schema, container orchestration
     Signals: PostgreSQL, Docker mentioned (if docker-compose.yml exists)
     Install: /plugin install specweave-infrastructure@specweave

💡 Quick install all:
   /plugin install specweave-frontend@specweave
   /plugin install specweave-backend@specweave
   /plugin install specweave-infrastructure@specweave

📖 Or I can continue with the core plugin only (you can add plugins later)

Would you like to:
1️⃣  Install these plugins now (recommended for better architecture patterns)
2️⃣  Continue without plugins (I'll do my best with core plugin only)
```

*User installs plugins, then I continue with their task using plugin-specific knowledge*

### Example 1: GitHub Integration

**User**: "Let's sync this increment to GitHub Issues"

**Me**:
```
📦 Plugin Required: specweave-github

I notice you want GitHub integration, but the `specweave-github` plugin isn't installed yet.

To enable GitHub sync features:

1. Run this command:
   /plugin install specweave-github@specweave

2. Once installed, you'll have access to:
   ✅ Bidirectional increment ↔ GitHub Issue sync
   ✅ Task-level progress tracking via issue comments
   ✅ Automatic issue creation from specs
   ✅ GitHub CLI integration (via `gh` command)
   ✅ Commands: /specweave:github:sync, /specweave:github:create-issue, /specweave:github:status

Would you like me to guide you through the installation, or would you prefer to continue without GitHub sync?
```

### Example 2: Kubernetes Deployment

**User**: "Deploy this to Kubernetes with Helm"

**Me**:
```
📦 Plugin Required: specweave-kubernetes

For Kubernetes deployment features, you'll need the `specweave-kubernetes` plugin.

To enable:

1. Run: /plugin install specweave-kubernetes@specweave

2. This plugin provides:
   ✅ K8s manifest generation (deployments, services, configmaps)
   ✅ Helm chart scaffolding and templates
   ✅ GitOps workflow with ArgoCD/Flux
   ✅ Security policies and RBAC patterns
   ✅ Skills: k8s-manifest-generator, helm-chart-scaffolding, gitops-workflow

Alternatively, I can help you create basic K8s manifests manually without the plugin. Which would you prefer?
```

### Example 3: Already Installed

**User**: "Create a C4 diagram for this architecture"

**Me**:
```
✅ Plugin Available: specweave-diagrams

Great! The diagrams plugin is installed. I can create C4 diagrams for you.

I'll use the diagrams-architect agent to:
1. Analyze your architecture from specs
2. Generate Mermaid C4 diagram code
3. Export to both .mmd and .svg formats
4. Place in .specweave/docs/internal/architecture/diagrams/

Let me start by examining your architecture specifications...
```

## Available SpecWeave Plugins

### Core (Always Available)
- `specweave` - Framework essentials (increment lifecycle, PM/Architect/Tech Lead agents)

### Integrations
- `specweave-github` - GitHub Issues sync
- `specweave-jira` - Jira integration
- `specweave-ado` - Azure DevOps integration

### Tech Stacks
- `specweave-frontend` - React, Next.js, Vue, design systems
- `specweave-backend` - Node.js, Python, .NET APIs
- `specweave-kubernetes` - K8s deployment, Helm, GitOps
- `specweave-infrastructure` - Cloud infra, monitoring, Hetzner

### Domain Expertise
- `specweave-ml` - ML pipelines, training, deployment
- `specweave-payments` - Stripe, PayPal, PCI compliance
- `specweave-testing` - Playwright E2E, visual regression
- `specweave-figma` - Design system integration
- `specweave-diagrams` - C4, Mermaid, architecture diagrams
- `specweave-docs` - Docusaurus generation

### Utilities
- `specweave-tooling` - Skill creation, routing
- `specweave-cost-optimizer` - Cloud cost comparison
- `specweave-alternatives` - Framework comparison

## Installation Commands Reference

**Quick Install (Most Common)**:
```bash
# GitHub integration
/plugin install specweave-github@specweave

# Frontend development
/plugin install specweave-frontend@specweave

# Backend APIs
/plugin install specweave-backend@specweave

# Kubernetes deployment
/plugin install specweave-kubernetes@specweave

# ML/AI workflows
/plugin install specweave-ml@specweave

# Architecture diagrams
/plugin install specweave-diagrams@specweave
```

**View All Available**:
```bash
/plugin marketplace list specweave
```

## Best Practices

1. **Be Proactive**: Detect missing plugins early in the conversation
2. **Offer Alternatives**: If a plugin isn't installed, suggest manual approaches
3. **Don't Block**: Never refuse to help—offer to continue without the plugin
4. **Clear Instructions**: Always provide exact copy-pasteable commands
5. **Explain Benefits**: Help users understand why the plugin is valuable

## Integration with Other Skills

This skill works alongside:
- **project-kickstarter**: Suggests plugins during new project setup
- **increment-planner**: Recommends plugins based on increment requirements
- **specweave-detector**: Coordinates with workflow detection

## Notes

- This skill is **non-blocking** - I always offer to continue without plugins
- Plugins are **opt-in** - users choose what to install
- Installation is **instant** - plugins activate immediately
- All plugins follow **Claude Code's native plugin architecture**
