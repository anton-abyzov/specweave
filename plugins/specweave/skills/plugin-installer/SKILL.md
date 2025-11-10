---
name: plugin-installer
description: DEPRECATED - This skill is no longer needed. All plugins are now installed automatically during specweave init. This skill remains for backward compatibility but should NOT activate.
---

# Plugin Installer - DEPRECATED

**Status**: ⚠️ **DEPRECATED** - Do not use this skill

**Reason**: As of v0.11.0+, ALL SpecWeave plugins (19+) are automatically installed during `specweave init`. There is no need for just-in-time plugin installation anymore.

**What Changed**:
- ❌ Old: Selective plugin loading with just-in-time installation
- ✅ New: All plugins installed upfront during init

**If you see this skill activating**, it means you're using an old SpecWeave installation. Run `specweave init` again to get all plugins installed automatically.

---

## For Contributors: Why This Was Deprecated

**The Problem with Just-in-Time Installation**:
- Added complexity to the workflow
- Users had to wait for installations mid-work
- Network issues could block work unexpectedly
- Detection logic was fragile (keyword matching)

**The Solution - Install Everything Upfront**:
- All 19+ plugins installed during `specweave init`
- Takes ~30 seconds upfront but saves time later
- All capabilities available immediately
- No network dependencies during work
- Simpler, more predictable user experience

---

## Plugin Detection Keywords Map

**Use this map to detect which plugin is needed based on user's request keywords:**

| User Keywords | Required Plugin | Installation Command |
|--------------|----------------|---------------------|
| **Frontend Development** |
| "React", "Next.js", "Vue", "Angular", "frontend", "UI component", "design system", "Tailwind" | `specweave-frontend` | `/plugin install specweave-frontend` |
| **Kubernetes/DevOps** |
| "K8s", "Kubernetes", "Helm", "kubectl", "deploy", "container", "pod", "service", "ingress" | `specweave-kubernetes` | `/plugin install specweave-kubernetes` |
| **Machine Learning** |
| "TensorFlow", "PyTorch", "ML model", "training", "machine learning", "neural network", "dataset" | `specweave-ml` | `/plugin install specweave-ml` |
| **Payments** |
| "Stripe", "PayPal", "billing", "subscription", "payment", "checkout", "PCI compliance" | `specweave-payments` | `/plugin install specweave-payments` |
| **Testing** |
| "Playwright", "E2E testing", "browser automation", "visual regression", "test automation" | `specweave-testing` | `/plugin install specweave-testing` |
| **Figma/Design** |
| "Figma", "design tokens", "design system", "prototype", "wireframe", "mockup" | `specweave-figma` | `/plugin install specweave-figma` |
| **Backend Development** |
| "Node.js backend", "Python backend", ".NET", "Express", "FastAPI", "Django", "REST API" | `specweave-backend` | `/plugin install specweave-backend` |
| **Infrastructure** |
| "Hetzner", "cloud infrastructure", "Prometheus", "Grafana", "monitoring", "alerting", "SLO" | `specweave-infrastructure` | `/plugin install specweave-infrastructure` |
| **Architecture Diagrams** |
| "Mermaid diagram", "C4 model", "architecture diagram", "sequence diagram", "ER diagram" | `specweave-diagrams` | `/plugin install specweave-diagrams` |
| **Issue Trackers** (Usually auto-installed during init) |
| "GitHub Issues", "sync GitHub", "create issue", "PR automation" | `specweave-github` | `/plugin install specweave-github` |
| "Jira", "epic", "sprint", "story points", "Jira sync" | `specweave-jira` | `/plugin install specweave-jira` |
| "ADO", "Azure DevOps", "work items", "boards", "ADO sync" | `specweave-ado` | `/plugin install specweave-ado` |

---

## Workflow: Just-in-Time Plugin Installation

**CRITICAL**: Follow this workflow EVERY TIME you detect plugin keywords in user's request:

### Step 1: Detect Plugin Requirement

When user mentions keywords from the map above, **IMMEDIATELY** check if the required plugin is needed.

**Example**:
```
User: "Can you help me build a React component?"

Keywords detected: "React", "component"
→ Required plugin: specweave-frontend
```

### Step 2: Check if Plugin is Installed

```bash
# Check installed plugins
/plugin list --installed
```

**Parse the output** to see if the required plugin is in the list.

### Step 3: Auto-Install if Missing

If the plugin is NOT installed:

```bash
# Install the plugin
/plugin install <plugin-name>

# Example:
/plugin install specweave-frontend
```

### Step 4: Notify User (Clear and Friendly)

**Good notification format**:

```
🔌 Detected need for <plugin-name> plugin

📦 Installing <plugin-name>...
   This plugin provides: <brief description>

✅ Plugin installed successfully!
   You can now: <list capabilities>

Proceeding with your request...
```

**Example**:

```
🔌 Detected need for specweave-frontend plugin

📦 Installing specweave-frontend...
   This plugin provides: Beautiful Docusaurus UI for browsing .specweave/docs/

✅ Plugin installed successfully!
   You can now:
   • Browse documentation in beautiful UI
   • Hot reload when editing markdown files
   • Render Mermaid diagrams automatically

Proceeding to launch docs preview server...
```

### Step 5: Proceed with User's Request

**ONLY AFTER** the plugin is installed, proceed to use its features.

---

## Common Scenarios

### Scenario 1: React Component Development

**User Request**: "Build a React component with TypeScript"

**Workflow**:
```
1. Detect keywords: "React", "component", "TypeScript"
   → Required: specweave-frontend

2. Check installed: /plugin list --installed
   → Not found

3. Install: /plugin install specweave-frontend

4. Notify user:
   🔌 Installing specweave-frontend for React development...
   ✅ Installed!

5. Create component using frontend skills
```

### Scenario 2: Kubernetes Deployment

**User Request**: "Help me deploy this to Kubernetes"

**Workflow**:
```
1. Detect keywords: "deploy", "Kubernetes"
   → Required: specweave-kubernetes

2. Check installed: /plugin list --installed
   → Not found

3. Install: /plugin install specweave-kubernetes

4. Notify user:
   🔌 Installing specweave-kubernetes for K8s deployment...
   ✅ Installed! You can now generate manifests, Helm charts, and validate deployments.

5. Proceed with K8s expert agent for deployment
```

### Scenario 3: React Component Development

**User Request**: "Create a new React component for user profile"

**Workflow**:
```
1. Detect keywords: "React", "component"
   → Required: specweave-frontend

2. Check installed: /plugin list --installed
   → Not found

3. Install: /plugin install specweave-frontend

4. Notify user:
   🔌 Installing specweave-frontend for React development...
   ✅ Installed! You can now use frontend expert agent and design system integration.

5. Proceed with component creation
```

### Scenario 4: Machine Learning Pipeline

**User Request**: "Train a TensorFlow model for image classification"

**Workflow**:
```
1. Detect keywords: "TensorFlow", "model", "training"
   → Required: specweave-ml

2. Check installed: /plugin list --installed
   → Not found

3. Install: /plugin install specweave-ml

4. Notify user:
   🔌 Installing specweave-ml for ML workflows...
   ✅ Installed! You can now use ML expert agent for training pipelines and deployment.

5. Proceed with ML pipeline setup
```

---

## Error Handling

### Plugin Installation Fails

If `/plugin install` fails:

```
❌ Failed to install <plugin-name>

Possible causes:
1. Marketplace not registered
   → Try: /plugin marketplace add anton-abyzov/specweave

2. Network connectivity issues
   → Check internet connection and retry

3. Plugin doesn't exist
   → Verify plugin name: /plugin list (shows all available plugins)

Would you like to:
a) Retry installation
b) Proceed without the plugin (limited capabilities)
c) Troubleshoot further
```

### Plugin Already Installed

If plugin is already installed, skip installation and proceed:

```
✅ <plugin-name> is already installed
   Proceeding with your request...
```

---

## Integration with Other Skills

**This skill should be consulted BEFORE other skills attempt to use plugin features.**

### Example: increment-planner skill

When increment-planner detects plugin requirements (Step 6), it should:

1. **Detect plugins** (as it already does)
2. **Consult plugin-installer skill** (NEW!)
3. **Auto-install missing plugins** (via this skill)
4. **Then proceed** with increment planning

### Example: frontend skill (hypothetical)

```markdown
# BEFORE using React features:

1. Check if specweave-frontend is installed
   → If not: Invoke plugin-installer skill
   → Auto-install specweave-frontend

2. Then proceed with component creation
```

---

## Benefits of This Approach

✅ **Zero friction**: Users don't need to manually install plugins
✅ **Proactive**: Detects requirements automatically
✅ **Clear UX**: Users see what's being installed and why
✅ **Just-in-time**: Only installs plugins when actually needed
✅ **Fail-safe**: Handles installation errors gracefully

---

## Testing This Skill

**Test Case 1: Docs Preview**
```
User: "Show me the internal documentation in a browser"

Expected:
1. Detects "React", "component" → specweave-frontend
2. Checks installed
3. Auto-installs if missing
4. Launches preview
```

**Test Case 2: K8s Deployment**
```
User: "Deploy this application to Kubernetes cluster"

Expected:
1. Detects "Kubernetes" → specweave-kubernetes
2. Checks installed
3. Auto-installs if missing
4. Proceeds with deployment
```

**Test Case 3: React Development**
```
User: "Add a React component for user settings"

Expected:
1. Detects "React", "component" → specweave-frontend
2. Checks installed
3. Auto-installs if missing
4. Proceeds with component creation
```

---

## References

- **Plugin Expert Skill**: Consult for correct installation syntax
- **Official Docs**: https://code.claude.com/docs/en/plugins
- **SpecWeave Marketplace**: .claude-plugin/marketplace.json
- **CLAUDE.md**: Plugin architecture and detection phases

---

**Key Principle**: ALWAYS install plugins BEFORE attempting to use their features. Never fail silently - always notify users of installation steps.

**Last Updated**: 2025-11-10 (v0.10.0)
