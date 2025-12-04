---
name: preview
description: Documentation preview expert for Docusaurus integration. Launches interactive preview server for SpecWeave living documentation with hot reload, auto-generated sidebar, and Mermaid diagrams. Activates for preview docs, view documentation, Docusaurus server, docs UI, documentation website, local docs server, hot reload docs, static site build.
---

# Documentation Preview Skill

Expert in launching and managing Docusaurus documentation preview for SpecWeave projects.

## What I Do

I help you preview and build your SpecWeave living documentation with Docusaurus:

### 1. Interactive Preview
- Launch local development server (default port: 3016)
- Auto-generate sidebar from folder structure
- Hot reload - edit markdown, see changes instantly
- Mermaid diagram rendering
- Mobile-responsive UI
- Search functionality

### 2. Static Site Building
- Build production-ready static site
- Output to `.specweave/docs-site-internal/build/`
- Ready for deployment to any static host
- Optimized for performance

### 3. Smart Setup
- Lazy installation (only installs when first used)
- Checks Node.js version (18+ required)
- Installs Docusaurus dependencies automatically
- Configures from `.specweave/config.json` settings

## Available Commands

### Preview Documentation
```bash
/specweave-docs:preview
```

**What it does:**
1. Checks if Docusaurus is installed (installs if needed)
2. Generates sidebar from `.specweave/docs/internal/` structure
3. Starts development server on port 3016 (configurable)
4. Opens browser automatically
5. Enables hot reload

### Build Static Site
```bash
/specweave-docs:build
```

**What it does:**
1. Checks if Docusaurus is installed
2. Runs production build
3. Outputs to `.specweave/docs-site-internal/build/`
4. Shows build stats and output path

## When to Use This Skill

### Activate for questions like:
- "How do I preview my documentation?"
- "Show me my docs in a UI"
- "Launch Docusaurus server"
- "View my living documentation"
- "Start docs preview"
- "Build static docs site"

### Common workflows:

**1. First-time preview:**
```
User: "I want to preview my docs"
You: "I'll set up the documentation preview with Docusaurus."
     [Run: /specweave-docs:preview]
```

**2. Build for deployment:**
```
User: "I need to deploy my docs"
You: "I'll build the static site for deployment."
     [Run: /specweave-docs:build]
```

## Configuration

```json
{
  "documentation": {
    "preview": {
      "enabled": true,
      "autoInstall": true,
      "port": 3016,
      "openBrowser": true,
      "theme": "default"
    }
  }
}
```

## See Also

- `/specweave-docs:organize` - Organize large folders with themed indexes
- `/specweave-docs:health` - Documentation health report
- `/specweave-docs:generate` - Generate docs from code
