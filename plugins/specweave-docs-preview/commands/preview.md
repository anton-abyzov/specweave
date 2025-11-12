---
name: specweave-docs-preview:preview
description: Launch interactive documentation preview server with Docusaurus. Auto-generates sidebar, enables hot reload, and opens browser automatically.
---

# Documentation Preview Command

Launch an interactive Docusaurus development server to preview your SpecWeave living documentation.

## 🎨 Beautiful Docusaurus Experience

**This command ALWAYS uses Docusaurus** - not basic file serving! You get:
- ✅ Auto-generated navigation from folder structure
- ✅ Search functionality (instant local search)
- ✅ Beautiful theming (light/dark mode)
- ✅ Mermaid diagram rendering
- ✅ Hot reload (edit markdown, see changes instantly)
- ✅ Professional typography and layout
- ✅ Mobile responsive design

**Never settle for basic markdown rendering when you can have this!**

## Your Task

Execute the following workflow to launch the documentation preview server:

### Step 1: Load the Preview Utilities

```typescript
import { launchPreview, isSetupNeeded, getDocsSitePath } from '../../../src/utils/docs-preview/index.js';
```

**Note:** These utilities are already implemented in the SpecWeave codebase.

### Step 2: Check Configuration

Read the project configuration from `.specweave/config.json`:

```typescript
import * as fs from 'fs-extra';
import * as path from 'path';

const projectRoot = process.cwd();
const configPath = path.join(projectRoot, '.specweave', 'config.json');

let config: any = {};
if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

const docsConfig = config.documentation?.preview || {
  enabled: true,
  autoInstall: true,
  port: 3016,
  openBrowser: true,
  theme: 'default',
  excludeFolders: ['legacy', 'node_modules']
};
```

### Step 3: Check if Documentation Preview is Enabled (Auto-Enable if Needed)

```typescript
if (!docsConfig.enabled) {
  console.log('📚 Documentation preview is currently disabled.');
  console.log('   Enabling it now for beautiful Docusaurus experience...\n');

  // Auto-enable the feature
  config.documentation = config.documentation || {};
  config.documentation.preview = {
    ...docsConfig,
    enabled: true,
    autoInstall: true
  };

  // Save updated config
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

  console.log('✅ Documentation preview enabled!\n');
}
```

### Step 4: Display Setup Information

```typescript
console.log('\n📚 Launching Documentation Preview...\n');

const setupNeeded = await isSetupNeeded(projectRoot);

if (setupNeeded) {
  console.log('ℹ️  First-time setup required');
  console.log('   • Installing Docusaurus (~30 seconds)');
  console.log('   • Generating configuration');
  console.log('   • Creating sidebar from folder structure\n');
} else {
  console.log('✓ Docusaurus already installed');
  console.log('✓ Configuration up-to-date\n');
}
```

### Step 5: Launch the Preview Server

```typescript
try {
  const options = {
    port: docsConfig.port || 3016,
    openBrowser: docsConfig.openBrowser !== false,
    theme: docsConfig.theme || 'default',
    excludeFolders: docsConfig.excludeFolders || ['legacy', 'node_modules']
  };

  const server = await launchPreview(projectRoot, options);

  console.log('\n✅ Documentation server started successfully!\n');
  console.log(`🌐 URL: ${server.url}`);
  console.log('🔄 Hot reload enabled - edit markdown files to see changes instantly');
  console.log('🗂️  Sidebar auto-generated from folder structure');
  console.log('📊 Mermaid diagrams supported');
  console.log('\n💡 Press Ctrl+C to stop the server\n');

  // Keep the process running
  process.on('SIGINT', () => {
    console.log('\n\n👋 Stopping documentation server...');
    process.exit(0);
  });

} catch (error: any) {
  console.error('\n❌ Failed to launch documentation preview\n');
  console.error(`Error: ${error.message}\n`);

  if (error.message.includes('Node.js 18+')) {
    console.log('💡 Solution:');
    console.log('   • Update Node.js: nvm install 20 (or download from nodejs.org)');
    console.log('   • Current version: node --version\n');
  } else if (error.message.includes('port')) {
    console.log('💡 Solution:');
    console.log('   • Change port in .specweave/config.json');
    console.log('   • Or stop the service using port ' + (docsConfig.port || 3016));
    console.log('   • Check with: lsof -i :' + (docsConfig.port || 3016) + '\n');
  } else {
    console.log('💡 Troubleshooting:');
    console.log('   • Check Node.js version (18+ required): node --version');
    console.log('   • Clear npm cache: npm cache clean --force');
    console.log('   • Check .specweave/docs/internal/ exists');
    console.log('   • Run with DEBUG=* for detailed logs\n');
  }

  process.exit(1);
}
```

## Important Notes

### Configuration
The command uses settings from `.specweave/config.json`:

```json
{
  "documentation": {
    "preview": {
      "enabled": true,
      "autoInstall": true,
      "port": 3016,
      "openBrowser": true,
      "theme": "default",
      "excludeFolders": ["legacy", "node_modules"]
    }
  }
}
```

### First-Time Setup
On first run, the command will:
1. Check Node.js version (requires 18+)
2. Install Docusaurus packages (~30 seconds)
3. Generate `docusaurus.config.js`
4. Create sidebar from folder structure
5. Start development server
6. Open browser automatically

### Subsequent Runs
On subsequent runs, the command will:
1. Check if Docusaurus is installed (instant)
2. Regenerate sidebar (in case docs changed)
3. Start server (~2 seconds)
4. Open browser

### Directory Structure
```
.specweave/
├── docs/
│   └── internal/              ← Source documentation
│       ├── strategy/
│       ├── specs/
│       ├── architecture/
│       ├── delivery/
│       ├── operations/
│       └── governance/
└── docs-site-internal/        ← Docusaurus installation (generated)
    ├── docs/                  ← Symlinked to internal/
    ├── src/
    ├── docusaurus.config.js
    ├── sidebars.js
    └── package.json
```

### What Gets Auto-Generated
1. **Sidebar** (`sidebars.js`):
   - Recursively scans `.specweave/docs/internal/`
   - Creates categories from folders
   - Sorts by priority (strategy first, governance last)
   - Formats labels (kebab-case → Title Case)

2. **Configuration** (`docusaurus.config.js`):
   - Site title from project name
   - Theme settings from config
   - Mermaid diagram support
   - Hot reload enabled

3. **Landing Page** (`src/pages/index.js`):
   - Welcome message
   - Quick navigation links
   - Project information

### Hot Reload
Changes to markdown files in `.specweave/docs/internal/` are detected automatically:
- Edit file → Save → Browser refreshes instantly
- No need to restart server
- Works for all markdown files

### Stopping the Server
- Press `Ctrl+C` in terminal
- Or close the terminal window
- Or kill the process: `pkill -f docusaurus`

## Expected Output

**First Run:**
```
📚 Launching Documentation Preview...

ℹ️  First-time setup required
   • Installing Docusaurus (~30 seconds)
   • Generating configuration
   • Creating sidebar from folder structure

📦 Installing Docusaurus packages...
[============================>] 100%

✓ Packages installed successfully
✓ Configuration generated
✓ Sidebar generated (42 documents, 8 categories)
✓ Server started on http://localhost:3016

✅ Documentation server started successfully!

🌐 URL: http://localhost:3016
🔄 Hot reload enabled - edit markdown files to see changes instantly
🗂️  Sidebar auto-generated from folder structure
📊 Mermaid diagrams supported

💡 Press Ctrl+C to stop the server
```

**Subsequent Runs:**
```
📚 Launching Documentation Preview...

✓ Docusaurus already installed
✓ Configuration up-to-date

✓ Sidebar generated (42 documents, 8 categories)
✓ Server started on http://localhost:3016

✅ Documentation server started successfully!

🌐 URL: http://localhost:3016
🔄 Hot reload enabled - edit markdown files to see changes instantly
🗂️  Sidebar auto-generated from folder structure
📊 Mermaid diagrams supported

💡 Press Ctrl+C to stop the server
```

## Troubleshooting

### Common Issues

**Port Already in Use:**
```
Error: Port 3016 is already in use
```
Solution:
1. Change port in `.specweave/config.json` → `documentation.preview.port`
2. Or stop the service: `lsof -i :3016` then `kill -9 <PID>`

**Node.js Version:**
```
Error: Node.js 18+ required (current: v16.x.x)
```
Solution:
1. Update Node.js: `nvm install 20` (or download from nodejs.org)
2. Verify: `node --version`

**Missing Documentation:**
```
Error: No documentation found in .specweave/docs/internal/
```
Solution:
1. Check folder exists: `ls .specweave/docs/internal/`
2. Add at least one markdown file
3. Or run `/specweave:increment` to create documentation

## Integration with SpecWeave Workflow

### After Creating Increment
```bash
/specweave:increment "User Authentication"
# → Creates spec.md, plan.md, tasks.md

/specweave-docs-preview:preview
# → Preview shows new spec in sidebar
```

### After Completing Increment
```bash
/specweave:done 0008
# → Syncs spec.md to .specweave/docs/internal/specs/spec-0008-user-auth.md

# Hot reload automatically shows the new spec!
# No need to restart preview server
```

### Viewing Architecture Decisions
```bash
# Create ADR
vim .specweave/docs/internal/architecture/adr/0001-database-choice.md

# Hot reload shows it instantly
# Navigate to Architecture → ADR → Database Choice
```

## Best Practices

1. **Keep Server Running**: Start once, leave running during development
2. **Edit in IDE**: Changes reflect instantly (hot reload)
3. **Organize Folders**: Good folder structure = good sidebar
4. **Use Frontmatter**: Add title, position to control order
5. **Test Search**: Built-in search works after indexing

## See Also

- `/specweave-docs-preview:build` - Build static site for deployment
- `specweave-docs` plugin - General documentation skills
- Docusaurus docs: https://docusaurus.io
