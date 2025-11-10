---
name: docs-preview
description: Documentation preview expert for Docusaurus integration. Launches interactive preview server for SpecWeave living documentation with hot reload, auto-generated sidebar, and Mermaid diagrams. Activates for preview docs, view documentation, Docusaurus server, docs UI, documentation website, local docs server, hot reload docs, static site build.
---

# Documentation Preview Skill

Expert in launching and managing Docusaurus documentation preview for SpecWeave projects.

## What I Do

I help you preview and build your SpecWeave living documentation with Docusaurus:

### 1. Interactive Preview
- Launch local development server (default port: 3015)
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
/specweave-docs-preview:preview
```

**What it does:**
1. Checks if Docusaurus is installed (installs if needed)
2. Generates sidebar from `.specweave/docs/internal/` structure
3. Starts development server on port 3015 (configurable)
4. Opens browser automatically
5. Enables hot reload

**Configuration** (`.specweave/config.json`):
```json
{
  "documentation": {
    "preview": {
      "enabled": true,
      "autoInstall": false,
      "port": 3015,
      "openBrowser": true,
      "theme": "default",
      "excludeFolders": ["legacy", "node_modules"]
    }
  }
}
```

**Example session:**
```
User: "Can I preview my documentation?"
You: "Yes! I'll launch the Docusaurus preview server for you."
     [Run: /specweave-docs-preview:preview]

Output:
📚 Setting up documentation preview...
✓ Node.js version check passed (v20.0.0)
✓ Docusaurus already installed
✓ Sidebar generated (42 documents, 8 categories)
✓ Server started on http://localhost:3015

🌐 Documentation available at: http://localhost:3015
🔄 Hot reload enabled - edit docs and see changes instantly
💡 Press Ctrl+C to stop the server
```

### Build Static Site
```bash
/specweave-docs-preview:build
```

**What it does:**
1. Checks if Docusaurus is installed
2. Runs production build
3. Outputs to `.specweave/docs-site-internal/build/`
4. Shows build stats and output path

**Example session:**
```
User: "Build my docs for deployment"
You: "I'll build the static documentation site."
     [Run: /specweave-docs-preview:build]

Output:
📦 Building static documentation site...
✓ Build complete!
📁 Output: /project/.specweave/docs-site-internal/build/

To deploy:
1. Copy build/ folder to your static host
2. Or use: npx serve build/
```

## When to Use This Skill

### Activate for questions like:
- "How do I preview my documentation?"
- "Show me my docs in a UI"
- "Launch Docusaurus server"
- "View my living documentation"
- "Start docs preview"
- "Build static docs site"
- "Hot reload documentation"
- "Documentation website"

### Common workflows:

**1. First-time preview:**
```
User: "I want to preview my docs"
You: "I'll set up the documentation preview with Docusaurus.
      This will install dependencies (takes ~30 seconds first time)."
     [Run: /specweave-docs-preview:preview]
```

**2. Already running:**
```
User: "Preview my docs"
You: "Checking if Docusaurus is running..."
     [If running: "Documentation server already running at http://localhost:3015"]
     [If not: Run /specweave-docs-preview:preview]
```

**3. Build for deployment:**
```
User: "I need to deploy my docs"
You: "I'll build the static site for deployment."
     [Run: /specweave-docs-preview:build]
     "Once built, you can deploy the build/ folder to:"
     "• Netlify, Vercel, GitHub Pages"
     "• Any static host (Nginx, Apache, S3)"
     "• Or test locally with: npx serve build/"
```

## Architecture

### Folder Structure
```
.specweave/
├── docs/
│   └── internal/           ← Source documentation
│       ├── strategy/
│       ├── specs/
│       ├── architecture/
│       └── ...
└── docs-site-internal/     ← Docusaurus installation
    ├── docs/               ← Symlinked to internal/
    ├── src/
    ├── build/              ← Static output
    ├── docusaurus.config.js
    ├── sidebars.js         ← Auto-generated
    └── package.json
```

### Sidebar Auto-Generation

The sidebar is generated from your folder structure:

**Input** (`.specweave/docs/internal/`):
```
internal/
├── strategy/
│   ├── prd-001.md
│   └── okrs.md
├── specs/
│   ├── spec-001-auth.md
│   └── spec-002-payments.md
└── architecture/
    ├── hld-system.md
    └── adr/
        └── 0001-database-choice.md
```

**Output** (`sidebars.js`):
```javascript
{
  docs: [
    {
      type: 'category',
      label: 'Strategy',
      items: ['strategy/prd-001', 'strategy/okrs']
    },
    {
      type: 'category',
      label: 'Specs',
      items: ['specs/spec-001-auth', 'specs/spec-002-payments']
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/hld-system',
        {
          type: 'category',
          label: 'ADR',
          items: ['architecture/adr/0001-database-choice']
        }
      ]
    }
  ]
}
```

## Configuration Options

### Port Selection
```json
{
  "documentation": {
    "preview": {
      "port": 3015
    }
  }
}
```

**Why 3015?**
- Port 3000 = React/Next.js/Vite dev servers (conflict!)
- Port 3015 = Internal docs (SpecWeave default)
- Port 3016 = Reserved for public docs (future)

### Theme Selection
```json
{
  "documentation": {
    "preview": {
      "theme": "default"
    }
  }
}
```

**Available themes:**
- `default` - SpecWeave blue theme
- `classic` - Docusaurus default theme
- `dark` - Dark mode theme

### Exclude Folders
```json
{
  "documentation": {
    "preview": {
      "excludeFolders": ["legacy", "node_modules", "archive"]
    }
  }
}
```

## Troubleshooting

### Port already in use
```
Error: Port 3015 is already in use
Solution: Change port in config or stop other service
```

### Node.js version
```
Error: Node.js 18+ required
Solution: Update Node.js (nvm install 20)
```

### Mermaid diagrams not rendering
```
Issue: Diagrams show as code blocks
Solution: Use ```mermaid code fences (built-in support)
```

### Build fails
```
Error: Build failed
Check:
1. All markdown files have valid frontmatter
2. No broken internal links
3. Run preview first to catch errors early
```

## Best Practices

### 1. Use Preview During Development
- Start preview server: `/specweave-docs-preview:preview`
- Edit markdown files in `.specweave/docs/internal/`
- See changes instantly (hot reload)
- No need to rebuild

### 2. Build Before Deployment
- Always build before deploying
- Test build output locally: `npx serve build/`
- Check all pages render correctly
- Verify search works

### 3. Keep Docs Organized
- Follow SpecWeave folder structure
- Use meaningful file names
- Add frontmatter to markdown files:
  ```markdown
  ---
  title: User Authentication
  sidebar_position: 1
  ---
  ```

### 4. Optimize for Search
- Use descriptive headings
- Include keywords naturally
- Add alt text to images
- Keep URL structure clean

## Example: Complete Workflow

```bash
# 1. Preview docs locally
/specweave-docs-preview:preview
# → Opens http://localhost:3015
# → Edit files, see changes instantly

# 2. Build for production
/specweave-docs-preview:build
# → Outputs to .specweave/docs-site-internal/build/

# 3. Deploy (example with Netlify)
cd .specweave/docs-site-internal
npx netlify deploy --dir=build --prod
```

## Integration with SpecWeave

### Living Documentation Sync
Documentation preview integrates with SpecWeave's living docs:

1. **After increment completion:**
   - `spec.md` synced to `.specweave/docs/internal/specs/`
   - Preview updates automatically (hot reload)

2. **Architecture decisions:**
   - ADRs created in `.specweave/docs/internal/architecture/adr/`
   - Instantly visible in preview

3. **Multi-project support:**
   - Each project gets its own docs folder
   - Preview shows all projects in sidebar

## Commands Summary

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/specweave-docs-preview:preview` | Launch dev server | During development, hot reload |
| `/specweave-docs-preview:build` | Build static site | Before deployment, production |

## Technical Details

### Under the Hood
- **Framework:** Docusaurus 3.0
- **React version:** 18+
- **Build tool:** Webpack 5
- **Markdown:** MDX support
- **Diagrams:** Mermaid.js
- **Search:** Algolia DocSearch (optional)

### Performance
- **Install time:** ~30 seconds (first time only)
- **Build time:** ~5-10 seconds (small docs)
- **Hot reload:** <1 second
- **Static site:** Fully optimized, lighthouse 100

## See Also

- **specweave-docs** skill - General documentation workflows
- **spec-generator** skill - Generate living docs specs
- **sync-docs** skill - Sync docs after increments
- **Docusaurus docs:** https://docusaurus.io
