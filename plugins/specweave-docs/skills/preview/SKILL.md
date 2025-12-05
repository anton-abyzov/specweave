---
name: preview
description: Documentation preview expert for Docusaurus integration. Launches interactive preview server for SpecWeave living documentation with hot reload, auto-generated sidebar, and Mermaid diagrams. Works in ANY SpecWeave project with auto-setup. Activates for preview docs, view documentation, Docusaurus server, docs UI, documentation website, local docs server, hot reload docs, static site build.
---

# Documentation Preview Skill

Expert in launching and managing Docusaurus documentation preview for SpecWeave projects.

## What I Do

I help you preview your SpecWeave living documentation with Docusaurus:

### Key Features
- **Zero-config setup** - Works in any SpecWeave project automatically
- **Cached installation** - Docusaurus cached in `.specweave/cache/docs-site/` (gitignored)
- **Hot reload** - Edit markdown, see changes instantly
- **Mermaid diagrams** - Architecture diagrams render beautifully
- **Auto sidebar** - Generated from folder structure
- **Bypasses private registries** - Uses public npm to avoid Azure DevOps/corporate issues

## How It Works

1. **First run (~30 seconds)**:
   - Creates Docusaurus in `.specweave/cache/docs-site/`
   - Installs dependencies from public npm registry
   - Configures to read from `.specweave/docs/internal/`

2. **Subsequent runs (instant)**:
   - Uses cached installation
   - Starts server immediately

## Available Commands

### Preview Documentation
```bash
/specweave-docs:preview
```

**What it does:**
1. Checks if `.specweave/docs/internal/` exists
2. Sets up Docusaurus in cache (if first run)
3. Starts dev server on **http://localhost:3015**
4. Enables hot reload

### Build Static Site
```bash
/specweave-docs:build
```

**What it does:**
1. Builds production-ready static site
2. Outputs to `.specweave/cache/docs-site/build/`
3. Ready for deployment to any static host

## When to Use This Skill

### Activate for:
- "Preview my documentation"
- "Show me my docs in a browser"
- "Launch Docusaurus"
- "View my living documentation"
- "Start docs preview"
- "I want to see my internal docs"

### Workflow

```
User: "I want to preview my docs"
You: "I'll launch the documentation preview server."
     [Run: /specweave-docs:preview]
```

## Troubleshooting

### Port 3015 already in use
```bash
lsof -i :3015 && kill -9 $(lsof -t -i :3015)
```

### Reinstall from scratch
```bash
rm -rf .specweave/cache/docs-site
# Then run /specweave-docs:preview again
```

### npm registry issues
The setup explicitly uses `--registry=https://registry.npmjs.org` to bypass private/corporate registry configurations.

## See Also

- `/specweave-docs:build` - Build static site for deployment
- `/specweave-docs:organize` - Organize large folders with themed indexes
- `/specweave-docs:health` - Documentation health report
